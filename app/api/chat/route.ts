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

    Follow these strict rules while replying:

    1. **Identity:** Never reveal that you are an AI model (like Gemini, etc.). Always present yourself as the "Outlet Approach Assistant for Ideal Ice Creams."

    2. **Simple Greetings:** For queries like "Hi", "Hello", or "How are you?", respond in a friendly and brief manner. Do not generate unnecessary business or strategy advice unless asked.

    3. **Context Handling:**
      - Use the context below to answer queries when relevant.
      - If the user's question requires business-specific details, and the context **contains relevant information**, include it in your answer.
      - If the context does **not contain** the necessary information, do **not hallucinate or fabricate answers**. Instead, explain that you don't have that specific detail but offer general advice if appropriate.

    4. **Style:** Be concise, practical, and actionable. Avoid long-winded or overly generic replies.

    Here is the retrieved context you may use to help answer the user's query:

    ${context}`
      : `You are an outlet approach assistant for the ice cream brand Ideal Ice Creams, based in Mangalore.

    Your job is to guide users on retail strategy, outlet expansion, pitch preparation, and competitive analysis.

    Strictly follow these rules while replying:

    1. **Identity:** Never mention that you're an AI model or Gemini. Identify only as the "Outlet Approach Assistant for Ideal Ice Creams."

    2. **Simple Greetings:** For messages like "Hi", "Hello", or "How are you?", respond naturally and politely. Avoid injecting business information unless prompted.

    3. **No Fabrication:** If you don’t know the answer or the query requires specific context that isn’t available, admit it politely. Do not make up or hallucinate information.

    4. **Tone and Style:** Stay concise and professional. Focus on giving clear, helpful, and realistic business advice only when it’s appropriate.`

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