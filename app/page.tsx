"use client";

import { AuthGuard } from "@/components/AuthGuard";
import TrainingChat from "@/components/TrainingChat";
import { ModelProvider } from "@/contexts/ModelContext";

export default function Home() {
  return (
    <AuthGuard>
      <TrainingChat />
    </AuthGuard>
  );
}
