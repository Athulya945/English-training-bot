import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { cleanTextForVoice } from "../../../utils/textProcessing";


export const maxDuration = 30;

const GOOGLE_TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";
const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;

// Validate API key
if (!GOOGLE_TTS_API_KEY) {
  console.error("GOOGLE_TTS_API_KEY is not set");
}

// --- 🔊 Google TTS Helper for English Pronunciation Learning ---
async function synthesizeSpeech(text: string): Promise<Uint8Array> {
    try {
      console.log('Starting English TTS synthesis for pronunciation learning');
      console.log('Text to synthesize:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
      
      const res = await fetch(`${GOOGLE_TTS_ENDPOINT}?key=${GOOGLE_TTS_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: "en-US", name: "en-US-Standard-C" }, // Clear American accent
          audioConfig: { 
            audioEncoding: "MP3", 
            speakingRate: 0.85, // Slightly slower for pronunciation learning
            pitch: 0.0, // Natural pitch
            effectsProfileId: ["headphone-class-device"] // Better audio quality for learning
          },
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

export async function GET() {
    const status = {
        googleTTSKey: !!GOOGLE_TTS_API_KEY,
        message: "English pronunciation learning voice chat API status"
      };
      
      return new Response(JSON.stringify(status), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    export async function POST(req: Request) {
        try {
          // Check if API keys are configured
          if (!GOOGLE_TTS_API_KEY) {
            console.error("GOOGLE_TTS_API_KEY is not configured");
            return new Response(
              JSON.stringify({
                error: "Google TTS API key is not configured. Please set GOOGLE_TTS_API_KEY in your environment variables."
              }),
              {
                status: 500,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
      
          const body = await req.json();
          const { welcomeMessage } = body;
      
          if (!welcomeMessage || typeof welcomeMessage !== "string") {
            return new Response(
              JSON.stringify({ error: "Invalid or missing welcomeMessage" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
      
          // Generate speech audio
          const audioBytes = await synthesizeSpeech(welcomeMessage);
          const audioBase64 = Buffer.from(audioBytes).toString("base64");
      
          console.log("Welcome message audio synthesized successfully");
      
          // Return base64 audio
          return new Response(
            JSON.stringify({
              audio: audioBase64,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
      
        } catch (err) {
          console.error("Error generating welcome message audio:", err);
          return new Response(
            JSON.stringify({ error: "Failed to synthesize welcome message audio" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }
      