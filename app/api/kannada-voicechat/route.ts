import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { cleanTextForVoice, splitBilingualText } from "../../../utils/textProcessing";

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

// --- 🔊 Google TTS Helper for Kannada and English ---
async function synthesizeSpeech(text: string, language: string = "en-GB"): Promise<Uint8Array> {
  try {
    console.log('Starting TTS synthesis with language:', language);
    console.log('Text to synthesize:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
    
         // Voice mapping for different languages
     const voiceMap: Record<string, { languageCode: string; name: string }> = {
       "en-GB": { languageCode: "en-GB", name: "en-GB-Standard-A" },
       "en-US": { languageCode: "en-US", name: "en-US-Standard-C" },
       "en-IN": { languageCode: "en-IN", name: "en-IN-Standard-A" },
       "kn-IN": { languageCode: "kn-IN", name: "kn-IN-Standard-A" }, // Kannada voice
       // Enhanced English voices for pronunciation learning
       "en-US-clear": { languageCode: "en-US", name: "en-US-Standard-A" }, // Clear American accent
       "en-GB-clear": { languageCode: "en-GB", name: "en-GB-Standard-B" }, // Clear British accent
     };

    const voiceConfig = voiceMap[language] || voiceMap["en-GB"];
    console.log('Selected voice config:', voiceConfig);

    const res = await fetch(`${GOOGLE_TTS_ENDPOINT}?key=${GOOGLE_TTS_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
             body: JSON.stringify({
         input: { text },
         voice: { languageCode: voiceConfig.languageCode, name: voiceConfig.name },
         audioConfig: { 
           audioEncoding: "MP3", 
           speakingRate: language.includes("en-US-clear") ? 0.9 : 1.0, // Slightly slower for pronunciation learning
           pitch: language.includes("en-US-clear") ? 0.0 : 0.0, // Natural pitch
           effectsProfileId: language.includes("en-US-clear") ? ["headphone-class-device"] : [] // Better audio quality for learning
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
    message: "Kannada voice chat API status"
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
    const { messages, scenario, userProfile, userLanguage = "kannada" } = body;

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
       name: "kannada-english-conversation",
       mode: "conversation",
       specialization: "bilingual",
       prompt: ""
     };

    const currentScenario = scenario || defaultScenario;

         // Enhanced dual voice assistant system for English learning with grammar correction
     const systemPrompt = `You are a dual voice assistant system designed to help Kannada speakers learn English effectively.

IMPORTANT INSTRUCTIONS:
1. **Language Detection**: Detect the language of the user's message (Kannada or English)
2. **Grammar Correction**: When the user speaks in English, identify any grammar mistakes and provide gentle corrections. Format your response as:
   - First, acknowledge their message naturally
   - Then, if there are grammar errors, say "By the way, the correct way to say that would be: [corrected version]"
   - Keep corrections brief and encouraging

3. **Response Format**: ALWAYS respond in BOTH languages with clear separation:
   - First in Kannada (for comfort and understanding)
   - Then in English (for learning and practice)
4. **Format**: Use this exact format for every response:
   ಕನ್ನಡ: [Your response in Kannada - for understanding and comfort]
   English: [Your response in English - for learning and pronunciation practice]

5. **Voice Optimization**: 
   - Remove unnecessary punctuation marks (quotes, asterisks, etc.) from your responses
   - Use natural speech patterns
   - Avoid reading punctuation aloud
   - Keep responses conversational and flowing

6. **Teaching Approach**:
   - Be encouraging and patient
   - Provide gentle corrections when needed
   - Help with pronunciation, grammar, and vocabulary
   - Give English equivalents for Kannada words
   - Make learning fun and engaging
   - Focus on practical, everyday English
   - Speak clearly and naturally in English for pronunciation learning

7. **Voice Response**: 
   - Keep responses concise (2-3 sentences per language) for better voice synthesis
   - English voice will speak only in English for pronunciation practice
   - Kannada voice will speak in Kannada for understanding

User Profile:
- Background: ${userProfile?.background || 'Kannada speaker learning English'}
- Level: ${userProfile?.proficiency || 'beginner'}
- Goals: ${userProfile?.goals || 'improve English communication'}
- Preferred Language: ${userLanguage}

Current scenario: ${currentScenario?.name || 'english learning'}

Remember: You have two voices - Kannada voice for understanding and English voice for pronunciation learning. The English voice should speak naturally and clearly to help users learn proper English pronunciation. Provide gentle grammar corrections when needed.`;

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
        maxTokens: 300, // Reduced for more focused responses
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

             // Step 2: Convert text to speech - handle both response formats
       let audioBytes: Uint8Array;
       
       if (cleanedText.includes("ಕನ್ನಡ:") && cleanedText.includes("English:")) {
         // Bilingual response format (when user speaks English)
         const { kannada: kannadaText, english: englishText } = splitBilingualText(cleanedText);
         
         console.log("Bilingual response detected");
         console.log("Kannada text:", kannadaText);
         console.log("English text:", englishText);
         
         // Synthesize Kannada first, then English with separate voices
         if (kannadaText && englishText) {
           console.log("Synthesizing Kannada with kn-IN-Standard-A voice...");
           const kannadaAudio = await synthesizeSpeech(kannadaText, "kn-IN");
           console.log("Kannada audio length:", kannadaAudio.length);
           
           console.log("Synthesizing English with en-US-Standard-A voice for pronunciation learning...");
           const englishAudio = await synthesizeSpeech(englishText, "en-US-clear");
           console.log("English audio length:", englishAudio.length);
           
           // Combine the audio - simple concatenation
           const combinedAudio = new Uint8Array(kannadaAudio.length + englishAudio.length);
           combinedAudio.set(kannadaAudio, 0);
           combinedAudio.set(englishAudio, kannadaAudio.length);
           audioBytes = combinedAudio;
           
           console.log("Combined audio length:", combinedAudio.length);
           console.log("Combined audio: Kannada + English");
         } else if (kannadaText) {
           // Only Kannada text available
           console.log("Synthesizing Kannada only with kn-IN-Standard-A voice...");
           audioBytes = await synthesizeSpeech(kannadaText, "kn-IN");
         } else {
           // Only English text available
           console.log("Synthesizing English only with en-US-Standard-A voice for pronunciation learning...");
           audioBytes = await synthesizeSpeech(englishText || cleanedText, "en-US-clear");
         }
       } else {
         // Pure Kannada response (when user speaks Kannada)
         console.log("Pure Kannada response detected");
         console.log("Kannada text:", cleanedText);
         console.log("Synthesizing Kannada with kn-IN-Standard-A voice...");
         audioBytes = await synthesizeSpeech(cleanedText, "kn-IN");
       }

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
            audioLength: audioBase64.length,
            userLanguage: userLanguage
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
       const fallbackText = "ಕನ್ನಡ: ನಾನು ಈಗ ತಾಂತ್ರಿಕ ತೊಂದರೆಗಳನ್ನು ಎದುರಿಸುತ್ತಿದ್ದೇನೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.\nEnglish: I'm having technical difficulties right now. Please try again.";
      
      try {
                 console.log("Using fallback response with separate voices...");
         // Split fallback text and synthesize with separate voices
         const kannadaFallback = "ನಾನು ಈಗ ತಾಂತ್ರಿಕ ತೊಂದರೆಗಳನ್ನು ಎದುರಿಸುತ್ತಿದ್ದೇನೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.";
         const englishFallback = "I'm having technical difficulties right now. Please try again.";
         
         const kannadaAudio = await synthesizeSpeech(kannadaFallback, "kn-IN");
         console.log("Fallback Kannada audio length:", kannadaAudio.length);
         
         const englishAudio = await synthesizeSpeech(englishFallback, "en-US-clear");
         console.log("Fallback English audio length:", englishAudio.length);
         
         // Combine the audio - simple concatenation
         const combinedAudio = new Uint8Array(kannadaAudio.length + englishAudio.length);
         combinedAudio.set(kannadaAudio, 0);
         combinedAudio.set(englishAudio, kannadaAudio.length);
         console.log("Fallback combined audio length:", combinedAudio.length);
         
         const audioBytes = combinedAudio;
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

 // Scenario-specific tips for English learning
 function getScenarioTips(scenario: any): string[] {
   const tips: Record<string, string[]> = {
     "kannada-conversation": [
       "ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ, ಇಂಗ್ಲಿಷ್ ಕಲಿಯಿರಿ",
       "Speak in Kannada, learn English",
       "Practice both languages daily"
     ],
     "kannada-pronunciation": [
       "ಕನ್ನಡ ಧ್ವನಿಗಳನ್ನು ಇಂಗ್ಲಿಷ್ ಧ್ವನಿಗಳೊಂದಿಗೆ ಹೋಲಿಸಿ",
       "Compare Kannada sounds with English sounds",
       "Focus on difficult sounds like 'th' and 'v'"
     ],
     "kannada-grammar": [
       "ಕನ್ನಡ ವ್ಯಾಕರಣವನ್ನು ಇಂಗ್ಲಿಷ್ ವ್ಯಾಕರಣದೊಂದಿಗೆ ಹೋಲಿಸಿ",
       "Compare Kannada grammar with English grammar",
       "Practice sentence structure differences"
     ],
     "kannada-vocabulary": [
       "ದೈನಂದಿನ ಪದಗಳನ್ನು ಎರಡೂ ಭಾಷೆಗಳಲ್ಲಿ ಕಲಿಯಿರಿ",
       "Learn everyday words in both languages",
       "Build vocabulary through context"
     ]
   };

   return tips[scenario?.name] || [
     "ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ, ಇಂಗ್ಲಿಷ್ ಕಲಿಯಿರಿ",
     "Speak in Kannada, learn English",
     "Practice both languages daily"
   ];
 } 