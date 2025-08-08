"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  X,
  Star,
  TrendingUp,
  BookOpen,
  Mic,
  Target,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Award,
  Clock,
  MessageSquare,
  BarChart3,
} from "lucide-react";

interface FeedbackData {
  overallScore: number;
  professionalism?: number;
  tone?: number;
  clarity?: number;
  empathy?: number;
  conversationAnalysis?: {
    engagementLevel: string;
    responseQuality: string;
    conversationFlow: string;
    topicAdaptation?: string;
  };
  progressAnalysis?: {
    improvement: string;
    consistency: string;
    learningPatterns?: string;
    adaptation?: string;
  };
  strengths: string[];
  areasForImprovement: string[];
  grammarAnalysis: {
    commonErrors: string[];
    grammarScore: number;
    contextualGrammar?: string;
  };
  vocabularyAnalysis: {
    vocabularyRange: string;
    vocabularyScore: number;
    suggestedWords: string[];
  };
  pronunciationTips: string[];
  fluencyAssessment: {
    fluencyScore: number;
    fluencyNotes: string;
  };
  conversationRecommendations?: string[];
  recommendations?: string[];
  nextSteps: string[];
  encouragement: string;
}

interface ConversationStats {
  totalMessages: number;
  userMessages: number;
  scenario: string;
  analyzedAt: string;
  analysisType?: 'individual' | 'conversation';
}

interface FeedbackModalProps {
  messages: Array<{ role: string; content: string }>;
  scenario: any;
  userProfile: any;
  userLanguage: string;
  onFeedbackGenerated?: (feedback: FeedbackData) => void;
}

export function FeedbackModal({ 
  messages, 
  scenario, 
  userProfile, 
  userLanguage,
  onFeedbackGenerated
}: FeedbackModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateFeedback = async () => {
    if (messages.length === 0) {
      setError("No conversation to analyze");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          scenario,
          userProfile,
          userLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setFeedback(data.feedback);
      setStats(data.conversationStats);

      console.log("Feedback generated:", data.feedback);
      
      if (onFeedbackGenerated) {
        onFeedbackGenerated(data.feedback);
      }
    } catch (err) {
      console.error("Error generating feedback:", err);
      setError(err instanceof Error ? err.message : "Failed to generate feedback");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    generateFeedback(); // always generate new feedback
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-green-500";
    if (score >= 6) return "bg-yellow-500";
    return "bg-red-500";
  };

  const renderScoreBar = (label: string, score: number) => (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{score}/10</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${getScoreColor(score)}`}
          style={{ width: `${(score / 10) * 100}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          onClick={handleOpen}
          variant="outline" 
          className="gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Get Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-blue-600 text-center">
            Feedback
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)]">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Analyzing your conversation...</p>
              </div>
            </div>
          )}

          {error && (
            <Card className="p-4 border-red-200 bg-red-50">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            </Card>
          )}

          {feedback && (
            <div className="space-y-6 px-4">
              {/* Score Section */}
              <Card className="p-6 border-2 border-gray-200 rounded-xl">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-800">Score</h2>
                </div>
                
                <div className="space-y-4">
                  {feedback.professionalism && renderScoreBar("Professionalism", feedback.professionalism)}
                  {feedback.tone && renderScoreBar("Tone", feedback.tone)}
                  {feedback.clarity && renderScoreBar("Clarity", feedback.clarity)}
                  {feedback.empathy && renderScoreBar("Empathy", feedback.empathy)}
                  
                  {/* Overall Score with different styling */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-gray-900">Overall Score</span>
                      <span className="text-sm font-bold text-gray-900">{feedback.overallScore}/10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${(feedback.overallScore / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* What You did well */}
              <Card className="p-6 border-2 border-gray-200 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-bold text-green-700">What You did well</h2>
                </div>
                <ul className="space-y-3">
                  {feedback.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700 text-sm leading-relaxed">{strength}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* What You can improve */}
              <Card className="p-6 border-2 border-gray-200 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <h2 className="text-lg font-bold text-yellow-700">What You can improve</h2>
                </div>
                <ul className="space-y-3">
                  {feedback.areasForImprovement.map((area, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700 text-sm leading-relaxed">{area}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* One suggestion to improve future interactions */}
              <Card className="p-6 border-2 border-gray-200 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-blue-700">
                    {(feedback.conversationRecommendations ? 'Conversation' : 'One suggestion to improve future interactions')}
                  </h2>
                </div>
                <ul className="space-y-3">
                  {(feedback.conversationRecommendations || feedback.recommendations || []).map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700 text-sm leading-relaxed">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Additional sections that might be useful but not in the image */}
              {feedback.grammarAnalysis.commonErrors.length > 0 && (
                <Card className="p-6 border-2 border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <h2 className="text-lg font-bold text-orange-700">Grammar Notes</h2>
                  </div>
                  <ul className="space-y-3">
                    {feedback.grammarAnalysis.commonErrors.map((error, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700 text-sm leading-relaxed">{error}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Conversation Analysis */}
              {feedback.conversationAnalysis && (
                <Card className="p-6 border-2 border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-bold text-indigo-700">Conversation Analysis</h2>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700 text-sm leading-relaxed">
                        <strong>Engagement:</strong> {feedback.conversationAnalysis.engagementLevel}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700 text-sm leading-relaxed">
                        <strong>Response Quality:</strong> {feedback.conversationAnalysis.responseQuality}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700 text-sm leading-relaxed">
                        <strong>Conversation Flow:</strong> {feedback.conversationAnalysis.conversationFlow}
                      </span>
                    </div>
                    {feedback.conversationAnalysis.topicAdaptation && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700 text-sm leading-relaxed">
                          <strong>Topic Adaptation:</strong> {feedback.conversationAnalysis.topicAdaptation}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Progress Analysis */}
              {feedback.progressAnalysis && (
                <Card className="p-6 border-2 border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <h2 className="text-lg font-bold text-green-700">Progress Analysis</h2>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700 text-sm leading-relaxed">
                        <strong>Improvement:</strong> {feedback.progressAnalysis.improvement}
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700 text-sm leading-relaxed">
                        <strong>Consistency:</strong> {feedback.progressAnalysis.consistency}
                      </span>
                    </div>
                    {feedback.progressAnalysis.learningPatterns && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700 text-sm leading-relaxed">
                          <strong>Learning Patterns:</strong> {feedback.progressAnalysis.learningPatterns}
                        </span>
                      </div>
                    )}
                    {feedback.progressAnalysis.adaptation && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700 text-sm leading-relaxed">
                          <strong>Adaptation:</strong> {feedback.progressAnalysis.adaptation}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Vocabulary Suggestions */}
              {feedback.vocabularyAnalysis.suggestedWords.length > 0 && (
                <Card className="p-6 border-2 border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-bold text-purple-700">Vocabulary Suggestions</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {feedback.vocabularyAnalysis.suggestedWords.map((word, index) => (
                      <Badge key={index} variant="secondary" className="text-xs px-3 py-1">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}