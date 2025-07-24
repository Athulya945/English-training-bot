import { google } from "@ai-sdk/google";
import { streamText } from "ai";

// ⏱ Streaming timeout
export const maxDuration = 30;

// 🧠 Config
const GEMINI_MODEL = "gemini-2.0-flash";
const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;
const GOOGLE_TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";
const GOOGLE_TTS_API_KEY =process.env.GOOGLE_TTS_API_KEY

// Validate API key
if (!GOOGLE_API_KEY) {
  console.error("GOOGLE_API_KEY is not set");
}
if(!GOOGLE_TTS_API_KEY){
  console.error("GOOGLE_TTS_API_KEY is not set");
}

// --- 🔊 Google TTS Helper ---
async function synthesizeSpeech(text: string): Promise<Uint8Array> {
  try {
    console.log('starting bot...')
    const res = await fetch(`${GOOGLE_TTS_ENDPOINT}?key=${GOOGLE_TTS_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "en-GB", name: "en-GB-Standard-A" },
        audioConfig: { audioEncoding: "MP3" },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`TTS API error: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();
    const audioContent = data.audioContent;

    if (!audioContent) {
      throw new Error("No audio content returned from Google TTS");
    }

    return Uint8Array.from(Buffer.from(audioContent, "base64"));
  } catch (err) {
    console.error("TTS synthesis failed:", err);
    throw err;
  }
}

// --- 🔁 POST Handler ---
export async function POST(req: Request) {
  try {
    console.log("POST handler started");

    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userMessage = messages[messages.length - 1]?.content || "";
    if (!userMessage) {
      return new Response(JSON.stringify({ error: "No user message found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const baseSystemPrompt = ` You are a voice-based training assistant for the ice cream brand Ideal Ice Creams, based in Mangalore.

        General Behavior Rules:
        1. Never disclose that you are an AI or mention models like Gemini.
        2. Respond to greetings casually, without mentioning roles.
        3. Be brief, realistic, and helpful in voice-based replies.
        4. Role play the character described in Scenario and respond accordingly. Don't break character — never say things like "I will act as..." or mention being part of a training or simulation. You are not an assistant; you are the actual person described in the scenario.
        5. Stick to the user’s current scenario mode(sales or game).
        6. Speak briefly, naturally, and clearly in a way suitable for voice playback.
        7. If the user says "repeat", restate your last message in a simpler, clearer way.
        8. Always stay in the active training mode.

        Act according to these instructions:`
    
    const instructionsPrompt=`You are the Distributor Onboarding Manager for Ideal Ice Creams, a local premium ice cream brand based in Mangalore.

    Your role is to interview and evaluate potential distributors in a conversational, realistic, and professional manner—just like a human hiring manager would.

    Ask questions one at a time and guide the conversation naturally. Do not rush or overload with questions. Use polite, clear language throughout.

    Interview Objectives

    Background Verification

    Ask for their full name, business experience, current business (if any), and work history.

    Check if they’ve worked with other FMCG or food brands.

    Motivation and Interest

    Ask why they are interested in distributing Ideal Ice Creams.

    Explore how familiar they are with the brand and its products.

    Understand their long-term interest in partnering with the brand.

    Logistics and Coverage

    Ask about the area or region they plan to cover.

    Find out whether they already have retail connections.

    Ask how many outlets they believe they can realistically supply to.

    Financial Readiness

    Gently inquire about their current financial standing.

    Ask if they already own any deep freezers.

    Determine whether they are prepared to invest in cold chain equipment and stock.

    Understand how they plan to handle spoilage risk and stock rotation.

    Mental and Operational Preparedness

    Ask how many people are on their team or if they plan to hire supporting staff.

    Evaluate whether they are mentally prepared for seasonal demand fluctuations.

    Ask how they plan to promote Ideal Ice Creams in their territory.

    Final Evaluation
    Once the conversation is complete, internally assess the candidate as one of the following (do not say this out loud unless asked):

    Likely Fit

    Needs Further Discussion

    Not Ready Yet

    Conversation Closure
    After all areas have been covered:

    Politely thank the candidate for their time.

    Optionally say: “We’ll review your responses and get back to you shortly.”

    Do not continue the conversation after closing.

    Do not loop back or restart the interview.`

    const systemPrompt = baseSystemPrompt +"\n\n"+instructionsPrompt

    // Step 1: Generate LLM response
    const result = await streamText({
    model: google(GEMINI_MODEL),
    messages,
    system: systemPrompt,
    temperature: 0.7,
    maxTokens: 1000,
    });

    // Properly consume the stream
    let fullText = '';
    for await (const chunk of result.textStream) {
    fullText += chunk;
    }
    console.log("LLM text generated, synthesizing speech...");

    // Step 2: Convert text to speech
    const audioBytes = await synthesizeSpeech(fullText);
    const audioBase64 = Buffer.from(audioBytes).toString("base64");

    // Step 3: Return both text and base64-encoded audio
    return new Response(
      JSON.stringify({
        text: fullText,
        audio: audioBase64,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("POST handler error:", error);

    return new Response(
      JSON.stringify({
        error: "Service temporarily unavailable",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
