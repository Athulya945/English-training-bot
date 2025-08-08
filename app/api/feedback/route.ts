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
      const recentAssistantMessages = assistantMessages.slice(-3); // Get recent assistant responses
      console.log("Analyzing individual message:", latestMessage);

      // Create dynamic individual message feedback prompt with conversation context
      const individualFeedbackPrompt = `You are an expert English language tutor providing dynamic, contextual feedback on a user message within an ongoing conversation.

CONVERSATION ANALYSIS REQUEST:
Analyze the following user message in the context of the ongoing conversation and provide dynamic feedback that reflects the conversation flow.

CONVERSATION CONTEXT:
- Scenario: ${scenario?.name || 'General conversation'}
- User Profile: ${userProfile?.background || 'English learner'}
- Proficiency Level: ${userProfile?.proficiency || 'intermediate'}
- Language: ${userLanguage}
- Previous User Messages: ${previousMessages.length > 0 ? previousMessages.join(' | ') : 'None'}
- Recent Assistant Responses: ${recentAssistantMessages.length > 0 ? recentAssistantMessages.join(' | ') : 'None'}

CURRENT USER MESSAGE TO ANALYZE:
"${latestMessage}"

DYNAMIC ANALYSIS REQUIREMENTS:
1. **Conversation Flow Analysis**: How does this message fit into the ongoing conversation?
2. **Progress Tracking**: Compare this message with previous messages - has there been improvement?
3. **Context Awareness**: How well does the user respond to the assistant's questions and prompts?
4. **Engagement Level**: Is the user actively participating and responding appropriately?
5. **Adaptation**: How well does the user adapt their language to the conversation context?

SCORING CRITERIA (Context-Aware):
- Professionalism (1-10): Appropriateness for the conversation context and scenario
- Tone (1-10): How well the tone matches the conversation flow and assistant's style
- Clarity (1-10): Clear expression considering the conversation context
- Empathy (1-10): Understanding and responsiveness to the conversation context
- Grammar (1-10): Grammatical accuracy in the context of the conversation
- Vocabulary (1-10): Word choice appropriate for the conversation topic
- Fluency (1-10): Natural flow within the conversation context

DYNAMIC FEEDBACK REQUIREMENTS:
Provide a comprehensive analysis in the following JSON format (use the exact structure):

{
  "overallScore": number (1-10),
  "professionalism": number (1-10),
  "tone": number (1-10),
  "clarity": number (1-10),
  "empathy": number (1-10),
  "conversationContext": {
    "engagementLevel": "assessment of how well they're participating in the conversation",
    "responseQuality": "how well they respond to the assistant's prompts",
    "conversationFlow": "how naturally they maintain the conversation"
  },
  "progressAnalysis": {
    "improvement": "specific improvements compared to previous messages",
    "consistency": "how consistent their language use is throughout the conversation",
    "adaptation": "how well they adapt to different conversation topics"
  },
  "strengths": [
    "List 2-3 specific strengths observed in this message within the conversation context"
  ],
  "areasForImprovement": [
    "List 2-3 specific areas that need improvement considering the conversation flow"
  ],
  "grammarAnalysis": {
    "commonErrors": [
      "List specific grammar mistakes found in this message"
    ],
    "grammarScore": number (1-10),
    "contextualGrammar": "grammar assessment considering the conversation context"
  },
  "vocabularyAnalysis": {
    "vocabularyRange": "assessment of vocabulary usage in this conversation context",
    "vocabularyScore": number (1-10),
    "suggestedWords": [
      "List 3-5 vocabulary words appropriate for this conversation context"
    ]
  },
  "pronunciationTips": [
    "List 2-3 pronunciation improvement tips for this message"
  ],
  "fluencyAssessment": {
    "fluencyScore": number (1-10),
    "fluencyNotes": "assessment of speaking fluency within the conversation context"
  },
  "conversationRecommendations": [
    "List 2-3 specific recommendations for improving conversation skills"
  ],
  "nextSteps": [
    "List 2 immediate next steps they should take in the conversation"
  ],
  "encouragement": "A motivating message acknowledging their conversation participation and effort"
}

ANALYSIS GUIDELINES:
1. **Be Dynamic**: Consider how this message fits into the ongoing conversation
2. **Track Progress**: Compare with previous messages to identify improvement patterns
3. **Context Awareness**: Evaluate how well they respond to the conversation context
4. **Engagement Focus**: Assess their participation and responsiveness
5. **Scenario Appropriateness**: Consider how well they adapt to the specific scenario
6. **Conversation Flow**: Evaluate how naturally they maintain the conversation
7. **Provide Contextual Feedback**: Give suggestions that make sense in the conversation context
8. **Acknowledge Conversation Skills**: Recognize good conversation practices
9. **Be Encouraging**: Focus on progress and participation
10. **Consider Learning Goals**: Align feedback with their specific learning objectives

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
      // Enhanced dynamic conversation analysis
      const feedbackPrompt = `You are an expert English language tutor providing dynamic, contextual feedback on a student's conversation performance.

DYNAMIC CONVERSATION ANALYSIS REQUEST:
Analyze the following conversation and provide comprehensive feedback that reflects the conversation flow, engagement patterns, and learning progression.

CONVERSATION CONTEXT:
- Scenario: ${scenario?.name || 'General conversation'}
- User Profile: ${userProfile?.background || 'English learner'}
- Proficiency Level: ${userProfile?.proficiency || 'intermediate'}
- Language: ${userLanguage}

FULL CONVERSATION TO ANALYZE:
${messages.map((msg, index) => `${msg.role === 'user' ? 'User' : 'Assistant'}: "${msg.content}"`).join('\n')}

USER MESSAGES ONLY:
${userMessages.map((msg, index) => `${index + 1}. "${msg}"`).join('\n')}

DYNAMIC ANALYSIS REQUIREMENTS:
1. **Conversation Flow Analysis**: How well does the conversation progress naturally?
2. **Engagement Assessment**: How actively does the user participate and respond?
3. **Progress Tracking**: Identify improvement patterns throughout the conversation
4. **Context Adaptation**: How well does the user adapt to different conversation topics?
5. **Response Quality**: Evaluate the quality and appropriateness of responses
6. **Learning Progression**: Track how the user's language skills evolve during the conversation

SCORING CRITERIA (Dynamic):
- Professionalism (1-10): Appropriateness for the conversation context and scenario
- Tone (1-10): How well the tone adapts to the conversation flow
- Clarity (1-10): Clear expression considering the conversation context
- Empathy (1-10): Understanding and responsiveness to the conversation context
- Grammar (1-10): Grammatical accuracy in the context of the conversation
- Vocabulary (1-10): Word choice appropriate for the conversation topics
- Fluency (1-10): Natural flow within the conversation context

DYNAMIC FEEDBACK REQUIREMENTS:
Provide a comprehensive analysis in the following JSON format (use the exact structure):

{
  "overallScore": number (1-10),
  "professionalism": number (1-10),
  "tone": number (1-10),
  "clarity": number (1-10),
  "empathy": number (1-10),
  "conversationAnalysis": {
    "engagementLevel": "assessment of how well they participated in the conversation",
    "responseQuality": "how well they responded to the assistant's prompts",
    "conversationFlow": "how naturally they maintained the conversation",
    "topicAdaptation": "how well they adapted to different conversation topics"
  },
  "progressAnalysis": {
    "improvement": "specific improvements observed throughout the conversation",
    "consistency": "how consistent their language use was throughout",
    "learningPatterns": "identify any learning patterns or breakthroughs"
  },
  "strengths": [
    "List 2-4 specific strengths observed in their conversation participation"
  ],
  "areasForImprovement": [
    "List 2-4 specific areas that need improvement based on the conversation flow"
  ],
  "grammarAnalysis": {
    "commonErrors": [
      "List specific grammar mistakes found throughout the conversation"
    ],
    "grammarScore": number (1-10),
    "contextualGrammar": "grammar assessment considering the conversation context"
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
        console.log("AI model failed or JSON parsing failed, providing enhanced fallback feedback");
        
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