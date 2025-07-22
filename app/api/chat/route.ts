import { google } from "@ai-sdk/google"
import { streamText } from "ai"
import { Pinecone } from "@pinecone-database/pinecone"

// ⏱ Streaming timeout
export const maxDuration = 30

// 🧠 Config
const GOOGLE_EMBEDDING_MODEL = "models/embedding-001"
const GEMINI_MODEL = "gemini-2.0-flash" // Updated model name
const INDEX_NAME = "ideal-embeddings"
const TOP_K = 5
const PINECONE_API_KEY = process.env.PINECONE_API_KEY!
const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!

// Validate environment variables
if (!PINECONE_API_KEY) {
  console.error("PINECONE_API_KEY is not set")
}
if (!GOOGLE_API_KEY) {
  console.error("GOOGLE_API_KEY is not set")
}

// Init clients
const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY })
const index = pinecone.Index(INDEX_NAME)

// --- Helper: Fetch embeddings from Google ---
async function getGoogleEmbedding(query: string): Promise<number[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: GOOGLE_EMBEDDING_MODEL,
          content: { parts: [{ text: query }] },
          taskType: "RETRIEVAL_QUERY",
        }),
      }
    )

    if (!res.ok) {
      const errorText = await res.text()
      console.error("Google API error response:", errorText)
      throw new Error(`Google API error: ${res.status} ${res.statusText} - ${errorText}`)
    }

    const data = await res.json()
    console.log("Google embedding response structure:", Object.keys(data))
    
    // Google API returns embedding in data.embedding.values
    const embedding = data.embedding?.values || []
    
    if (!Array.isArray(embedding) || embedding.length === 0) {
      console.error("Invalid embedding response:", data)
      throw new Error("Invalid embedding response from Google API")
    }
    
    console.log(`Successfully got embedding with ${embedding.length} dimensions`)
    return embedding
  } catch (error) {
    console.error("Error getting embedding:", error)
    throw error
  }
}

export async function POST(req: Request) {
  try {
    console.log("POST handler started")
    
    // Parse the request
    const body = await req.json()
    console.log("Request body keys:", Object.keys(body))
    
    const { messages } = body
    if (!messages || !Array.isArray(messages)) {
      console.error("Invalid messages format:", messages)
      return new Response(
        JSON.stringify({ error: "Invalid messages format" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const userMessage = messages[messages.length - 1]?.content || ""
    if (!userMessage) {
      console.error("No user message found in:", messages)
      return new Response(
        JSON.stringify({ error: "No user message found" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    console.log("Processing user message:", userMessage.substring(0, 100) + "...")

    let context = ""
    let useContext = false

    // Try to get embeddings and query Pinecone, but don't fail if it doesn't work
    try {
      console.log("Attempting to get embeddings...")
      // Step 1: Get embedding of the user message
      const queryEmbedding = await getGoogleEmbedding(userMessage)
      console.log(`Got embedding with ${queryEmbedding.length} dimensions`)

      console.log("Querying Pinecone...")
      // Step 2: Query Pinecone for relevant context
      const pineconeResults = await index.query({
        topK: TOP_K,
        vector: queryEmbedding,
        includeMetadata: true,
      })

      const matches = pineconeResults.matches || []
      console.log(`Found ${matches.length} Pinecone matches`)

      // Step 3: Build context from matched chunks
      const contextChunks = matches
        .map(match => match.metadata?.text)
        .filter((text): text is string => Boolean(text))
      
      if (contextChunks.length > 0) {
        context = contextChunks.join("\n\n")
        useContext = true
        console.log(`Using context with ${contextChunks.length} chunks`)
      }
    } catch (embeddingError) {
      console.warn("Failed to get embeddings or query Pinecone, falling back to general knowledge:", embeddingError)
      // Continue without context - this is fine
    }

    const systemPrompt = useContext
  ? `You are an outlet approach assistant for the ice cream brand Ideal Ice Creams, based in Mangalore.

    Your role is to help users with questions related to retail strategy, outlet expansion, and competitive positioning in the ice cream industry.

    Strictly follow these rules:

    1. **Identity:** Never mention that you are an AI, Gemini, or chatbot. Identify yourself only as the "Outlet Approach Assistant for Ideal Ice Creams."

    2. **Greetings:** For simple greetings like "Hi", "Hello", or "How are you?", respond politely and briefly. Do not bring up business topics unless asked.

    3. **Strategic Advice:**
      - You are expected to provide practical, general business advice on topics like dealer follow-up, retail growth, or outlet expansion — even if the context is missing.
      - Use the context if it contains **specific company-related information**.
      - If the question asks for **internal details** (e.g., sales numbers, exact locations, specific policies), and that info is not in the context, clearly say so — **but still offer general suggestions where possible.**

    4. **Tone and Style:** Be concise, professional, and actionable. Avoid fluff and overly generic answers.

    Here is the context you can use to assist the user:

    ${context}`
      : `You are an outlet approach assistant for the ice cream brand Ideal Ice Creams, based in Mangalore.

    Your job is to assist users with retail strategy, outlet expansion, dealer communication, and competition analysis.

    Please follow these instructions:

    1. **Identity:** Never disclose you are an AI. Always refer to yourself as the "Outlet Approach Assistant for Ideal Ice Creams."

    2. **Greetings:** For casual greetings like "Hi", reply in a warm and simple way. Avoid bringing in business unless asked.

    3. **Answering Questions:**
      - You may provide general business advice for strategy questions, even without specific context.
      - Use the context if it has relevant company-specific data.
      - If a user asks for internal data (like store count or pricing), and it's not in context, do not make it up — clearly say it's unavailable, but offer general insights if useful.

    4. **Style:** Always be clear, direct, and helpful. Avoid long or generic responses. Focus on being useful.`

    console.log("Generating response with Gemini...")

    // Check if Google API key is available
    if (!GOOGLE_API_KEY) {
      throw new Error("Google API key is not configured")
    }

    // Step 4: Call Gemini with or without retrieved context
    const result = await streamText({
      model: google(GEMINI_MODEL),
      messages,
      system: systemPrompt,
      temperature: 0.7,
      maxTokens: 1000,
    })

    console.log("Streaming response started successfully")
    return result.toDataStreamResponse()
    
  } catch (error) {
    console.error("Error in POST handler:", error)
    
    // Return detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error("Error details:", {
      message: errorMessage,
      stack: errorStack,
      env: {
        hasGoogleKey: !!GOOGLE_API_KEY,
        hasPineconeKey: !!PINECONE_API_KEY
      }
    })

    // Always return a proper streaming response, even for errors
    try {
      const fallbackResult = await streamText({
        model: google(GEMINI_MODEL),
        messages: [
          {
            role: "system",
            content: "You are an outlet approach assistant for Ideal Ice Creams. The system encountered an error but you should still try to help the user with their outlet-related questions based on general business knowledge."
          },
          {
            role: "user", 
            content: "I'm having technical difficulties, but please help me with outlet approach strategies for an ice cream business."
          }
        ],
        temperature: 0.7,
      })

      return fallbackResult.toDataStreamResponse()
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError)
      
      // Last resort: return a proper HTTP error response
      return new Response(
        JSON.stringify({ 
          error: "Service temporarily unavailable",
          details: errorMessage 
        }), 
        { 
          status: 500, 
          headers: { "Content-Type": "application/json" } 
        }
      )
    }
  }
}