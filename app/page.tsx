"use client";

import { AuthGuard } from "@/components/AuthGuard";
import QueryChat from "@/components/ChatInterface";
import TrainingChat from "@/components/TrainingChat";
import OnboardingChat from "@/components/OnboardingChat";
import { ModelProvider, useModel } from "@/contexts/ModelContext";

function ChatSwitcher() {
  const { selectedModel } = useModel();

  return (
    <div className="flex flex-col gap-4">

      {selectedModel === "training" ? (
        <TrainingChat />
      ) : selectedModel === "query" ? (
        <QueryChat />
      ) : (
        <OnboardingChat />
      )}
    </div>
    
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <ModelProvider>
        <ChatSwitcher />
      </ModelProvider>
    </AuthGuard>
  );
}
