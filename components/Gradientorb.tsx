import clsx from "clsx";

export const GradientOrb = ({ isSpeaking = false, isLoading = false }) => {
  const isIdle = !isSpeaking && !isLoading;

  return (
    <div className="flex justify-center py-8 mb-6">
      <div
        className={clsx(
          "relative w-52 h-52 rounded-full transition-all duration-500 ease-in-out",
          {
            // Idle state - soft pulse
            "border-purple-200/50 animate-pulse-soft": isIdle,
            // Loading state - continuous pulse
            "border-purple-300/70 animate-pulse-loading":
              isLoading && !isSpeaking,
            // Speaking state - dynamic animation
            "border-purple-400/90 animate-speaking": isSpeaking,
          }
        )}
        style={{
          background: isIdle
            ? `linear-gradient(125deg,
              rgba(255, 255, 255, 0.9) 0%,
              rgba(186, 85, 211, 0.6) 25%,
              rgba(147, 112, 219, 0.5) 50%,
              rgba(123, 104, 238, 0.4) 75%,
              rgba(138, 43, 226, 0.3) 100%
            )`
            : `linear-gradient(30deg,
              rgba(255, 255, 255, 0.85) 0%,
              rgba(147, 112, 219, 0.7) 20%,
              rgba(138, 43, 226, 0.8) 40%,
              rgba(186, 85, 211, 0.6) 60%,
              rgba(123, 104, 238, 0.5) 80%,
              rgba(106, 90, 205, 0.4) 100%
            )`,
          boxShadow: isSpeaking
            ? "0 0 40px rgba(138, 43, 226, 0.6), 0 0 80px rgba(138, 43, 226, 0.3)"
            : isLoading
            ? "0 0 20px rgba(138, 43, 226, 0.4)"
            : "0 0 15px rgba(138, 43, 226, 0.3)",
        }}
      >
        {/* Inner glow for speaking state */}
        {isSpeaking && (
          <div
            className="absolute top-[15%] left-[15%] w-[70%] h-[70%] rounded-full animate-inner-glow"
            style={{
              background:
                "radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%)",
            }}
          />
        )}

        {/* Subtle inner highlight for idle state */}
        {isIdle && (
          <div
            className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full opacity-30"
            style={{
              background:
                "radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, transparent 60%)",
            }}
          />
        )}

        {/* Loading state inner animation */}
        {isLoading && !isSpeaking && (
          <div
            className="absolute top-[10%] left-[10%] w-[80%] h-[80%] rounded-full animate-loading-glow"
            style={{
              background:
                "radial-gradient(circle, rgba(186, 85, 211, 0.3) 0%, transparent 70%)",
            }}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes pulse-soft {
          0%,
          100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.07);
            filter: brightness(1.05);
          }
        }

        @keyframes pulse-loading {
          0%,
          100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.12);
            filter: brightness(1.1);
          }
        }

        @keyframes speaking {
          0% {
            transform: scale(1) rotate(0deg);
            filter: brightness(1);
          }
          15% {
            transform: scale(1.08) rotate(1deg);
            filter: brightness(1.2);
          }
          30% {
            transform: scale(0.95) rotate(-0.5deg);
            filter: brightness(0.9);
          }
          45% {
            transform: scale(1.12) rotate(1.5deg);
            filter: brightness(1.3);
          }
          60% {
            transform: scale(0.98) rotate(-1deg);
            filter: brightness(1.1);
          }
          75% {
            transform: scale(1.06) rotate(0.5deg);
            filter: brightness(1.15);
          }
          90% {
            transform: scale(1.02) rotate(-0.2deg);
            filter: brightness(1.05);
          }
          100% {
            transform: scale(1) rotate(0deg);
            filter: brightness(1);
          }
        }

        @keyframes inner-glow {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }

        @keyframes loading-glow {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(1) rotate(0deg);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.05) rotate(180deg);
          }
        }

        .animate-pulse-soft {
          animation: pulse-soft 4s ease-in-out infinite;
        }

        .animate-pulse-loading {
          animation: pulse-loading 1.2s ease-in-out infinite;
        }

        .animate-speaking {
          animation: speaking 0.6s ease-in-out infinite;
        }

        .animate-inner-glow {
          animation: inner-glow 0.4s ease-in-out infinite alternate;
        }

        .animate-loading-glow {
          animation: loading-glow 2s linear infinite;
        }
      `}</style>
    </div>
  );
};
