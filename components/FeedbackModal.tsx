"use client";

import { useState, useEffect } from "react";
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
  RefreshCw,
  Zap,
} from "lucide-react";

interface FeedbackData {
  overallScore: number;
  strengths: string[];
  areasForImprovement: string[];
  grammarAnalysis: {
    commonErrors: string[];
    grammarScore: number;
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
  recommendations: string[];
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
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      setLastUpdateTime(new Date());
      
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

  const refreshFeedback = async () => {
    setIsRefreshing(true);
    await generateFeedback();
    setIsRefreshing(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!feedback) {
      generateFeedback();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 8) return "bg-green-100";
    if (score >= 6) return "bg-yellow-100";
    return "bg-red-100";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 9) return "Excellent";
    if (score >= 8) return "Very Good";
    if (score >= 7) return "Good";
    if (score >= 6) return "Fair";
    if (score >= 5) return "Needs Improvement";
    return "Poor";
  };

  const renderScore = (score: number, label: string) => (
    <div className="flex items-center gap-2">
      <div className={`w-12 h-12 rounded-full ${getScoreBgColor(score)} flex items-center justify-center`}>
        <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}</span>
      </div>
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-gray-500">{getScoreLabel(score)}</div>
        <Progress value={score * 10} className="w-20 h-2" />
      </div>
    </div>
  );

  const renderList = (items: string[], icon: React.ReactNode, title: string, color: string) => (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className={`font-semibold ${color}`}>{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0"></div>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
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
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              English Learning Feedback
            </div>
            <div className="flex items-center gap-2">
              {lastUpdateTime && (
                <span className="text-xs text-gray-500">
                  Last updated: {lastUpdateTime.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshFeedback}
                disabled={isRefreshing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)]">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Analyzing your conversation...</p>
                <p className="text-xs text-gray-500 mt-2">This may take a few seconds</p>
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

          {feedback && stats && (
            <div className="space-y-6">
              {/* Conversation Stats */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-700">
                        {`${stats.userMessages} messages analyzed`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-700">
                        Scenario: {stats.scenario}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700">
                        Real-time Analysis
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(stats.analyzedAt).toLocaleDateString()}
                  </div>
                </div>
              </Card>

              {/* Overall Score */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Overall Performance</h2>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <span className={`text-2xl font-bold ${getScoreColor(feedback.overallScore)}`}>
                      {feedback.overallScore}/10
                    </span>
                    <span className="text-sm text-gray-500">({getScoreLabel(feedback.overallScore)})</span>
                  </div>
                </div>
                <Progress value={feedback.overallScore * 10} className="h-3" />
              </Card>

              {/* Detailed Scores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderScore(feedback.grammarAnalysis.grammarScore, "Grammar")}
                {renderScore(feedback.vocabularyAnalysis.vocabularyScore, "Vocabulary")}
                {renderScore(feedback.fluencyAssessment.fluencyScore, "Fluency")}
              </div>

              {/* Strengths and Areas for Improvement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderList(
                  feedback.strengths,
                  <CheckCircle className="w-4 h-4 text-green-600" />,
                  "What You did well",
                  "text-green-700"
                )}
                {renderList(
                  feedback.areasForImprovement,
                  <Target className="w-4 h-4 text-orange-600" />,
                  "What You can improve",
                  "text-orange-700"
                )}
              </div>

              {/* Grammar Analysis */}
              {feedback.grammarAnalysis.commonErrors.length > 0 && (
                <Card className="p-4 border-orange-200 bg-orange-50">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <h3 className="font-semibold text-orange-700">Common Grammar Errors</h3>
                  </div>
                  <ul className="space-y-2">
                    {feedback.grammarAnalysis.commonErrors.map((error, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0"></div>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Vocabulary Suggestions */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-blue-700">Vocabulary Assessment</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">{feedback.vocabularyAnalysis.vocabularyRange}</p>
                <div>
                  <h4 className="font-medium mb-2">Suggested Words to Learn:</h4>
                  <div className="flex flex-wrap gap-2">
                    {feedback.vocabularyAnalysis.suggestedWords.map((word, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {word}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Pronunciation Tips */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Mic className="w-4 h-4 text-purple-600" />
                  <h3 className="font-semibold text-purple-700">Pronunciation Tips</h3>
                </div>
                <ul className="space-y-2">
                  {feedback.pronunciationTips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></div>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Recommendations */}
              <Card className="p-4 border-green-200 bg-green-50">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-green-600" />
                  <h3 className="font-semibold text-green-700">Recommendations</h3>
                </div>
                <ul className="space-y-2">
                  {feedback.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 flex-shrink-0"></div>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Next Steps */}
              <Card className="p-4 border-blue-200 bg-blue-50">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-blue-700">Immediate Next Steps</h3>
                </div>
                <ul className="space-y-2">
                  {feedback.nextSteps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Encouragement */}
              <Card className="p-4 border-yellow-200 bg-yellow-50">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-yellow-600" />
                  <h3 className="font-semibold text-yellow-700">Keep Going!</h3>
                </div>
                <p className="text-sm italic">{feedback.encouragement}</p>
              </Card>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}