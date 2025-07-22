"use client";

import { AuthGuard } from "@/components/AuthGuard";
import QueryChat from "@/components/ChatInterface";
import TrainingChat from "@/components/TrainingChat";
import { ModelProvider, useModel } from "@/contexts/ModelContext";

function ChatSwitcher() {
  const { selectedModel } = useModel();

  return (
    <div className="flex flex-col gap-4">

      {selectedModel === "training" ? <TrainingChat /> : <QueryChat />}
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
