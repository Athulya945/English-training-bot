import { google } from "@ai-sdk/google"
import { streamText } from "ai"
import { Pinecone } from "@pinecone-database/pinecone"

// ⏱ Streaming timeout
export const maxDuration = 30

// 🧠 Config
const GOOGLE_EMBEDDING_MODEL = "models/embedding-001"
const GEMINI_MODEL = "gemini-2.0-flash"
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
    
    const { messages, userLanguage = "kannada" } = body
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

    // Bilingual system prompt for Kannada-English support
    const systemPrompt = useContext
      ? `You are a bilingual English training assistant that helps Kannada speakers learn English. You can understand and respond in both Kannada and English.

IMPORTANT INSTRUCTIONS:
1. **Language Detection**: Detect the language of the user's message (Kannada or English)
2. **Bilingual Response**: Always respond in BOTH languages:
   - First in Kannada (for comfort and understanding)
   - Then in English (for learning and practice)
3. **Format**: Use this format for every response:
   ಕನ್ನಡ: [Your response in Kannada]
   English: [Your response in English]

4. **Teaching Approach**:
   - Be encouraging and patient
   - Provide gentle corrections when needed
   - Use simple, clear language in both languages
   - Help with pronunciation, grammar, and vocabulary
   - Make learning fun and engaging

5. **Context Usage**: Use the provided context when relevant, but focus on being a helpful language tutor.

Here is the context you can use to assist the user:
${context}`
      : `You are a bilingual English training assistant that helps Kannada speakers learn English. You can understand and respond in both Kannada and English.

IMPORTANT INSTRUCTIONS:
1. **Language Detection**: Detect the language of the user's message (Kannada or English)
2. **Bilingual Response**: Always respond in BOTH languages:
   - First in Kannada (for comfort and understanding)
   - Then in English (for learning and practice)
3. **Format**: Use this format for every response:
   ಕನ್ನಡ: [Your response in Kannada]
   English: [Your response in English]

4. **Teaching Approach**:
   - Be encouraging and patient
   - Provide gentle corrections when needed
   - Use simple, clear language in both languages
   - Help with pronunciation, grammar, and vocabulary
   - Make learning fun and engaging

5. **Topics**: Help with:
   - Basic conversations
   - Grammar explanations
   - Vocabulary building
   - Pronunciation practice
   - Cultural exchange
   - Daily life situations

Remember: Your goal is to make English learning accessible and enjoyable for Kannada speakers while providing comfort in their native language.`

    console.log("Generating response with Gemini...")

    // Check if Google API key is available
    if (!GOOGLE_API_KEY) {
      throw new Error("Google API key is not configured")
    }

    // Step 4: Call Gemini with bilingual support
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
            content: "You are a bilingual English training assistant. Respond in both Kannada and English. Format: ಕನ್ನಡ: [Kannada response] English: [English response]"
          },
          {
            role: "user", 
            content: "I'm having technical difficulties, but please help me learn English."
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