import { Button } from "@/components/ui/button";
import {
  Mic,
  ArrowLeft,
  RotateCcw,
  Volume2,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import clsx from "clsx";

// Define all available modes
const modes = ["conversation", "pronunciation", "grammar", "scenario"] as const;
type TrainingMode = typeof modes[number];

// Mode configuration with type safety
const modeConfig: Record<TrainingMode, { label: string; icon: React.ReactNode; color: string }> = {
  conversation: {
    label: "Conversation",
    icon: <MessageSquare className="w-4 h-4" />,
    color: "blue",
  },
  pronunciation: {
    label: "Pronunciation",
    icon: <Volume2 className="w-4 h-4" />,
    color: "purple",
  },
  grammar: {
    label: "Grammar",
    icon: <BookOpen className="w-4 h-4" />,
    color: "green",
  },
  scenario: {
    label: "Scenario",
    icon: <MessageSquare className="w-4 h-4" />,
    color: "orange",
  },
};

interface PushToTalkBarProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onBack: () => void;
  currentMode: TrainingMode;
  onToggleMode: (mode: TrainingMode) => void;
  showModeIndicator?: boolean;
}

// Reusable color class generator with type safety
const getModeClasses = (mode: TrainingMode, isRecording: boolean) => {
  if (isRecording) {
    return "bg-gradient-to-br from-red-500 to-red-600 shadow-red-200/50 scale-110";
  }

  const color = modeConfig[mode]?.color || "purple";
  return clsx(
    `bg-gradient-to-br from-${color}-500 to-${color}-600`,
    `shadow-${color}-200/50 hover:scale-105`
  );
};

export const PushToTalkBar = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  onBack,
  currentMode,
  onToggleMode,
  showModeIndicator = true,
}: PushToTalkBarProps) => {
  const getNextMode = (): TrainingMode => {
    const currentIndex = modes.indexOf(currentMode);
    return modes[(currentIndex + 1) % modes.length];
  };

  const handleModeToggle = () => {
    onToggleMode(getNextMode());
  };

  const handleMicClick = () => {
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <div className="flex flex-col items-center bottom-2 z-30">
      <div className="flex items-center gap-4 bg-white/95 backdrop-blur-md rounded-full px-6 py-4 shadow-xl border border-gray-200/50">
        {/* Back Button - Fixed with proper onClick handler */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="p-3 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors"
          aria-label="Back to scenarios"
          data-testid="back-button"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Mic Button */}
        <Button
          onClick={handleMicClick}
          className={clsx(
            "w-16 h-16 rounded-full transition-all duration-200 flex items-center justify-center shadow-lg relative",
            getModeClasses(currentMode, isRecording)
          )}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
          data-testid="mic-button"
        >
          <Mic className="w-6 h-6 text-white" />
          {isRecording && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-ping absolute h-16 w-16 rounded-full bg-red-400 opacity-75"></div>
            </div>
          )}
        </Button>

        {/* Mode Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleModeToggle}
          className="p-3 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-800 flex items-center gap-2 transition-colors"
          aria-label="Change training mode"
          data-testid="mode-toggle-button"
        >
          {modeConfig[currentMode]?.icon || <RotateCcw className="w-4 h-4" />}
        </Button>
      </div>

      {/* Mode Indicator */}
      {showModeIndicator && (
        <div className="mt-3 text-center">
          <span className="text-xs font-medium text-gray-600 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm flex items-center gap-1">
            {modeConfig[currentMode]?.icon}
            {modeConfig[currentMode]?.label || currentMode} Mode
          </span>
        </div>
      )}
    </div>
  );
};