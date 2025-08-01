"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Send,
  Search,
  Settings,
  User,
  Menu,
  X,
  Store,
  LogOut,
  Trash2,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations, type Conversation } from "@/hooks/useConversations";
import { AuthModal } from "@/components/AuthModal";
import { useModel } from "@/contexts/ModelContext";
//import ModelSelector from "@/components/ModelSelector";
import { MessageBubble } from "./MessageBubble";
import { GradientOrb } from "./Gradientorb";
import { PushToTalkBar } from "./PushToTalkBar";

// Define message type for better type safety
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function TrainingChat() {
  const { user, signOut } = useAuth();
  const {
    conversations,
    loading: conversationsLoading,
    createConversation,
    getMessages,
    saveMessage,
    deleteConversation,
    refetch: refetchConversations,
  } = useConversations();

  // Speech Recognition setup
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = "en-IN";
      recognition.interimResults = false;
      recognitionRef.current = recognition;
    }
  }, []);

  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [activeTab, setActiveTab] = useState("chat-history");
  const [isRecording, setIsRecording] = useState(false);
  const [currentMode, setCurrentMode] = useState("sales");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadedConversationRef = useRef(null);
  const currentConversationRef = useRef(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    currentConversationRef.current = currentConversationId;
  }, [currentConversationId]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const { selectedModel, setSelectedModel } = useModel();

  useEffect(() => {
    const setAppHeight = () => {
      document.documentElement.style.setProperty(
        "--app-height",
        `${window.innerHeight}px`
      );
    };

    setAppHeight();
    window.addEventListener("resize", setAppHeight);
    return () => window.removeEventListener("resize", setAppHeight);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setCurrentConversationId(null);
    setChatMessages([]);
    loadedConversationRef.current = null;
  }, [signOut]);

  // Add message to chat
  const addMessage = useCallback(
    (role: "user" | "assistant", content: string) => {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        role,
        content,
      };
      setChatMessages((prev) => [...prev, newMessage]);
    },
    []
  );

  // Send text to API and handle audio response
  const sendMessageToAPI = useCallback(
    async (text: string) => {
      try {
        // Add user message to chat
        addMessage("user", text);

        setIsLoading(true);

        // Prepare messages for API (include conversation history)
        const messages = [
          ...chatMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          { role: "user", content: text },
        ];

        // Send to API
        const response = await fetch("/api/onboardingchat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages 
          }),
        });

        if (!response.ok) {
          throw new Error(
            `API Error: ${response.status} ${response.statusText}`
          );
        }

        // Parse JSON { text, audio }
        const data = await response.json();

        if (!data.text || !data.audio) {
          throw new Error("Incomplete response from server");
        }

        // Add assistant text to chat
        setIsLoading(false);

        addMessage("assistant", data.text);

        // Decode base64 audio
        const base64 = data.audio.split(",")[1] || data.audio; 
        const audioBlob = new Blob(
          [Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))],
          {
            type: "audio/mpeg",
          }
        );
        const audioUrl = URL.createObjectURL(audioBlob);

        // Play audio
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          setIsPlayingAudio(true);

          audioRef.current.onended = () => {
            setIsPlayingAudio(false);
            URL.revokeObjectURL(audioUrl);
          };

          audioRef.current.onerror = () => {
            setIsPlayingAudio(false);
            URL.revokeObjectURL(audioUrl);
            console.error("Audio playback failed");
          };

          await audioRef.current.play();
        }

        // Save to conversation if needed
        if (currentConversationId) {
          try {
            await saveMessage(currentConversationId, "user", text);
            await saveMessage(currentConversationId, "assistant", data.text);
            refetchConversations();
          } catch (error) {
            console.error("Failed to save messages:", error);
          }
        }
      } catch (error) {
        console.error("Error sending message:", error);
        addMessage(
          "assistant",
          "Sorry, I encountered an error. Please try again."
        );
      }
    },
    [
      chatMessages,
      currentMode,
      currentConversationId,
      addMessage,
      saveMessage,
      refetchConversations,
    ]
  );

  const handleStartRecording = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      alert("Speech Recognition is not supported in this browser.");
      return;
    }

    setIsRecording(true);

    recognition.onstart = () => {
      console.log("Speech recognition started");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("Transcribed:", transcript);

      // Send the transcribed text to API
      sendMessageToAPI(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);

      // Handle specific errors
      if (event.error === "not-allowed") {
        alert(
          "Microphone access denied. Please allow microphone access and try again."
        );
      } else if (event.error === "no-speech") {
        console.log("No speech detected, stopping recording");
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    try {
      recognition.start();
    } catch (error) {
      console.error("Failed to start recognition:", error);
      setIsRecording(false);
    }
  }, [sendMessageToAPI]);

  const handleStopRecording = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.stop();
    }
    setIsRecording(false);
  }, []);

  const handleBackToScenarios = useCallback(() => {
    setActiveTab("scenarios");
  }, []);

  const handleToggleMode = useCallback(() => {
    setCurrentMode((prev) => (prev === "sales" ? "game" : "sales"));
  }, []);

  const sidebarTabs = [
    { id: "chat-history", label: "Chat History", icon: MessageSquare },
    { id: "evaluation", label: "Evaluation", icon: BarChart3 },
  ];

  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  return (
    <div className="flex bg-stone-50 text-gray-800 h-screen overflow-hidden">
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} style={{ display: "none" }} />

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar - Full Height */}
      <div
        className={clsx(
          "fixed lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-50",
          "w-72 sm:w-80 bg-white border-r border-gray-200 flex flex-col h-screen shadow-xl lg:shadow-md",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile Close Button */}
        <div className="lg:hidden flex justify-end p-3 border-b border-gray-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobileMenu}
            className="text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full p-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Header */}
        <div className="p-4 lg:p-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-orange-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center">
                <Store className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-base text-gray-800">
                Onboarding Assistant
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-500 hover:text-gray-800 hover:bg-white/60 p-2 rounded-full"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

          <div className="mb-4 text-sm text-gray-600 truncate bg-white/50 rounded-lg px-3 py-2">
            {user?.email}
          </div>

          {/* Navigation Tabs */}
          <div className="space-y-1">
            {sidebarTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    "w-full justify-start gap-3 text-sm py-3 rounded-lg transition-all duration-200",
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md hover:from-purple-600 hover:to-purple-700"
                      : "text-gray-600 hover:text-gray-800 hover:bg-white/60"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <ScrollArea className="flex-1 p-4 lg:p-5">
          {activeTab === "chat-history" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 mb-4 text-lg">
                Recent Conversations
              </h3>
              <div className="space-y-3">

              </div>
            </div>
          )}

          {activeTab === "evaluation" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 mb-4 text-lg">
                Performance Dashboard
              </h3>
              <div className="space-y-4">
                <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      Sessions Completed
                    </span>
                    <span className="font-bold text-xl text-blue-600">12</span>
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      Average Score
                    </span>
                    <span className="font-bold text-xl text-green-600">
                      8.5/10
                    </span>
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      Time Practiced
                    </span>
                    <span className="font-bold text-xl text-purple-600">
                      4.2h
                    </span>
                  </div>
                </Card>
              </div>
            </div>
          )}

        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen bg-stone-50 relative">
        {/* Header */}
        <div className="h-16 px-4 lg:px-6 flex items-center justify-between flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              className="lg:hidden text-gray-500 hover:text-gray-800 hover:bg-gray-100 p-2 h-10 w-10 flex-shrink-0 rounded-full"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <ModelSelector
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="p-2 h-10 w-10 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 h-10 w-10 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full"
              onClick={() => setShowAuthModal(true)}
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Loading Conversation */}
        {isLoadingConversation && (
          <div className="p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800 flex-shrink-0">
            <p className="text-sm">Loading conversation...</p>
          </div>
        )}

        {/* Chat Content */}
        <div className="flex-1 flex flex-col min-h-0 pb-32 overflow-hidden">
          {/* Gradient Orb */}
          <GradientOrb isSpeaking={isPlayingAudio} isLoading={isLoading} />

          {/* Chat Messages */}
          <ScrollArea className="flex-1 px-4 lg:px-6">
            <div className="max-w-4xl max-h-[200px] overflow-y-auto mx-auto scrollbar-hide">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <h2 className="text-xl font-semibold mb-3 text-gray-700">
                    Ready for your{" "}
                    {currentMode === "sales"
                      ? "onboarding process"
                      : "onboarding process"}
                    ?
                  </h2>
                  <p className="text-sm  text-gray-600 max-w-md mx-auto">
                    Press and hold the microphone button below to start speaking
                    with your AI Onboarding assistant.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {chatMessages.map((message, index) => (
                    <MessageBubble
                      key={message.id || index}
                      message={message}
                      isUser={message.role === "user"}
                    />
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 max-w-xs shadow-sm">
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                            <div
                              className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">
                            Thinking...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Push-to-Talk Control Bar */}
        <div>
          <div className="fixed inset-x-0 bottom-[50px] flex justify-center lg:justify-start lg:pl-[52%]">
            <PushToTalkBar
              isRecording={isRecording}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onBack={handleBackToScenarios}
              currentMode={currentMode}
              onToggleMode={handleToggleMode}
              showModeIndicator={false}
            />
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}