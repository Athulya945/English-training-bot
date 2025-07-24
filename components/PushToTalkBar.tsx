import { Button } from "@/components/ui/button";
import { Mic, ArrowLeft, RotateCcw } from "lucide-react";
import clsx from "clsx";

export const PushToTalkBar = ({
  isRecording,
  onStartRecording,
  onStopRecording,
  onBack,
  currentMode,
  onToggleMode,
  showModeIndicator = true,
}) => {
  return (
    <div className="flex flex-col items-center bottom-2 z-30">
      <div className="flex items-center gap-4 bg-white/95 backdrop-blur-md rounded-full px-6 py-4 shadow-xl border border-gray-200/50">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="p-3 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Push-to-Talk Mic Button */}
        <Button
          onClick={isRecording ? onStopRecording : onStartRecording}
          className={clsx(
            "w-16 h-16 rounded-full transition-all duration-200 flex items-center justify-center shadow-lg",
            isRecording
              ? "bg-gradient-to-br from-red-500 to-red-600 shadow-red-200/50 scale-110 mic-listening"
              : "bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-purple-200/50 hover:scale-105"
          )}
        >
          <Mic className="w-6 h-6 text-white" />
        </Button>

        {/* Mode Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleMode}
          className="p-3 rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-800 flex items-center gap-2 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Mode Indicator */}
      {showModeIndicator && (
        <div className="mt-3 text-center">
          <span className="text-xs text-gray-500 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 shadow-sm">
            {currentMode === "sales" ? "Sales Training Mode" : "Game Mode"}
          </span>
        </div>
      )}
    </div>
  );
};
