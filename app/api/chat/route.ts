import { google } from "@ai-sdk/google"
import { streamText } from "ai"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: google("gemini-2.0-flash"),
    messages,
    system: `You are an outlet approach assistant for the ice cream chain Ideal Ice Creams (Mangalore-based). 
    Help users with strategies for approaching retail outlets, understanding competitive advantages, analyzing competitor offerings, 
    and providing guidance for successful store visits and pitches. Provide practical, actionable advice to expand the distribution network of Ideal Ice Creams.`,
  })

  return result.toDataStreamResponse()
}
