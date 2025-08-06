"use client";

import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { FeedbackModal } from "./FeedbackModal";

interface FeedbackButtonProps {
  messages: Array<{ role: string; content: string }>;
  scenario?: any;
  userProfile?: any;
  userLanguage?: string;
  onFeedbackGenerated?: (feedback: any) => void;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  children?: React.ReactNode;
}

export function FeedbackButton({
  messages,
  scenario,
  userProfile,
  userLanguage = "english",
  onFeedbackGenerated,
  className = "",
  variant = "outline",
  size = "sm",
  showIcon = true,
  children
}: FeedbackButtonProps) {
  // Only show feedback button if there are messages to analyze
  if (messages.length === 0) {
    return null;
  }

  return (
    <FeedbackModal
      messages={messages}
      scenario={scenario}
      userProfile={userProfile}
      userLanguage={userLanguage}
      onFeedbackGenerated={onFeedbackGenerated}
    >
      <Button
        variant={variant}
        size={size}
        className={`gap-2 ${className}`}
      >
        {showIcon && <TrendingUp className="w-4 h-4" />}
        {children || "Get Feedback"}
      </Button>
    </FeedbackModal>
  );
} 