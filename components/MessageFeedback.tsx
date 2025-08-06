"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  X,
  TrendingUp,
} from "lucide-react";

interface MessageFeedbackData {
  overallScore: number;
  professionalism: number;
  tone: number;
  clarity: number;
  empathy: number;
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

interface MessageFeedbackProps {
  message: string;
  scenario?: any;
  userProfile?: any;
  userLanguage?: string;
  onClose?: () => void;
}

export function MessageFeedback({ 
  message, 
  scenario, 
  userProfile, 
  userLanguage = "english",
  onClose 
}: MessageFeedbackProps) {
  const [feedback, setFeedback] = useState<MessageFeedbackData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateFeedback = async () => {
      if (!message.trim()) {
        setError("No message to analyze");
        setIsLoading(false);
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
            messages: [{ role: "user", content: message }],
            scenario: scenario || { name: "general conversation" },
            userProfile: userProfile || { background: "english learner", proficiency: "intermediate" },
            userLanguage,
            analyzeIndividual: true,
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
      } catch (err) {
        console.error("Error generating feedback:", err);
        setError(err instanceof Error ? err.message : "Failed to generate feedback");
      } finally {
        setIsLoading(false);
      }
    };

    generateFeedback();
  }, [message, scenario, userProfile, userLanguage]);

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

  const renderScore = (score: number, label: string) => (
    <div className="flex items-center gap-2">
      <div className={`w-10 h-10 rounded-full ${getScoreBgColor(score)} flex items-center justify-center`}>
        <span className={`text-sm font-bold ${getScoreColor(score)}`}>{score}</span>
      </div>
      <div>
        <div className="font-medium text-sm">{label}</div>
        <Progress value={score * 10} className="w-16 h-1.5" />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card className="p-4 border-blue-200 bg-blue-50">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-sm text-blue-700">Analyzing your message...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-red-200 bg-red-50">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      </Card>
    );
  }

  if (!feedback) {
    return null;
  }

  return (
    <Card className="p-4 border-2 border-blue-200 bg-white shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-700">Feedback</h3>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Score Section */}
      <div className="mb-4">
        <h4 className="font-medium mb-3 text-gray-800">Score</h4>
        <div className="grid grid-cols-2 gap-3">
          {renderScore(feedback.professionalism, "Professionalism")}
          {renderScore(feedback.tone, "Tone")}
          {renderScore(feedback.clarity, "Clarity")}
          {renderScore(feedback.empathy, "Empathy")}
        </div>
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Overall Score</span>
            <span className={`text-lg font-bold ${getScoreColor(feedback.overallScore)}`}>
              {feedback.overallScore}/10
            </span>
          </div>
          <Progress value={feedback.overallScore * 10} className="h-2 mt-1" />
        </div>
      </div>

      {/* What You did well */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <h4 className="font-medium text-green-700">What You did well</h4>
        </div>
        <ul className="space-y-1">
          {feedback.strengths.map((strength, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <div className="w-1 h-1 rounded-full bg-green-400 mt-2 flex-shrink-0"></div>
              <span className="text-gray-700">{strength}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* What You can improve */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-orange-600" />
          <h4 className="font-medium text-orange-700">What You can improve</h4>
        </div>
        <ul className="space-y-1">
          {feedback.areasForImprovement.map((area, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <div className="w-1 h-1 rounded-full bg-orange-400 mt-2 flex-shrink-0"></div>
              <span className="text-gray-700">{area}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* One suggestion to improve future interactions */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-green-600" />
          <h4 className="font-medium text-green-700">One suggestion to improve future interactions</h4>
        </div>
        <ul className="space-y-1">
          {feedback.recommendations.slice(0, 1).map((rec, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <div className="w-1 h-1 rounded-full bg-green-400 mt-2 flex-shrink-0"></div>
              <span className="text-gray-700">{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Grammar Errors */}
      {feedback.grammarAnalysis.commonErrors.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-2 text-red-700">Grammar Issues</h4>
          <ul className="space-y-1">
            {feedback.grammarAnalysis.commonErrors.map((error, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <div className="w-1 h-1 rounded-full bg-red-400 mt-2 flex-shrink-0"></div>
                <span className="text-gray-700">{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Vocabulary Suggestions */}
      {feedback.vocabularyAnalysis.suggestedWords.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium mb-2 text-blue-700">Suggested Words</h4>
          <div className="flex flex-wrap gap-1">
            {feedback.vocabularyAnalysis.suggestedWords.slice(0, 5).map((word, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {word}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Encouragement */}
      <div className="pt-3 border-t">
        <p className="text-sm italic text-gray-600">{feedback.encouragement}</p>
      </div>
    </Card>
  );
} 