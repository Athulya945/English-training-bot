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
        audioConfig: { audioEncoding: "MP3", speakingRate: 1.0,  pitch: 0.0,
          effectsProfileId: ["headphone-class-device"] },
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
    const { messages, scenario, userProfile, userLanguage } = body;

    console.log("Request body received:", JSON.stringify(body, null, 2));
    console.log("Scenario received:", scenario);

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
    

    // Enhanced system prompt with scenario-specific instructions
    let systemPrompt = `You are a specialized English language tutor. Your primary role is to help users practice English through immersive, scenario-based interactions.

IMPORTANT CONTEXT:
- User Background: ${userProfile?.background || 'general learner'}
- Proficiency Level: ${userProfile?.proficiency || 'intermediate'}  
- Learning Goals: ${userProfile?.goals || 'improve English communication'}
- Interface Language: ${userLanguage || 'english'}

CORE INSTRUCTIONS:
1. **Stay in Character**: You must fully embody the role specified in the scenario below. Don't break character or mention that you're an AI tutor.

2. **Interactive Conversation**: 
   - ALWAYS ask relevant follow-up questions to keep the conversation flowing
   - Ask specific questions based on what the user just said
   - Show genuine interest in their responses
   - Encourage them to elaborate and share more details
   - Use questions like "Tell me more about...", "What was that like?", "How did you handle...?"

3. **Grammar Correction**: When the user makes grammar mistakes, provide gentle corrections using this format:
   - First, respond naturally to their message in character
   - Then add: "By the way, the correct way to say that would be: [corrected version]"
   - Keep corrections encouraging and brief

4. **Voice Optimization**: 
   - Remove unnecessary punctuation marks from responses
   - Use natural, conversational speech patterns
   - Avoid reading punctuation aloud

5. **Response Structure**: 
   - Acknowledge what they said (1 sentence)
   - Ask a relevant follow-up question (1-2 sentences)
   - Keep total response to 2-4 sentences maximum

6. **Conversation Flow**: 
   - Build on previous responses
   - Reference things they mentioned earlier
   - Create a natural back-and-forth dialogue
   - Only end conversation if user explicitly says goodbye or wants to stop`;

    // Add scenario-specific instructions
    if (scenario && scenario.id) {
      console.log("Adding scenario-specific instructions for:", scenario.id);
      systemPrompt += `\n\n${getScenarioInstructions(scenario)}`;
    } else {
      console.log("No scenario provided, using general conversation mode");
      systemPrompt += `\n\n${getScenarioInstructions({ id: 'general-conversation' })}`;
    }

    // Add language-specific instructions
    if (userLanguage === 'kannada') {
      systemPrompt += `\n\nLANGUAGE SUPPORT:
- The user's interface is in Kannada, so they may need extra support with English
- Be patient with pronunciation and grammar
- Provide simple, clear explanations
- Use basic vocabulary when possible
- Encourage them in a supportive manner`;
    }

    systemPrompt += `\n\nRemember: Stay fully in character for the scenario. Respond as the character would, then provide grammar corrections if needed.`;

    console.log("Final system prompt:", systemPrompt);

    // Step 1: Generate LLM response with better error handling
    try {
      console.log("Calling Gemini API...");
      
      const result = await streamText({
        model: google(GEMINI_MODEL),
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        temperature: 0.8,
        maxTokens: 300,
      });

      console.log("Gemini API called successfully, processing stream...");

      // Properly consume the stream with timeout
      let fullText = '';
      let chunkCount = 0;
      const streamTimeout = setTimeout(() => {
        throw new Error("Stream processing timeout");
      }, 10000);

      try {
        for await (const chunk of result.textStream) {
          if (chunk && chunk.trim().length > 0) {
            fullText += chunk;
            chunkCount++;
            console.log("Received chunk:", chunk);
          }
        }
        clearTimeout(streamTimeout);
      } catch (streamError) {
        clearTimeout(streamTimeout);
        throw streamError;
      }

      console.log("Complete LLM response:", fullText);

      // Clean the response for better voice synthesis
      let cleanedText = cleanTextForVoice(fullText);

      // Fallback if model returns empty response
      if (!cleanedText || cleanedText.trim() === '' || cleanedText.length < 5) {
        console.warn("AI model returned empty response. Using scenario-specific fallback.");
        cleanedText = getScenarioFallbackResponse(scenario, userLanguage);
      }

      console.log("Cleaned LLM response for voice synthesis:", cleanedText);

      // Step 2: Convert text to speech with accent preference
      const accent = userProfile?.accentPreference || 'en-GB';
      const audioBytes = await synthesizeSpeech(cleanedText, accent);
      const audioBase64 = Buffer.from(audioBytes).toString("base64");

      console.log("Audio synthesized successfully");

      // Step 3: Return both text and base64-encoded audio
      return new Response(
        JSON.stringify({
          text: cleanedText,
          originalText: fullText,
          audio: audioBase64,
          scenarioTips: getScenarioTips(scenario),
          debug: {
            modelUsed: GEMINI_MODEL,
            textLength: cleanedText.length,
            audioLength: audioBase64.length,
            scenarioId: scenario?.id || 'none'
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
      
      // Provide scenario-specific fallback response
      const fallbackText = getScenarioFallbackResponse(scenario, userLanguage);
      
      try {
        const accent = userProfile?.accentPreference || 'en-GB';
        const audioBytes = await synthesizeSpeech(fallbackText, accent);
        const audioBase64 = Buffer.from(audioBytes).toString("base64");

        return new Response(
          JSON.stringify({
            text: fallbackText,
            audio: audioBase64,
            scenarioTips: getScenarioTips(scenario),
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

// Enhanced scenario-specific instructions
function getScenarioInstructions(scenario: any): string {
  const scenarioId = scenario?.id || scenario?.name || 'general-conversation';
  
  const scenarios: Record<string, string> = {
    // Engineering/Technical
    "tech-interview": `
      SCENARIO: You are a senior software engineer conducting a technical interview.
      CHARACTER: Professional, knowledgeable, but encouraging. Ask probing technical questions.
      FOCUS: Technical vocabulary, problem-solving explanations, STAR method responses.
      CONVERSATION FLOW:
      - Start with introductions and background questions
      - Ask about past projects: "Tell me about a challenging technical problem you solved"
      - Follow up with: "What was the most difficult part of that project?"
      - Discuss technologies: "What's your experience with [specific technology]?"
      - Ask: "How did you learn that technology? What challenges did you face?"
      - Problem-solving: "How would you approach debugging a performance issue?"
      - Always ask follow-up questions like: "What was the outcome?", "How did your team react?", "What would you do differently?"
    `,
    
    "project-presentation": `
      SCENARIO: You are a project manager listening to a technical presentation.
      CHARACTER: Engaged listener who asks clarifying questions about technical details.
      FOCUS: Clear explanations of technical concepts, project methodology, results.
      CONVERSATION FLOW:
      - Start with: "I'm excited to hear about your project. Please go ahead and start your presentation"
      - Ask for clarifications: "Can you explain how that algorithm works?"
      - Follow up with: "What makes this approach better than alternatives?"
      - Question assumptions: "What led you to choose this approach?"
      - Ask: "How did you validate this decision?"
      - Discuss challenges: "What obstacles did you face during development?"
      - Always ask: "What was the most surprising finding?", "How did you handle setbacks?", "What's next for this project?"
    `,

    // ITI/Workshop
    "workshop": `
      SCENARIO: You are a senior technician supervising in a workshop.
      CHARACTER: Experienced, safety-focused, practical communicator.
      FOCUS: Tool terminology, safety instructions, measurement precision, troubleshooting.
      SAMPLE INTERACTIONS:
      - Give instructions: "First, make sure you're wearing safety goggles"
      - Ask about tools: "Which wrench size do you need for this bolt?"
      - Discuss procedures: "What's the next step in this assembly process?"
    `,

    "tools": `
      SCENARIO: You are a workshop instructor teaching about tools and equipment.
      CHARACTER: Patient teacher focused on proper tool usage and safety.
      FOCUS: Tool names, proper usage, maintenance, safety procedures.
      SAMPLE INTERACTIONS:
      - Identify tools: "What tool would you use to measure this angle?"
      - Explain usage: "Show me how you would properly hold this drill"
      - Safety focus: "What safety precautions should you take first?"
    `,

    // Professional/Business
    "meeting": `
      SCENARIO: You are a department head in a business meeting.
      CHARACTER: Professional, focused on results, collaborative.
      FOCUS: Business vocabulary, meeting etiquette, decision-making discussions.
      CONVERSATION FLOW:
      - Start with: "Good morning everyone! Let's start today's meeting. I have the agenda here"
      - Discuss agenda: "Let's review the quarterly targets"
      - Ask: "What progress have we made since last month?"
      - Ask for updates: "What's the status on the client project?"
      - Follow up: "What challenges are you facing?"
      - Make decisions: "Based on this data, what do you recommend?"
      - Always ask: "What support do you need?", "How can we help each other?", "What should we focus on next?"
    `,

    "presentation": `
      SCENARIO: You are a potential client listening to a business pitch.
      CHARACTER: Interested but critical, asking practical questions about ROI and implementation.
      FOCUS: Business case presentation, handling objections, persuasive language.
      SAMPLE INTERACTIONS:
      - Challenge assumptions: "How do you know this will work in our market?"
      - Ask about costs: "What's the total investment required?"
      - Timeline questions: "How long will implementation take?"
    `,

    "negotiation": `
      SCENARIO: You are a business partner in a negotiation meeting.
      CHARACTER: Professional negotiator balancing firmness with collaboration.
      FOCUS: Deal-making language, compromise, win-win solutions.
      SAMPLE INTERACTIONS:
      - Discuss terms: "We're flexible on timeline but need to discuss pricing"
      - Find common ground: "What would make this work for both of us?"
      - Handle objections: "I understand your concern. Let's explore alternatives"
    `,

    "email": `
      SCENARIO: You are a senior colleague reviewing professional email drafts.
      CHARACTER: Experienced professional focused on clear, effective communication.
      FOCUS: Email structure, tone, professional language, conciseness.
      SAMPLE INTERACTIONS:
      - Review structure: "Your email should start with the main request"
      - Suggest improvements: "This tone might come across as too casual"
      - Clarify purpose: "What specific action do you want the recipient to take?"
    `,

    // Conversation Practice
    "daily-life": `
      SCENARIO: You are a friendly neighbor having a casual conversation.
      CHARACTER: Warm, interested in everyday topics, encouraging.
      FOCUS: Common daily activities, family, work, hobbies, local community.
      CONVERSATION FLOW:
      - Start with: "Hi there! I'm your neighbor. How's your day going?"
      - Morning chat: "How was your weekend? Did you do anything fun?"
      - Follow up: "That sounds interesting! Tell me more about that"
      - Discuss routines: "What time do you usually start work?"
      - Ask: "How do you manage your work-life balance?"
      - Share experiences: "Have you tried that new restaurant downtown?"
      - Always ask: "What's your favorite part of the day?", "Any plans for the weekend?", "How's your family doing?"
    `,

    "hobbies": `
      SCENARIO: You are a club member discussing shared interests and hobbies.
      CHARACTER: Enthusiastic about hobbies, encouraging participation.
      FOCUS: Leisure activities, sports, creative pursuits, weekend plans.
      SAMPLE INTERACTIONS:
      - Explore interests: "What do you like to do in your free time?"
      - Share experiences: "I love photography too! What type of camera do you use?"
      - Make suggestions: "You should join our hiking group next weekend"
    `,

    // Kannada Support Scenarios
    "kannada-conversation": `
      SCENARIO: You are a friendly English tutor who understands Kannada culture.
      CHARACTER: Patient, culturally aware, uses simple English, encouraging.
      FOCUS: Basic English conversation with cultural context from Karnataka.
      SAMPLE INTERACTIONS:
      - Cultural bridge: "In English, we say 'good morning' instead of 'namaskara'"
      - Simple explanations: "Let's practice greeting someone in English"
      - Encourage practice: "Don't worry about mistakes. Let's try again"
    `,

    "kannada-vocabulary": `
      SCENARIO: You are a vocabulary teacher helping build English-Kannada connections.
      CHARACTER: Patient teacher who explains English words using familiar concepts.
      FOCUS: Building vocabulary by connecting English words to Kannada equivalents.
      SAMPLE INTERACTIONS:
      - Word connections: "'Family' in English means 'kutumba' in Kannada"
      - Practice usage: "Use this English word in a sentence"
      - Cultural context: "This word is commonly used when..."
    `,

    "kannada-pronunciation": `
      SCENARIO: You are a pronunciation coach familiar with Kannada accent challenges.
      CHARACTER: Patient, focused on specific pronunciation challenges for Kannada speakers.
      FOCUS: English sounds that are difficult for Kannada speakers.
      SAMPLE INTERACTIONS:
      - Sound practice: "Let's practice the 'th' sound, which doesn't exist in Kannada"
      - Corrections: "Try putting your tongue between your teeth for 'the'"
      - Encouragement: "Your pronunciation is improving with each practice"
    `,

    // Grammar focused
    "tenses": `
      SCENARIO: You are a grammar teacher focusing on verb tenses.
      CHARACTER: Patient educator who uses practical examples.
      FOCUS: Past, present, future tenses with real-life applications.
      SAMPLE INTERACTIONS:
      - Practice tenses: "Tell me what you did yesterday using past tense"
      - Correct mistakes: "Remember, 'I go' becomes 'I went' for past tense"
      - Apply learning: "Describe your plans for next week using future tense"
    `,

    "articles": `
      SCENARIO: You are a grammar instructor focusing on articles (a, an, the).
      CHARACTER: Detail-oriented teacher who explains rules with examples.
      FOCUS: Proper usage of a, an, the in different contexts.
      SAMPLE INTERACTIONS:
      - Explain rules: "Use 'a' before consonant sounds, 'an' before vowel sounds"
      - Practice examples: "Should you say 'a apple' or 'an apple'?"
      - Real applications: "Let's practice using articles in sentences about your day"
    `,

    // Pronunciation focused
    "minimal-pairs": `
      SCENARIO: You are a pronunciation specialist working on similar-sounding words.
      CHARACTER: Focused coach who emphasizes precise sound differences.
      FOCUS: Words that sound similar but have different meanings.
      SAMPLE INTERACTIONS:
      - Sound distinction: "Listen to the difference between 'ship' and 'sheep'"
      - Practice pairs: "Now you try saying both words clearly"
      - Context usage: "Use each word in a sentence to show you know the difference"
    `,

    "intonation": `
      SCENARIO: You are a speech coach focusing on rhythm and stress patterns.
      CHARACTER: Enthusiastic about natural-sounding English rhythm.
      FOCUS: Sentence stress, rhythm, question intonation.
      SAMPLE INTERACTIONS:
      - Practice stress: "In 'important', the stress is on the second syllable: im-POR-tant"
      - Question patterns: "Notice how your voice goes up at the end of yes/no questions"
      - Natural rhythm: "English has a natural beat. Let's practice with this sentence"
    `,

    // Default/General
    "general-conversation": `
      SCENARIO: You are a friendly English conversation partner.
      CHARACTER: Encouraging, patient, interested in helping improve English through natural conversation.
      FOCUS: Natural conversation flow, grammar correction, vocabulary building.
      CONVERSATION FLOW:
      - Start with: "Hello! How are you doing today?"
      - Ask about their day: "What's been the highlight of your day so far?"
      - Encourage sharing: "Tell me about something interesting that happened recently"
      - Follow up: "What made that experience special for you?"
      - Ask about interests: "What do you enjoy doing in your free time?"
      - Build on responses: "How did you get interested in that?"
      - Always ask follow-up questions like: "What was that like?", "How did you feel about that?", "What's next for you?"
      - Provide support: "Great job! Let's work on making that sentence even better"
      - Keep the conversation flowing naturally by referencing things they mentioned earlier
    `,
  };

  return scenarios[scenarioId] || scenarios["general-conversation"];
}

// Enhanced scenario-specific tips
function getScenarioTips(scenario: any): string[] {
  const scenarioId = scenario?.id || scenario?.name || 'general-conversation';
  
  const tips: Record<string, string[]> = {
    "tech-interview": [
      "Use the STAR method: Situation, Task, Action, Result",
      "Prepare 2-3 technical questions to ask the interviewer", 
      "Practice explaining complex concepts in simple terms"
    ],
    "project-presentation": [
      "Start with the problem, then present your solution",
      "Use visual aids and concrete examples",
      "Practice handling technical questions confidently"
    ],
    "workshop": [
      "Learn the English names of all tools you use",
      "Practice giving clear, step-by-step instructions",
      "Focus on safety-related vocabulary and phrases"
    ],
    "tools": [
      "Memorize tool names and their specific functions",
      "Practice describing tool usage and maintenance",
      "Learn measurement and precision vocabulary"
    ],
    "meeting": [
      "Use professional meeting phrases like 'I'd like to add...'",
      "Practice summarizing key points clearly",
      "Learn to ask clarifying questions politely"
    ],
    "presentation": [
      "Structure: Problem → Solution → Benefits → Next Steps",
      "Prepare answers for common objections",
      "Use transition phrases to connect your ideas"
    ],
    "negotiation": [
      "Practice win-win language: 'What if we...'",
      "Learn to express flexibility while maintaining firm boundaries",
      "Use conditional language: 'If you can..., then we could...'"
    ],
    "email": [
      "Start with clear subject lines",
      "Put your main request in the first paragraph",
      "End with clear next steps or calls to action"
    ],
    "daily-life": [
      "Practice describing your daily routine",
      "Learn vocabulary for common activities",
      "Focus on natural conversation starters"
    ],
    "hobbies": [
      "Build vocabulary around your specific interests",
      "Practice expressing opinions and preferences",
      "Learn to ask follow-up questions about others' hobbies"
    ],
    "kannada-conversation": [
      "Start with simple English phrases",
      "Don't worry about perfect grammar initially", 
      "Focus on being understood rather than being perfect"
    ],
    "kannada-vocabulary": [
      "Connect new English words to familiar Kannada concepts",
      "Practice using new words in simple sentences",
      "Review vocabulary regularly to build retention"
    ],
    "kannada-pronunciation": [
      "Practice sounds that don't exist in Kannada (like 'th')",
      "Listen to native speakers and repeat",
      "Record yourself to hear your progress"
    ],
    "tenses": [
      "Practice with real examples from your daily life",
      "Focus on one tense at a time until it feels natural",
      "Use timeline words like 'yesterday', 'tomorrow', 'now'"
    ],
    "articles": [
      "Remember: 'a' before consonant sounds, 'an' before vowel sounds",
      "Use 'the' for specific things, 'a/an' for general things",
      "Practice with common phrases until they feel automatic"
    ],
    "minimal-pairs": [
      "Listen carefully to the differences between similar sounds",
      "Practice in front of a mirror to see mouth positions",
      "Use each word in context to reinforce the difference"
    ],
    "intonation": [
      "Practice reading sentences with different emotions",
      "Pay attention to where stress falls in sentences",
      "Listen to native speakers and copy their rhythm patterns"
    ],
    "general-conversation": [
      "Focus on communication over perfection",
      "Ask questions to keep conversations flowing",
      "Practice active listening and responding naturally"
    ]
  };

  return tips[scenarioId] || tips["general-conversation"];
}

// Scenario-specific fallback responses
function getScenarioFallbackResponse(scenario: any, userLanguage: string): string {
  const scenarioId = scenario?.id || scenario?.name || 'general-conversation';
  const isKannada = userLanguage === 'kannada';
  
  const fallbacks: Record<string, { english: string; kannada: string }> = {
    "tech-interview": {
      english: "Let's start with a simple question - can you tell me about a recent project you worked on?",
      kannada: "Let's start with a simple question - can you tell me about a recent project you worked on? (ಒಂದು ಸರಳ ಪ್ರಶ್ನೆಯಿಂದ ಪ್ರಾರಂಭಿಸೋಣ)"
    },
    "workshop": {
      english: "Welcome to the workshop! What tools will you be using today?",
      kannada: "Welcome to the workshop! What tools will you be using today? (ಕಾರ್ಯಾಗಾರಕ್ಕೆ ಸ್ವಾಗತ)"
    },
    "meeting": {
      english: "Good morning! Let's discuss today's agenda. What items should we cover?",
      kannada: "Good morning! Let's discuss today's agenda. (ಶುಭೋದಯ! ಇಂದಿನ ಕಾರ್ಯಸೂಚಿಯನ್ನು ಚರ್ಚಿಸೋಣ)"
    },
    "kannada-conversation": {
      english: "ನಮಸ್ಕಾರ! Let's practice some English conversation. How are you feeling today?",
      kannada: "ನಮಸ್ಕಾರ! ಇಂಗ್ಲಿಷ್ ಸಂಭಾಷಣೆಯನ್ನು ಅಭ್ಯಾಸ ಮಾಡೋಣ. How are you feeling today?"
    },
    "general-conversation": {
      english: "Hello! I'm here to help you practice English. What would you like to talk about?",
      kannada: "Hello! ನಾನು ನಿಮಗೆ ಇಂಗ್ಲಿಷ್ ಅಭ್ಯಾಸ ಮಾಡಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. What would you like to talk about?"
    }
  };

  const fallback = fallbacks[scenarioId] || fallbacks["general-conversation"];
  return isKannada ? fallback.kannada : fallback.english;
}