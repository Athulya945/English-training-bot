import { google } from "@ai-sdk/google";
import { streamText } from "ai";

// ⏱ Streaming timeout
export const maxDuration = 30;

// 🧠 Config
const GEMINI_MODEL = "gemini-2.0-flash-exp";
const GOOGLE_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;

// Validate API key
if (!GOOGLE_API_KEY) {
  console.error("GOOGLE_API_KEY is not set");
}

// --- 🔁 GET Handler for testing ---
export async function GET() {
  const status = {
    googleAIKey: !!GOOGLE_API_KEY,
    message: "Feedback API status"
  };
  
  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// --- 🔁 POST Handler ---
export async function POST(req: Request) {
  try {
    console.log("Feedback POST handler started");

    // Check if API key is configured
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

    const body = await req.json();
    const { messages, scenario, userProfile, userLanguage = "english", analyzeIndividual = false } = body;

    console.log("Request body received:", JSON.stringify(body, null, 2));

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No conversation history found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Filter user messages for analysis
    const userMessages = messages.filter(msg => msg.role === "user").map(msg => msg.content);
    const assistantMessages = messages.filter(msg => msg.role === "assistant").map(msg => msg.content);
    
    if (userMessages.length === 0) {
      return new Response(JSON.stringify({ error: "No user messages found in conversation" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("Analyzing conversation with", userMessages.length, "user messages");

    let feedbackData;

    if (analyzeIndividual && userMessages.length > 0) {
      // Analyze the most recent message individually with context
      const latestMessage = userMessages[userMessages.length - 1];
      const previousMessages = userMessages.slice(-3, -1); // Get last 2 messages for context
      console.log("Analyzing individual message:", latestMessage);

      // Create individual message feedback prompt with conversation context
      const individualFeedbackPrompt = `You are an expert English language tutor providing detailed, constructive feedback on a single user message within a conversation context.

MESSAGE ANALYSIS REQUEST:
Analyze the following user message and provide detailed feedback in the exact JSON format specified below.

CONVERSATION CONTEXT:
- Scenario: ${scenario?.name || 'General conversation'}
- User Profile: ${userProfile?.background || 'English learner'}
- Proficiency Level: ${userProfile?.proficiency || 'intermediate'}
- Language: ${userLanguage}
- Previous Messages: ${previousMessages.length > 0 ? previousMessages.join(' | ') : 'None'}

CURRENT USER MESSAGE TO ANALYZE:
"${latestMessage}"

ANALYSIS REQUIREMENTS:
1. Consider the conversation flow and context
2. Analyze grammar accuracy, vocabulary usage, pronunciation patterns, and fluency
3. Analyze professionalism, tone, clarity, and empathy in their communication
4. Identify specific improvements and strengths
5. Provide actionable feedback for this specific message
6. Consider the user's proficiency level and learning goals

SCORING CRITERIA:
- Professionalism (1-10): Use of appropriate language, formality level, respect
- Tone (1-10): Friendliness, appropriateness, emotional intelligence
- Clarity (1-10): Clear expression of ideas, easy to understand
- Empathy (1-10): Understanding of others, emotional awareness, considerate responses
- Grammar (1-10): Grammatical accuracy, sentence structure, syntax
- Vocabulary (1-10): Word choice, range, appropriateness
- Fluency (1-10): Natural flow, coherence, ease of expression

FEEDBACK REQUIREMENTS:
Provide a comprehensive analysis in the following JSON format (use the exact structure):

{
  "overallScore": number (1-10),
  "professionalism": number (1-10),
  "tone": number (1-10),
  "clarity": number (1-10),
  "empathy": number (1-10),
  "strengths": [
    "List 2-3 specific strengths observed in this message"
  ],
  "areasForImprovement": [
    "List 2-3 specific areas that need improvement for this message"
  ],
  "grammarAnalysis": {
    "commonErrors": [
      "List specific grammar mistakes found in this message"
    ],
    "grammarScore": number (1-10)
  },
  "vocabularyAnalysis": {
    "vocabularyRange": "assessment of vocabulary usage in this message",
    "vocabularyScore": number (1-10),
    "suggestedWords": [
      "List 3-5 vocabulary words they could use instead"
    ]
  },
  "pronunciationTips": [
    "List 2-3 pronunciation improvement tips for this message"
  ],
  "fluencyAssessment": {
    "fluencyScore": number (1-10),
    "fluencyNotes": "assessment of speaking fluency for this message"
  },
  "recommendations": [
    "List 2-3 specific, actionable recommendations for this message"
  ],
  "nextSteps": [
    "List 2 immediate next steps they should take"
  ],
  "encouragement": "A motivating message acknowledging their effort in this message"
}

ANALYSIS GUIDELINES:
1. Be specific and provide examples from their message
2. Focus on actionable feedback for this specific message
3. Balance criticism with encouragement
4. Consider their proficiency level and conversation context
5. Provide practical suggestions
6. Acknowledge progress and effort
7. Be constructive and supportive
8. Score professionalism, tone, clarity, and empathy based on the message content
9. Give specific examples from their message
10. Provide concrete improvement suggestions
11. Consider the conversation flow and context

IMPORTANT: Return ONLY valid JSON. Do not include any additional text or explanations outside the JSON structure.`;

      try {
        // Generate feedback using AI with better error handling
        const result = await streamText({
          model: google(GEMINI_MODEL),
          messages: [
            { role: "system", content: individualFeedbackPrompt }
          ],
          temperature: 0.2, // Lower temperature for more consistent analysis
          maxTokens: 1200,
        });

        console.log("AI model called successfully, processing stream...");

        // Consume the stream with timeout
        let fullText = '';
        const streamTimeout = setTimeout(() => {
          throw new Error("Stream processing timeout");
        }, 20000); // 20 second timeout

        try {
          for await (const chunk of result.textStream) {
            fullText += chunk;
          }
          clearTimeout(streamTimeout);
        } catch (streamError) {
          clearTimeout(streamTimeout);
          throw streamError;
        }

        console.log("Complete AI response:", fullText);

        // Parse the JSON response
        try {
          feedbackData = JSON.parse(fullText);
        } catch (parseError) {
          console.error("Failed to parse feedback JSON:", parseError);
          console.error("Raw response:", fullText);
          
          // Try to extract JSON from the response if it's wrapped in other text
          const jsonMatch = fullText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              feedbackData = JSON.parse(jsonMatch[0]);
            } catch (secondParseError) {
              console.error("Failed to parse extracted JSON:", secondParseError);
              throw new Error("Failed to parse AI response");
            }
          } else {
            throw new Error("No valid JSON found in AI response");
          }
        }

      } catch (aiError) {
        console.error("AI model error details:", aiError);
        
        // If AI fails, provide fallback feedback based on enhanced analysis
        console.log("AI model failed, providing enhanced fallback feedback");
        
        const userText = latestMessage;
        const wordCount = userText.split(' ').length;
        const hasGrammarIssues = /(i am|i is|i are|he have|she have|they has|i goes|he go|she go)/i.test(userText);
        const hasBasicGreeting = /(hello|hi|hey|good morning|good afternoon|good evening)/i.test(userText);
        const hasQuestion = /\?/.test(userText);
        const hasPoliteWords = /(please|thank you|thanks|excuse me|sorry)/i.test(userText);
        const hasComplexWords = /(however|therefore|furthermore|nevertheless|consequently)/i.test(userText);
        const hasProperPunctuation = /[.!?]/.test(userText);
        const hasContractions = /(don't|can't|won't|isn't|aren't|wasn't|weren't)/i.test(userText);
        const hasEmotionalWords = /(feel|think|believe|hope|wish|sorry|happy|sad|excited)/i.test(userText);
        
        // Enhanced scoring based on multiple factors
        const grammarScore = hasGrammarIssues ? 4 : (hasProperPunctuation ? 7 : 6);
        const vocabularyScore = hasComplexWords ? 8 : (wordCount > 5 ? 6 : 5);
        const fluencyScore = hasContractions ? 7 : 6;
        const professionalismScore = hasPoliteWords ? 8 : (hasBasicGreeting ? 7 : 6);
        const toneScore = hasPoliteWords ? 8 : (hasBasicGreeting ? 7 : 6);
        const clarityScore = hasQuestion ? 7 : (hasProperPunctuation ? 7 : 6);
        const empathyScore = hasEmotionalWords ? 8 : (hasPoliteWords ? 7 : 5);
        const overallScore = Math.round((grammarScore + vocabularyScore + fluencyScore + professionalismScore + toneScore + clarityScore + empathyScore) / 7);
        
        feedbackData = {
          overallScore: overallScore,
          professionalism: professionalismScore,
          tone: toneScore,
          clarity: clarityScore,
          empathy: empathyScore,
          strengths: hasBasicGreeting ? ["Good greeting etiquette", "Clear communication"] : ["Attempted communication"],
          areasForImprovement: hasGrammarIssues ? ["Grammar accuracy", "Sentence structure"] : ["Vocabulary expansion", "Grammar practice"],
          grammarAnalysis: {
            commonErrors: hasGrammarIssues ? ["Subject-verb agreement issues"] : ["Basic grammar needs improvement"],
            grammarScore: grammarScore
          },
          vocabularyAnalysis: {
            vocabularyRange: wordCount < 5 ? "Basic" : "Developing",
            vocabularyScore: vocabularyScore,
            suggestedWords: ["improve", "enhance", "develop", "practice", "learn"]
          },
          pronunciationTips: ["Practice vowel sounds", "Work on intonation", "Listen to native speakers"],
          fluencyAssessment: {
            fluencyScore: fluencyScore,
            fluencyNotes: "Good effort, needs more practice"
          },
          recommendations: ["Practice daily conversations", "Read English texts", "Listen to English podcasts"],
          nextSteps: ["Start with basic grammar exercises", "Practice pronunciation daily"],
          encouragement: "Great effort! Keep practicing and you'll see improvement."
        };
      }

    } else {
      // Enhanced comprehensive conversation analysis
      const feedbackPrompt = `You are an expert English language tutor providing detailed, constructive feedback on a student's conversation performance.

CONVERSATION ANALYSIS REQUEST:
Analyze the following conversation and provide comprehensive feedback in the exact JSON format specified below.

CONVERSATION CONTEXT:
- Scenario: ${scenario?.name || 'General conversation'}
- User Profile: ${userProfile?.background || 'English learner'}
- Proficiency Level: ${userProfile?.proficiency || 'intermediate'}
- Language: ${userLanguage}

FULL CONVERSATION TO ANALYZE:
${messages.map((msg, index) => `${msg.role === 'user' ? 'User' : 'Assistant'}: "${msg.content}"`).join('\n')}

USER MESSAGES ONLY:
${userMessages.map((msg, index) => `${index + 1}. "${msg}"`).join('\n')}

ANALYSIS REQUIREMENTS:
1. Analyze the entire conversation flow and context
2. Identify patterns in grammar, vocabulary, and communication style
3. Analyze professionalism, tone, clarity, and empathy throughout the conversation
4. Consider conversation progression and improvement over time
5. Provide specific, actionable feedback based on the full conversation
6. Assess overall English proficiency and communication skills

SCORING CRITERIA:
- Professionalism (1-10): Use of appropriate language, formality level, respect throughout conversation
- Tone (1-10): Friendliness, appropriateness, emotional intelligence in conversation
- Clarity (1-10): Clear expression of ideas, easy to understand throughout
- Empathy (1-10): Understanding of others, emotional awareness, considerate responses
- Grammar (1-10): Overall grammatical accuracy, sentence structure, syntax
- Vocabulary (1-10): Word choice, range, appropriateness throughout conversation
- Fluency (1-10): Natural flow, coherence, ease of expression

FEEDBACK REQUIREMENTS:
Provide a comprehensive analysis in the following JSON format (use the exact structure):

{
  "overallScore": number (1-10),
  "professionalism": number (1-10),
  "tone": number (1-10),
  "clarity": number (1-10),
  "empathy": number (1-10),
  "strengths": [
    "List 2-4 specific strengths observed in their English usage throughout the conversation"
  ],
  "areasForImprovement": [
    "List 2-4 specific areas that need improvement based on the conversation"
  ],
  "grammarAnalysis": {
    "commonErrors": [
      "List specific grammar mistakes found throughout the conversation"
    ],
    "grammarScore": number (1-10)
  },
  "vocabularyAnalysis": {
    "vocabularyRange": "assessment of vocabulary usage throughout the conversation",
    "vocabularyScore": number (1-10),
    "suggestedWords": [
      "List 5-8 vocabulary words they should learn based on the conversation context"
    ]
  },
  "pronunciationTips": [
    "List 3-5 pronunciation improvement tips based on the conversation"
  ],
  "fluencyAssessment": {
    "fluencyScore": number (1-10),
    "fluencyNotes": "assessment of speaking fluency throughout the conversation"
  },
  "recommendations": [
    "List 4-6 specific, actionable recommendations for improvement based on the conversation"
  ],
  "nextSteps": [
    "List 3 immediate next steps they should take"
  ],
  "encouragement": "A motivating message acknowledging their progress in the conversation"
}

ANALYSIS GUIDELINES:
1. Consider the entire conversation flow and context
2. Identify patterns and recurring issues
3. Acknowledge progress and improvement over time
4. Provide specific examples from the conversation
5. Balance criticism with encouragement
6. Consider their proficiency level and learning goals
7. Provide practical, actionable suggestions
8. Score professionalism, tone, clarity, and empathy based on overall conversation
9. Give specific examples from their messages
10. Provide concrete improvement suggestions
11. Consider conversation context and scenario

IMPORTANT: Return ONLY valid JSON. Do not include any additional text or explanations outside the JSON structure.`;

      try {
        const result = await streamText({
          model: google(GEMINI_MODEL),
          messages: [
            { role: "system", content: feedbackPrompt }
          ],
          temperature: 0.2, // Lower temperature for more consistent analysis
          maxTokens: 1500,
        });

        console.log("AI model called successfully, processing stream...");

        // Consume the stream with timeout
        let fullText = '';
        const streamTimeout = setTimeout(() => {
          throw new Error("Stream processing timeout");
        }, 25000); // 25 second timeout

        try {
          for await (const chunk of result.textStream) {
            fullText += chunk;
          }
          clearTimeout(streamTimeout);
        } catch (streamError) {
          clearTimeout(streamTimeout);
          throw streamError;
        }

        console.log("Complete AI response:", fullText);

        // Parse the JSON response
        try {
          feedbackData = JSON.parse(fullText);
        } catch (parseError) {
          console.error("Failed to parse feedback JSON:", parseError);
          console.error("Raw response:", fullText);
          
          // Try to extract JSON from the response if it's wrapped in other text
          const jsonMatch = fullText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              feedbackData = JSON.parse(jsonMatch[0]);
            } catch (secondParseError) {
              console.error("Failed to parse extracted JSON:", secondParseError);
              throw new Error("Failed to parse AI response");
            }
          } else {
            throw new Error("No valid JSON found in AI response");
          }
        }

      } catch (aiError) {
        console.error("AI model error details:", aiError);
        
        // Enhanced fallback logic for conversation analysis
        console.log("AI model failed, providing enhanced fallback feedback");
        
        const userText = userMessages.join(' ');
        const wordCount = userText.split(' ').length;
        const hasGrammarIssues = /(i am|i is|i are|he have|she have|they has|i goes|he go|she go)/i.test(userText);
        const hasBasicGreeting = /(hello|hi|hey|good morning|good afternoon|good evening)/i.test(userText);
        const hasComplexWords = /(however|therefore|furthermore|nevertheless|consequently)/i.test(userText);
        const hasProperPunctuation = /[.!?]/.test(userText);
        const hasContractions = /(don't|can't|won't|isn't|aren't|wasn't|weren't)/i.test(userText);
        const hasQuestions = /\?/.test(userText);
        const hasPoliteWords = /(please|thank you|thanks|excuse me|sorry)/i.test(userText);
        const hasEmotionalWords = /(feel|think|believe|hope|wish|sorry|happy|sad|excited)/i.test(userText);
        
        // Enhanced scoring based on conversation analysis
        const grammarScore = hasGrammarIssues ? 4 : (hasProperPunctuation ? 7 : 6);
        const vocabularyScore = hasComplexWords ? 8 : (wordCount > 10 ? 6 : 5);
        const fluencyScore = hasContractions ? 7 : 6;
        const professionalismScore = hasPoliteWords ? 8 : (hasBasicGreeting ? 7 : 6);
        const toneScore = hasPoliteWords ? 8 : (hasBasicGreeting ? 7 : 6);
        const clarityScore = hasQuestions ? 7 : (hasProperPunctuation ? 7 : 6);
        const empathyScore = hasEmotionalWords ? 8 : (hasPoliteWords ? 7 : 5);
        const overallScore = Math.round((grammarScore + vocabularyScore + fluencyScore + professionalismScore + toneScore + clarityScore + empathyScore) / 7);
        
        feedbackData = {
          overallScore: overallScore,
          professionalism: professionalismScore,
          tone: toneScore,
          clarity: clarityScore,
          empathy: empathyScore,
          strengths: hasBasicGreeting ? ["Good greeting etiquette", "Clear communication", "Engaged in conversation"] : ["Attempted communication", "Participated in conversation"],
          areasForImprovement: hasGrammarIssues ? ["Grammar accuracy", "Sentence structure", "Subject-verb agreement"] : ["Vocabulary expansion", "Grammar practice", "Sentence variety"],
          grammarAnalysis: {
            commonErrors: hasGrammarIssues ? ["Subject-verb agreement issues", "Tense consistency problems"] : ["Basic grammar needs improvement", "Sentence structure could be enhanced"],
            grammarScore: grammarScore
          },
          vocabularyAnalysis: {
            vocabularyRange: wordCount < 10 ? "Basic" : "Developing",
            vocabularyScore: vocabularyScore,
            suggestedWords: ["improve", "enhance", "develop", "practice", "learn", "communicate", "express", "converse", "discuss", "explain"]
          },
          pronunciationTips: ["Practice vowel sounds", "Work on intonation", "Listen to native speakers", "Record yourself speaking", "Practice stress patterns"],
          fluencyAssessment: {
            fluencyScore: fluencyScore,
            fluencyNotes: "Good effort, needs more practice with natural speech patterns"
          },
          recommendations: ["Practice daily conversations", "Read English texts", "Listen to English podcasts", "Join conversation groups", "Practice with native speakers"],
          nextSteps: ["Start with basic grammar exercises", "Practice pronunciation daily", "Expand vocabulary", "Join conversation practice groups"],
          encouragement: "Great effort! Keep practicing and you'll see improvement."
        };
      }
    }

    // Validate feedback structure and ensure all required fields are present
    const requiredFields = ['overallScore', 'professionalism', 'tone', 'clarity', 'empathy', 'strengths', 'areasForImprovement', 'grammarAnalysis', 'vocabularyAnalysis', 'pronunciationTips', 'fluencyAssessment', 'recommendations', 'nextSteps', 'encouragement'];

    const missingFields = requiredFields.filter(field => !feedbackData[field]);
    if (missingFields.length > 0) {
      console.error("Missing feedback fields:", missingFields);
      // Provide default values for missing fields
      missingFields.forEach(field => {
        if (field === 'overallScore') feedbackData[field] = 6;
        else if (field === 'professionalism') feedbackData[field] = 6;
        else if (field === 'tone') feedbackData[field] = 6;
        else if (field === 'clarity') feedbackData[field] = 6;
        else if (field === 'empathy') feedbackData[field] = 6;
        else if (field === 'strengths') feedbackData[field] = ["Good effort"];
        else if (field === 'areasForImprovement') feedbackData[field] = ["Continue practicing"];
        else if (field === 'grammarAnalysis') feedbackData[field] = { commonErrors: [], grammarScore: 6 };
        else if (field === 'vocabularyAnalysis') feedbackData[field] = { vocabularyRange: "Basic", vocabularyScore: 6, suggestedWords: [] };
        else if (field === 'pronunciationTips') feedbackData[field] = ["Practice regularly"];
        else if (field === 'fluencyAssessment') feedbackData[field] = { fluencyScore: 6, fluencyNotes: "Keep practicing" };
        else if (field === 'recommendations') feedbackData[field] = ["Practice daily"];
        else if (field === 'nextSteps') feedbackData[field] = ["Continue learning"];
        else if (field === 'encouragement') feedbackData[field] = "Keep up the good work!";
      });
    }

    // Ensure scores are within valid range (1-10)
    ['overallScore', 'professionalism', 'tone', 'clarity', 'empathy'].forEach(scoreField => {
      if (feedbackData[scoreField] < 1) feedbackData[scoreField] = 1;
      if (feedbackData[scoreField] > 10) feedbackData[scoreField] = 10;
    });

    if (feedbackData.grammarAnalysis && feedbackData.grammarAnalysis.grammarScore) {
      if (feedbackData.grammarAnalysis.grammarScore < 1) feedbackData.grammarAnalysis.grammarScore = 1;
      if (feedbackData.grammarAnalysis.grammarScore > 10) feedbackData.grammarAnalysis.grammarScore = 10;
    }

    if (feedbackData.vocabularyAnalysis && feedbackData.vocabularyAnalysis.vocabularyScore) {
      if (feedbackData.vocabularyAnalysis.vocabularyScore < 1) feedbackData.vocabularyAnalysis.vocabularyScore = 1;
      if (feedbackData.vocabularyAnalysis.vocabularyScore > 10) feedbackData.vocabularyAnalysis.vocabularyScore = 10;
    }

    if (feedbackData.fluencyAssessment && feedbackData.fluencyAssessment.fluencyScore) {
      if (feedbackData.fluencyAssessment.fluencyScore < 1) feedbackData.fluencyAssessment.fluencyScore = 1;
      if (feedbackData.fluencyAssessment.fluencyScore > 10) feedbackData.fluencyAssessment.fluencyScore = 10;
    }

    // Generate conversation stats
    const conversationStats = {
      totalMessages: messages.length,
      userMessages: userMessages.length,
      scenario: scenario?.name || 'General conversation',
      analyzedAt: new Date().toISOString(),
      analysisType: analyzeIndividual ? 'individual' : 'conversation'
    };

    console.log("Feedback generation completed successfully");

    return new Response(
      JSON.stringify({
        feedback: feedbackData,
        conversationStats: conversationStats,
        success: true
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Feedback API error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to generate feedback",
        success: false
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}