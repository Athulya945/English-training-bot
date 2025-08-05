import { google } from "@ai-sdk/google";
import { streamText } from "ai";

// ⏱ Streaming timeout
export const maxDuration = 30;

// 🧠 Config
const GEMINI_MODEL = "gemini-2.0-flash-exp";
const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;
const GOOGLE_TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";
const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;

// Validate API key
if (!GOOGLE_API_KEY) {
  console.error("GOOGLE_API_KEY is not set");
}
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
        voice: { languageCode: "en-US", name: "en-US-Standard-A" }, // Clear American accent
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

// --- 🔁 GET Handler for testing ---
export async function GET() {
  const status = {
    googleAIKey: !!GOOGLE_API_KEY,
    googleTTSKey: !!GOOGLE_TTS_API_KEY,
    message: "English pronunciation learning voice chat API status"
  };
  
  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// --- 🔁 POST Handler ---
export async function POST(req: Request) {
  try {
    console.log("English voice chat POST handler started");

    // Check if API keys are configured
    if (!GOOGLE_API_KEY) {
      console.error("GOOGLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ 
          error: "Google AI API key is not configured. Please set GOOGLE_GENERATIVE_AI_API_KEY in your environment variables." 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!GOOGLE_TTS_API_KEY) {
      console.error("GOOGLE_TTS_API_KEY is not configured");
      return new Response(
        JSON.stringify({ 
          error: "Google TTS API key is not configured. Please set GOOGLE_TTS_API_KEY in your environment variables." 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const { messages, scenario, userProfile } = body;

    console.log("Request body received:", JSON.stringify(body, null, 2));

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

    console.log("User message:", userMessage);

    // Make scenario optional - provide default if not present
    const defaultScenario = {
      name: "english-pronunciation-practice",
      mode: "pronunciation",
      specialization: "english-learning",
      prompt: ""
    };

    const currentScenario = scenario || defaultScenario;

    // English pronunciation learning assistant
    const systemPrompt = `You are an English pronunciation learning assistant designed to help learners improve their English speaking skills.

IMPORTANT INSTRUCTIONS:
1. **Language Detection**: Detect the language of the user's message (Kannada or English)
2. **Response Format**: ALWAYS respond in ENGLISH ONLY for pronunciation practice:
   - Speak clearly and naturally
   - Use proper pronunciation and intonation
   - Keep responses concise (2-3 sentences) for better learning
   - Focus on common words and phrases

3. **Teaching Approach**:
   - Be encouraging and patient
   - Provide gentle corrections when needed
   - Help with pronunciation, grammar, and vocabulary
   - Make learning fun and engaging
   - Focus on practical, everyday English
   - Speak at a moderate pace for learning

4. **Pronunciation Focus**:
   - Emphasize difficult sounds (th, v, r, etc.)
   - Use natural intonation patterns
   - Provide clear examples
   - Encourage repetition and practice

User Profile:
- Background: ${userProfile?.background || 'English learner'}
- Level: ${userProfile?.proficiency || 'beginner'}
- Goals: ${userProfile?.goals || 'improve English pronunciation'}
- Current scenario: ${currentScenario?.name || 'pronunciation practice'}

Remember: You are speaking in clear, natural English to help users learn proper pronunciation. Speak slowly and clearly for learning purposes.`;

    console.log("System prompt:", systemPrompt);

    // Step 1: Generate LLM response
    try {
      console.log("Calling Gemini API...");
      
      const result = await streamText({
        model: google(GEMINI_MODEL),
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        maxTokens: 200, // Shorter responses for pronunciation practice
      });

      console.log("Gemini API called successfully, processing stream...");

      // Properly consume the stream with timeout
      let fullText = '';
      const streamTimeout = setTimeout(() => {
        throw new Error("Stream processing timeout");
      }, 10000); // 10 second timeout

      try {
        for await (const chunk of result.textStream) {
          fullText += chunk;
          console.log("Received chunk:", chunk);
        }
        clearTimeout(streamTimeout);
      } catch (streamError) {
        clearTimeout(streamTimeout);
        throw streamError;
      }

      console.log("Complete LLM response:", fullText);

      // Better validation of the response
      if (!fullText || fullText.trim() === '' || fullText.length < 5) {
        throw new Error("Empty or invalid response from AI model");
      }

      console.log("LLM text generated successfully, synthesizing speech...");

      // Step 2: Convert text to speech with clear American accent
      console.log("Synthesizing English with en-US-Standard-A voice for pronunciation learning...");
      const audioBytes = await synthesizeSpeech(fullText);
      console.log("English audio length:", audioBytes.length);

      const audioBase64 = Buffer.from(audioBytes).toString("base64");

      console.log("Audio synthesized successfully");

      // Step 3: Return both text and base64-encoded audio
      return new Response(
        JSON.stringify({
          text: fullText,
          audio: audioBase64,
          scenarioTips: getScenarioTips(currentScenario),
          debug: {
            modelUsed: GEMINI_MODEL,
            textLength: fullText.length,
            audioLength: audioBase64.length,
            voiceUsed: "en-US-Standard-A"
          }
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

    } catch (aiError) {
      console.error("AI model error details:", aiError);
      
      // More specific error handling
      if (aiError instanceof Error) {
        if (aiError.message.includes('API key')) {
          throw new Error("Invalid or expired Google AI API key");
        } else if (aiError.message.includes('quota')) {
          throw new Error("API quota exceeded - please try again later");
        } else if (aiError.message.includes('timeout')) {
          throw new Error("AI model response timeout - please try again");
        }
      }
      
      // Provide a fallback response when AI fails
      const fallbackText = "I'm having technical difficulties right now. Please try again.";
      
      try {
        console.log("Using fallback response with clear English voice...");
        const audioBytes = await synthesizeSpeech(fallbackText);
        const audioBase64 = Buffer.from(audioBytes).toString("base64");

        return new Response(
          JSON.stringify({
            text: fallbackText,
            audio: audioBase64,
            scenarioTips: getScenarioTips(currentScenario),
            error: "AI model unavailable - using fallback response"
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      } catch (ttsError) {
        console.error("TTS fallback error:", ttsError);
        throw new Error("Both AI model and text-to-speech services are unavailable");
      }
    }
  } catch (error) {
    console.error("POST handler error:", error);

    // Provide more specific error messages
    let errorMessage = "Service temporarily unavailable";
    let errorDetails = "Unknown error";

    if (error instanceof Error) {
      errorDetails = error.message;
      
      if (error.message.includes("API key")) {
        errorMessage = "API configuration error";
      } else if (error.message.includes("TTS")) {
        errorMessage = "Text-to-speech service error";
      } else if (error.message.includes("quota")) {
        errorMessage = "API quota exceeded";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timeout";
      }
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorDetails,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Scenario-specific tips for English pronunciation learning
function getScenarioTips(scenario: any): string[] {
  const tips: Record<string, string[]> = {
    "english-pronunciation-practice": [
      "Listen carefully to the English pronunciation",
      "Practice repeating the words and phrases",
      "Focus on difficult sounds like 'th' and 'v'"
    ],
    "english-conversation": [
      "Practice speaking in English naturally",
      "Listen to the rhythm and intonation",
      "Try to mimic the pronunciation"
    ],
    "english-grammar": [
      "Pay attention to sentence structure",
      "Practice the correct word order",
      "Listen to natural speech patterns"
    ]
  };

  return tips[scenario?.name] || [
    "Listen carefully to the English pronunciation",
    "Practice repeating the words and phrases",
    "Focus on difficult sounds like 'th' and 'v'"
  ];
} 