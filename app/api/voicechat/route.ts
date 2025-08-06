import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { cleanTextForVoice } from "../../../utils/textProcessing";

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

// --- 🔊 Google TTS Helper ---
async function synthesizeSpeech(text: string, accent: string = "en-GB"): Promise<Uint8Array> {
  try {
    console.log('Starting TTS synthesis with accent:', accent);
    const voiceMap: Record<string, string> = {
      "en-GB": "en-GB-Standard-A",
      "en-US": "en-US-Standard-C",
      "en-IN": "en-IN-Standard-A"
    };

    const res = await fetch(`${GOOGLE_TTS_ENDPOINT}?key=${GOOGLE_TTS_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: accent, name: voiceMap[accent] },
        audioConfig: { audioEncoding: "MP3", speakingRate: 1.0 },
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
    message: "Voice chat API status"
  };
  
  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// --- 🔁 POST Handler ---
export async function POST(req: Request) {
  try {
    console.log("POST handler started");

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
      name: "general-conversation",
      mode: "conversation",
      specialization: "none",
      prompt: ""
    };

    const currentScenario = scenario || defaultScenario;

    // Enhanced system prompt with grammar correction
    const systemPrompt = `You are a helpful English language tutor. Respond naturally and conversationally to help the user practice English. Keep your responses concise (1-3 sentences) and encouraging.

IMPORTANT INSTRUCTIONS:
1. **Grammar Correction**: When the user speaks in English, identify any grammar mistakes and provide gentle corrections. Format your response as:
   - First, acknowledge their message naturally
   - Then, if there are grammar errors, say "By the way, the correct way to say that would be: [corrected version]"
   - Keep corrections brief and encouraging

2. **Voice Optimization**: 
   - Remove unnecessary punctuation marks (quotes, asterisks, etc.) from your responses
   - Use natural speech patterns
   - Avoid reading punctuation aloud
   - Keep responses conversational and flowing

3. **Teaching Approach**:
   - Be supportive and encouraging
   - Provide gentle corrections when needed
   - Ask follow-up questions to keep the conversation flowing
   - Focus on practical, everyday English

User Profile:
- Background: ${userProfile?.background || 'general learner'}
- Level: ${userProfile?.proficiency || 'intermediate'}
- Goals: ${userProfile?.goals || 'improve English communication'}

Current scenario: ${currentScenario?.name || 'general conversation'}

Remember: Speak naturally as if in a real conversation, not reading from a script.`;

    console.log("System prompt:", systemPrompt);

    // Step 1: Generate LLM response with better error handling
    try {
      console.log("Calling Gemini API...");
      
      const result = await streamText({
        model: google(GEMINI_MODEL),
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        maxTokens: 200, // Reduced for more focused responses
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

      // Clean the response for better voice synthesis using utility function
      let cleanedText = cleanTextForVoice(fullText);

      // Better validation of the response
      if (!cleanedText || cleanedText.trim() === '' || cleanedText.length < 5) {
        throw new Error("Empty or invalid response from AI model");
      }

      console.log("Cleaned LLM response for voice synthesis:", cleanedText);

      console.log("LLM text generated successfully, synthesizing speech...");

      // Step 2: Convert text to speech with accent preference
      const accent = userProfile?.accentPreference || 'en-GB';
      const audioBytes = await synthesizeSpeech(cleanedText, accent);
      const audioBase64 = Buffer.from(audioBytes).toString("base64");

      console.log("Audio synthesized successfully");

      // Step 3: Return both text and base64-encoded audio
      return new Response(
        JSON.stringify({
          text: cleanedText, // Use cleaned text for voice
          originalText: fullText, // Keep original for display
          audio: audioBase64,
          scenarioTips: getScenarioTips(currentScenario),
          debug: {
            modelUsed: GEMINI_MODEL,
            textLength: cleanedText.length,
            audioLength: audioBase64.length
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
      const fallbackText = "I'm having trouble connecting to my language processing system right now. Let's try a simple conversation - how was your day?";
      
      try {
        const accent = userProfile?.accentPreference || 'en-GB';
        const audioBytes = await synthesizeSpeech(fallbackText, accent);
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

// Scenario-specific instructions
function getScenarioInstructions(scenario: any): string {
  const scenarios: Record<string, string> = {
    // Engineering Graduates
    "technical-interview": `
      You are a tech hiring manager conducting a mock interview:
      - Focus on technical vocabulary and clarity
      - Include common interview questions for engineers
      - Evaluate problem explanation skills
      - Provide feedback on STAR method responses
    `,
    
    // ITI/Diploma Students
    "workshop-communication": `
      You are a senior technician in a workshop:
      - Use practical, hands-on vocabulary
      - Focus on safety instructions and tool terminology
      - Simulate supervisor-worker conversations
      - Include measurement and precision language
    `,
    
    // Working Professionals
    "client-presentation": `
      You are a potential client listening to a pitch:
      - Evaluate business vocabulary and professionalism
      - Focus on persuasive language and clarity
      - Include Q&A about project specifics
      - Provide feedback on executive presence
    `,
    
    // Business Communication
    "corporate-email": `
      You are a senior manager reviewing email drafts:
      - Focus on formal business writing conventions
      - Teach concise, professional email structures
      - Highlight tone adjustments for different recipients
      - Include common corporate phrases and idioms
    `,
    
    // Academic Researchers
    "paper-feedback": `
      You are a journal editor reviewing a paper:
      - Focus on academic writing conventions
      - Teach hedging language and citation phrases
      - Highlight clear data presentation techniques
      - Provide feedback on argument structure
    `,
    
    // General conversation
    "general-conversation": `
      You are an English tutor conducting a general lesson:
      - Assess the learner's current level
      - Focus on clear communication
      - Provide balanced feedback
      - Adapt to emerging needs
    `,
    
    // Default Scenario
    "default": `
      You are an English tutor conducting a general lesson:
      - Assess the learner's current level
      - Focus on clear communication
      - Provide balanced feedback
      - Adapt to emerging needs
    `
  };

  return scenarios[scenario?.name] || scenarios.default;
}

// Scenario-specific tips
function getScenarioTips(scenario: any): string[] {
  const tips: Record<string, string[]> = {
    "technical-interview": [
      "Practice explaining projects using the STAR method",
      "Prepare 2-3 questions to ask the interviewer",
      "Use technical terms precisely"
    ],
    "workshop-communication": [
      "Learn the names of all tools you use regularly",
      "Practice giving clear, concise instructions",
      "Master safety-related vocabulary"
    ],
    "client-presentation": [
      "Structure your pitch: Problem-Solution-Benefit",
      "Prepare for common objections",
      "Use transition phrases between topics"
    ],
    "corporate-email": [
      "Use clear subject lines",
      "Put the main request early",
      "Proofread for tone before sending"
    ],
    "paper-feedback": [
      "Use hedging language for claims",
      "Keep methodology descriptions reproducible",
      "Use signposting in your argument flow"
    ],
    "general-conversation": [
      "Listen carefully before responding",
      "Note down new vocabulary you encounter",
      "Don't be afraid to ask for clarification"
    ]
  };

  return tips[scenario?.name] || [
    "Listen carefully before responding",
    "Note down new vocabulary you encounter",
    "Don't be afraid to ask for clarification"
  ];
}