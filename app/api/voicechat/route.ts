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
    const { messages , scenario} = body;

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

    const baseSystemPrompt = `
        You are an outlet training assistant for the ice cream brand Ideal Ice Creams, based in Mangalore.

        General Behavior Rules:
        1. Never disclose that you are an AI or mention models like Gemini.
        2. Always identify as the "Outlet Training Assistant for Ideal Ice Creams."
        3. Be brief, realistic, and helpful in voice-based replies.
        4. Respond to greetings casually, without mentioning roles..
        5. If the user says "repeat", restate the last message clearly.
        6. Stick to the user’s current training mode.
        7. Speak briefly, naturally, and clearly in a way suitable for voice playback.
        8. If the user says "repeat", restate your last message in a simpler, clearer way.
        9. Always stay in the active training mode.

        Supported Modes:
        - **sales**: Act as customer/store-owner; give realistic responses and short feedback.
        - **game**: Narrate a gamified training experience; give energetic feedback and simulate decisions.
        `;

        const scenarioPrompt = scenario?.prompt?.trim();
        const mode = scenario?.mode?.trim();
        const systemPrompt = scenarioPrompt
        ? `${baseSystemPrompt}\n\n---\n\nScenario Instructions:\n${scenarioPrompt}\n\n---\n\nMode: ${mode}`
        : baseSystemPrompt;

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
