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
  Bot,
  Mic,
  MicOff,
  LogOut,
  Trash2,
  ArrowLeft,
  RotateCcw,
  MessageSquare,
  BarChart3,
  FileText,
  GraduationCap,
  Briefcase,
  UserCog,
  Languages,
  TrendingUp,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations, type Conversation } from "@/hooks/useConversations";
import { AuthModal } from "@/components/AuthModal";
import LanguageSelector, { languageOptions } from "./LanguageSelector";

import { MessageBubble } from "./MessageBubble";
import { GradientOrb } from "./Gradientorb";
import { PushToTalkBar } from "@/components/PushToTalkBar";
import Scenarios from "@/utils/Scenarios.json";

// Type declarations for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ScenarioDetails {
  id: string;
  name: string;
  description: string;
  mode: string;
  prompt: string;
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

  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [activeTab, setActiveTab] = useState("scenarios");
  const [isRecording, setIsRecording] = useState(false);
  const [currentMode, setCurrentMode] = useState("conversation");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingMessage, setIsProcessingMessage] = useState(false);
  const [learnerType, setLearnerType] = useState("engineering");
  const [selectedLanguage, setSelectedLanguage] = useState("english");

  // Speech Recognition setup with language dependency
  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Stop after each recognition
      recognition.lang = selectedLanguage === "kannada" ? "kn-IN" : "en-IN";
      recognition.interimResults = false; // Only final results
      recognitionRef.current = recognition;
      console.log("Speech recognition language set to:", recognition.lang);
    }
  }, [selectedLanguage]);

  const loadedConversationRef = useRef(null);
  const currentConversationRef = useRef(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastProcessedMessageRef = useRef<string>("");

  useEffect(() => {
    currentConversationRef.current = currentConversationId;
  }, [currentConversationId]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);



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

  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [scenarioDetails, setScenarioDetails] = useState<ScenarioDetails | null>(null);

  const handleScenarioClick = (scenarioId: string) => {
    setActiveScenarioId(scenarioId);
    const found = Scenarios.find((s) => s.id === scenarioId);
    setScenarioDetails(found || null);
    setChatMessages([]);

    if (!found) {
      console.error("Scenario not found");
    }
  };

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

  const sendMessageToAPI = useCallback(
    async (text: string) => {
      // Prevent duplicate message processing
      if (isLoading) {
        console.log("Message already being processed, skipping duplicate");
        return;
      }
      
      // Update the last processed message reference
      lastProcessedMessageRef.current = text;
      
              try {
          setIsLoading(true);

        const messages = [
          ...chatMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          { role: "user", content: text },
        ];

        // Add user message to UI after creating the messages array
        addMessage("user", text);

        const currentLanguageOption = languageOptions.find((option: any) => option.id === selectedLanguage);
        
        const response = await fetch(currentLanguageOption?.voiceApiEndpoint || "/api/voicechat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages,
            scenario: scenarioDetails,
            userProfile: {
              background: learnerType,
              proficiency: "intermediate",
              goals: "improve English skills",
              accentPreference: "en-US"
            },
            userLanguage: selectedLanguage
          }),
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        setIsLoading(false);

        addMessage("assistant", data.text);

        const base64 = data.audio.split(",")[1] || data.audio;
        const audioBlob = new Blob(
          [Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))],
          { type: "audio/mpeg" }
        );
        const audioUrl = URL.createObjectURL(audioBlob);

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
         setIsLoading(false);
         
         let errorMessage = "Sorry, I encountered an error. Please try again.";
         
         if (error instanceof Error) {
           if (error.message.includes("API key")) {
             errorMessage = "API configuration error. Please check your environment variables.";
           } else if (error.message.includes("network")) {
             errorMessage = "Network error. Please check your internet connection.";
           } else if (error.message.includes("timeout")) {
             errorMessage = "Request timeout. Please try again.";
           }
         }
         
         addMessage("assistant", errorMessage);
       }
    },
    [chatMessages, currentConversationId, addMessage, saveMessage, refetchConversations, scenarioDetails, learnerType]
  );

  const handleStartRecording = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      alert("Speech Recognition not supported");
      return;
    }

    setIsRecording(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      sendMessageToAPI(transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
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
  const trainingModeList = ["conversation", "pronunciation", "grammar", "scenario"];

  const handleToggleMode = useCallback((mode?: string) => {
    const nextMode = mode
      ? mode
      : trainingModeList[
          (trainingModeList.indexOf(currentMode) + 1) % trainingModeList.length
        ];
    setCurrentMode(nextMode);
    setChatMessages([]);
  }, [currentMode]);
 

  // Localization helper
  const getText = (englishText: string, kannadaText: string) => {
    return selectedLanguage === "kannada" ? kannadaText : englishText;
  };

  const sidebarTabs = [
    { id: "scenarios", label: getText("Scenarios", "ಸನ್ನಿವೇಶಗಳು"), icon: FileText },
    { id: "dashboard", label: getText("Progress", "ಪ್ರಗತಿ"), icon: BarChart3 },
    //{ id: "chat-history", label: getText("History", "ಇತಿಹಾಸ"), icon: MessageSquare },
  ];

  const learnerTypes = [
    { id: "engineering", label: getText("Engineering", "ಎಂಜಿನಿಯರಿಂಗ್"), icon: UserCog },
    { id: "iti", label: getText("ITI/Diploma", "ಐಟಿಐ/ಡಿಪ್ಲೋಮಾ"), icon: GraduationCap },
    { id: "professional", label: getText("Professional", "ವೃತ್ತಿಪರ"), icon: Briefcase },
    { id: "business", label: getText("Business", "ವ್ಯಾಪಾರ"), icon: TrendingUp },
  ];

  const trainingModes = [
    { id: "conversation", label: getText("Conversation", "ಸಂಭಾಷಣೆ"), icon: MessageSquare },
    { id: "pronunciation", label: getText("Pronunciation", "ಉಚ್ಚಾರಣೆ"), icon: Mic },
    { id: "grammar", label: getText("Grammar", "ವ್ಯಾಕರಣ"), icon: Languages },
    { id: "scenario", label: getText("Scenarios", "ಸನ್ನಿವೇಶಗಳು"), icon: FileText },
  ];

  return (
    <div className="flex bg-stone-50 text-gray-800 h-screen overflow-hidden">
      <audio ref={audioRef} style={{ display: "none" }} />

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={toggleMobileMenu}
        />
      )}

      <div
        className={clsx(
          "fixed lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-50",
          "w-72 sm:w-80 bg-white border-r border-gray-200 flex flex-col h-screen shadow-xl lg:shadow-md",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
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

        <div className="p-4 lg:p-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                <Languages className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-base text-gray-800">
                {selectedLanguage === "kannada" ? "ಕನ್ನಡ-ಇಂಗ್ಲಿಷ್ ತರಬೇತಿ" : "English Trainer"}
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
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md hover:from-blue-600 hover:to-purple-700"
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

        <ScrollArea className="flex-1 p-4 lg:p-5">
          {activeTab === "scenarios" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 mb-2 text-lg">
                {getText("Learner Profile", "ಶಿಕ್ಷಣಾರ್ಥಿ ಪ್ರೊಫೈಲ್")}
              </h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {learnerTypes.map((type) => (
                  <Button
                    key={type.id}
                    variant={learnerType === type.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLearnerType(type.id)}
                    className={clsx(
                      "text-xs h-10",
                      learnerType === type.id
                        ? "bg-blue-500 text-white"
                        : "text-gray-600"
                    )}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>

              <h3 className="font-semibold text-gray-800 mb-2 text-lg">
                {getText("Training Mode", "ತರಬೇತಿ ವಿಧಾನ")}
              </h3>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {trainingModes.map((mode) => (
                  <Button
                    key={mode.id}
                    variant={currentMode === mode.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleMode(mode.id)}
                    className={clsx(
                      "text-xs h-10",
                      currentMode === mode.id
                        ? "bg-purple-500 text-white"
                        : "text-gray-600"
                    )}
                  >
                    {mode.label}
                  </Button>
                ))}
              </div>

              <h3 className="font-semibold text-gray-800 mb-4 text-lg">
                {currentMode === "conversation" && getText("Conversation Topics", "ಸಂಭಾಷಣೆ ವಿಷಯಗಳು")}
                {currentMode === "pronunciation" && getText("Pronunciation Drills", "ಉಚ್ಚಾರಣೆ ಅಭ್ಯಾಸಗಳು")}
                {currentMode === "grammar" && getText("Grammar Exercises", "ವ್ಯಾಕರಣ ವ್ಯಾಯಾಮಗಳು")}
                {currentMode === "scenario" && getText("Practice Scenarios", "ಅಭ್ಯಾಸ ಸನ್ನಿವೇಶಗಳು")}
              </h3>

              <div className="space-y-3">
                {currentMode === "conversation" && selectedLanguage === "kannada" && (
                  <>
                    <Card
                      onClick={() => handleScenarioClick("kannada-conversation")}
                      className={`p-4 cursor-pointer transition-all duration-200 border 
                        ${
                          activeScenarioId === "kannada-conversation"
                            ? "bg-gradient-to-r from-gray-100 to-blue-100 border-blue-300 shadow-md"
                            : "border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:border-blue-200 hover:shadow-md"
                        }
                      `}
                    >
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                        ಕನ್ನಡ-ಇಂಗ್ಲಿಷ್ ಸಂಭಾಷಣೆ
                      </h4>
                      <p className="text-xs text-gray-600">
                        {getText("Practice bilingual conversations", "ದ್ವಿಭಾಷಾ ಸಂಭಾಷಣೆಗಳನ್ನು ಅಭ್ಯಾಸ ಮಾಡಿ")}
                      </p>
                    </Card>
                    <Card
                      onClick={() => handleScenarioClick("kannada-vocabulary")}
                      className={`p-4 cursor-pointer transition-all duration-200 border 
                        ${
                          activeScenarioId === "kannada-vocabulary"
                            ? "bg-gradient-to-r from-gray-100 to-green-100 border-green-300 shadow-md"
                            : "border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-green-50 hover:border-green-200 hover:shadow-md"
                        }
                      `}
                    >
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                        ಪದಕೋಶ ನಿರ್ಮಾಣ
                      </h4>
                      <p className="text-xs text-gray-600">
                        {getText("Build vocabulary in both languages", "ಎರಡೂ ಭಾಷೆಗಳಲ್ಲಿ ಪದಕೋಶ ನಿರ್ಮಿಸಿ")}
                      </p>
                    </Card>
                  </>
                )}

                {currentMode === "conversation" && selectedLanguage === "english" && (
                  <>
                    <Card
                      onClick={() => handleScenarioClick("daily-life")}
                      className={`p-4 cursor-pointer transition-all duration-200 border 
                        ${
                          activeScenarioId === "daily-life"
                            ? "bg-gradient-to-r from-gray-100 to-blue-100 border-blue-300 shadow-md"
                            : "border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:border-blue-200 hover:shadow-md"
                        }
                      `}
                    >
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                        Daily Life Conversations
                      </h4>
                      <p className="text-xs text-gray-600">
                        Practice common everyday dialogues
                      </p>
                    </Card>
                    <Card
                      onClick={() => handleScenarioClick("hobbies")}
                      className={`p-4 cursor-pointer transition-all duration-200 border 
                        ${
                          activeScenarioId === "hobbies"
                            ? "bg-gradient-to-r from-gray-100 to-green-100 border-green-300 shadow-md"
                            : "border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-green-50 hover:border-green-200 hover:shadow-md"
                        }
                      `}
                    >
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                        Hobbies & Interests
                      </h4>
                      <p className="text-xs text-gray-600">
                        Talk about your favorite activities
                      </p>
                    </Card>
                  </>
                )}

                {currentMode === "pronunciation" && selectedLanguage === "kannada" && (
                  <>
                    <Card
                      onClick={() => handleScenarioClick("kannada-pronunciation")}
                      className={`p-4 cursor-pointer transition-all duration-200 border 
                        ${
                          activeScenarioId === "kannada-pronunciation"
                            ? "bg-gradient-to-r from-gray-100 to-purple-100 border-purple-300 shadow-md"
                            : "border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50 hover:border-purple-200 hover:shadow-md"
                        }
                      `}
                    >
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                        ಉಚ್ಚಾರಣೆ ಅಭ್ಯಾಸ
                      </h4>
                      <p className="text-xs text-gray-600">
                        Practice English pronunciation with Kannada guidance
                      </p>
                    </Card>
                  </>
                )}

                {currentMode === "pronunciation" && selectedLanguage === "english" && (
                  <>
                    <Card
                      onClick={() => handleScenarioClick("minimal-pairs")}
                      className={`p-4 cursor-pointer transition-all duration-200 border 
                        ${
                          activeScenarioId === "minimal-pairs"
                            ? "bg-gradient-to-r from-gray-100 to-purple-100 border-purple-300 shadow-md"
                            : "border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50 hover:border-purple-200 hover:shadow-md"
                        }
                      `}
                    >
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                        Minimal Pairs
                      </h4>
                      <p className="text-xs text-gray-600">
                        Practice similar sounding words
                      </p>
                    </Card>
                    <Card
                      onClick={() => handleScenarioClick("intonation")}
                      className={`p-4 cursor-pointer transition-all duration-200 border 
                        ${
                          activeScenarioId === "intonation"
                            ? "bg-gradient-to-r from-gray-100 to-orange-100 border-orange-300 shadow-md"
                            : "border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-orange-50 hover:border-orange-200 hover:shadow-md"
                        }
                      `}
                    >
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                        Intonation Practice
                      </h4>
                      <p className="text-xs text-gray-600">
                        Work on sentence rhythm and stress
                      </p>
                    </Card>
                  </>
                )}

                {currentMode === "grammar" && (
                  <>
                    <Card
                      onClick={() => handleScenarioClick("tenses")}
                      className={`p-4 cursor-pointer transition-all duration-200 border 
                        ${
                          activeScenarioId === "tenses"
                            ? "bg-gradient-to-r from-gray-100 to-red-100 border-red-300 shadow-md"
                            : "border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-red-50 hover:border-red-200 hover:shadow-md"
                        }
                      `}
                    >
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                        {getText("Verb Tenses", "ಕ್ರಿಯಾಪದ ಕಾಲಗಳು")}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {getText("Practice past, present and future forms", "ಭೂತ, ವರ್ತಮಾನ ಮತ್ತು ಭವಿಷ್ಯತ್ ರೂಪಗಳನ್ನು ಅಭ್ಯಾಸ ಮಾಡಿ")}
                      </p>
                    </Card>
                    <Card
                      onClick={() => handleScenarioClick("articles")}
                      className={`p-4 cursor-pointer transition-all duration-200 border 
                        ${
                          activeScenarioId === "articles"
                            ? "bg-gradient-to-r from-gray-100 to-indigo-100 border-indigo-300 shadow-md"
                            : "border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-indigo-50 hover:border-indigo-200 hover:shadow-md"
                        }
                      `}
                    >
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                        {getText("Articles (a/an/the)", "ಆರ್ಟಿಕಲ್ಸ್ (a/an/the)")}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {getText("Master proper article usage", "ಸರಿಯಾದ ಆರ್ಟಿಕಲ್ ಬಳಕೆಯನ್ನು ಕಲಿಯಿರಿ")}
                      </p>
                    </Card>
                  </>
                )}

                {currentMode === "scenario" && learnerType === "engineering" && (
                  <>
                    <Card
                      onClick={() => handleScenarioClick("tech-interview")}
                      className={`p-4 cursor-pointer transition-all duration-200 border 
                        ${
                          activeScenarioId === "tech-interview"
                            ? "bg-gradient-to-r from-gray-100 to-blue-100 border-blue-300 shadow-md"
                            : "border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:border-blue-200 hover:shadow-md"
                        }
                      `}
                    >
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                        {getText("Technical Interview", "ತಾಂತ್ರಿಕ ಸಂದರ್ಶನ")}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {getText("Practice answering technical questions", "ತಾಂತ್ರಿಕ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸುವ ಅಭ್ಯಾಸ")}
                      </p>
                    </Card>
                    <Card
                      onClick={() => handleScenarioClick("project-presentation")}
                      className={`p-4 cursor-pointer transition-all duration-200 border 
                        ${
                          activeScenarioId === "project-presentation"
                            ? "bg-gradient-to-r from-gray-100 to-green-100 border-green-300 shadow-md"
                            : "border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-green-50 hover:border-green-200 hover:shadow-md"
                        }
                      `}
                    >
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                        {getText("Project Presentation", "ಯೋಜನೆ ಪ್ರಸ್ತುತಿ")}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {getText("Practice explaining technical projects", "ತಾಂತ್ರಿಕ ಯೋಜನೆಗಳನ್ನು ವಿವರಿಸುವ ಅಭ್ಯಾಸ")}
                      </p>
                    </Card>
                  </>
                )}

                {currentMode === "scenario" && learnerType === "iti" && (
                  <>
                    <Card
                      onClick={() => handleScenarioClick("workshop")}
                      className={`p-4 cursor-pointer transition-all duration-200 border 
                        ${
                          activeScenarioId === "workshop"
                            ? "bg-gradient-to-r from-gray-100 to-orange-100 border-orange-300 shadow-md"
                            : "border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-orange-50 hover:border-orange-200 hover:shadow-md"
                        }
                      `}
                    >
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                        {getText("Workshop Communication", "ಕಾರ್ಯಾಗಾರ ಸಂವಹನ")}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {getText("Practice technical instructions", "ತಾಂತ್ರಿಕ ಸೂಚನೆಗಳನ್ನು ಅಭ್ಯಾಸ ಮಾಡಿ")}
                      </p>
                    </Card>
                    <Card
                      onClick={() => handleScenarioClick("tools")}
                      className={`p-4 cursor-pointer transition-all duration-200 border 
                        ${
                          activeScenarioId === "tools"
                            ? "bg-gradient-to-r from-gray-100 to-purple-100 border-purple-300 shadow-md"
                            : "border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50 hover:border-purple-200 hover:shadow-md"
                        }
                      `}
                    >
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                        Tools & Equipment
                      </h4>
                      <p className="text-xs text-gray-600">
                        Learn names of common tools
                      </p>
                    </Card>
                  </>
                )}

                {currentMode === "scenario" && learnerType === "professional" && (
                  <>
                    <Card
                      onClick={() => handleScenarioClick("meeting")}
                      className={`p-4 cursor-pointer transition-all duration-200 border 
                        ${
                          activeScenarioId === "meeting"
                            ? "bg-gradient-to-r from-gray-100 to-blue-100 border-blue-300 shadow-md"
                            : "border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:border-blue-200 hover:shadow-md"
                        }
                      `}
                    >
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                        {getText("Business Meeting", "ವ್ಯಾಪಾರ ಸಭೆ")}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {getText("Practice professional discussions", "ವೃತ್ತಿಪರ ಚರ್ಚೆಗಳನ್ನು ಅಭ್ಯಾಸ ಮಾಡಿ")}
                      </p>
                    </Card>
                    <Card
                      onClick={() => handleScenarioClick("presentation")}
                      className={`p-4 cursor-pointer transition-all duration-200 border 
                        ${
                          activeScenarioId === "presentation"
                            ? "bg-gradient-to-r from-gray-100 to-green-100 border-green-300 shadow-md"
                            : "border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-green-50 hover:border-green-200 hover:shadow-md"
                        }
                      `}
                    >
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                        {getText("Client Presentation", "ಗ್ರಾಹಕ ಪ್ರಸ್ತುತಿ")}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {getText("Practice pitching ideas professionally", "ಆಲೋಚನೆಗಳನ್ನು ವೃತ್ತಿಪರವಾಗಿ ಪ್ರಸ್ತುತಪಡಿಸುವ ಅಭ್ಯಾಸ")}
                      </p>
                    </Card>
                  </>
                )}

                {currentMode === "scenario" && learnerType === "business" && (
                  <>
                    <Card
                      onClick={() => handleScenarioClick("negotiation")}
                      className={`p-4 cursor-pointer transition-all duration-200 border 
                        ${
                          activeScenarioId === "negotiation"
                            ? "bg-gradient-to-r from-gray-100 to-purple-100 border-purple-300 shadow-md"
                            : "border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-purple-50 hover:border-purple-200 hover:shadow-md"
                        }
                      `}
                    >
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                        {getText("Business Negotiation", "ವ್ಯಾಪಾರ ಸಂಧಾನ")}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {getText("Practice deal-making conversations", "ಒಪ್ಪಂದ ಮಾಡುವ ಸಂಭಾಷಣೆಗಳನ್ನು ಅಭ್ಯಾಸ ಮಾಡಿ")}
                      </p>
                    </Card>
                    <Card
                      onClick={() => handleScenarioClick("email")}
                      className={`p-4 cursor-pointer transition-all duration-200 border 
                        ${
                          activeScenarioId === "email"
                            ? "bg-gradient-to-r from-gray-100 to-red-100 border-red-300 shadow-md"
                            : "border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-red-50 hover:border-red-200 hover:shadow-md"
                        }
                      `}
                    >
                      <h4 className="text-sm font-semibold text-gray-800 mb-1">
                        {getText("Email Writing", "ಇಮೇಲ್ ಬರವಣಿಗೆ")}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {getText("Practice professional email communication", "ವೃತ್ತಿಪರ ಇಮೇಲ್ ಸಂವಹನವನ್ನು ಅಭ್ಯಾಸ ಮಾಡಿ")}
                      </p>
                    </Card>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === "dashboard" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 mb-4 text-lg">
                {getText("Learning Progress", "ಕಲಿಕೆ ಪ್ರಗತಿ")}
              </h3>
              <div className="space-y-4">
                <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {getText("Sessions Completed", "ಪೂರ್ಣಗೊಂಡ ಅಧಿವೇಶನಗಳು")}
                    </span>
                    <span className="font-bold text-xl text-blue-600">24</span>
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      Pronunciation Score
                    </span>
                    <span className="font-bold text-xl text-green-600">
                      8.7/10
                    </span>
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      Grammar Accuracy
                    </span>
                    <span className="font-bold text-xl text-purple-600">
                      92%
                    </span>
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      Active Vocabulary
                    </span>
                    <span className="font-bold text-xl text-orange-600">
                      1,240 words
                    </span>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "chat-history" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 mb-4 text-lg">
                Practice History
              </h3>
              <div className="space-y-3">
                <Card className="p-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 border border-gray-200 hover:shadow-md">
                  <h4 className="text-sm font-semibold text-gray-800 mb-1">
                    Technical Interview Practice
                  </h4>
                  <p className="text-xs text-gray-500">
                    2 days ago • 18 messages
                  </p>
                </Card>
                <Card className="p-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 border border-gray-200 hover:shadow-md">
                  <h4 className="text-sm font-semibold text-gray-800 mb-1">
                    Pronunciation Drill
                  </h4>
                  <p className="text-xs text-gray-500">
                    1 week ago • 32 exercises
                  </p>
                </Card>
                <Card className="p-4 hover:bg-gray-50 cursor-pointer transition-all duration-200 border border-gray-200 hover:shadow-md">
                  <h4 className="text-sm font-semibold text-gray-800 mb-1">
                    Business Email Writing
                  </h4>
                  <p className="text-xs text-gray-500">
                    2 weeks ago • 12 emails
                  </p>
                </Card>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-screen bg-stone-50 relative">
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

          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
              className="mr-2"
            />
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

        <div className="flex-1 flex flex-col min-h-0 pb-32 overflow-hidden">
          <GradientOrb isSpeaking={isPlayingAudio} isLoading={isLoading} />

          <ScrollArea className="flex-1 px-4 lg:px-6">
            <div className="max-w-4xl max-h-[200px] overflow-y-auto mx-auto scrollbar-hide">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <h2 className="text-xl font-semibold mb-3 text-gray-700">
                    {selectedLanguage === "kannada" ? (
                      <>
                        {currentMode === "conversation" && "ಸಂಭಾಷಣೆ ಪ್ರಾರಂಭಿಸಿ"}
                        {currentMode === "pronunciation" && "ಉಚ್ಚಾರಣೆ ಅಭ್ಯಾಸ ಪ್ರಾರಂಭಿಸಿ"}
                        {currentMode === "grammar" && "ವ್ಯಾಕರಣ ವ್ಯಾಯಾಮ ಪ್ರಯತ್ನಿಸಿ"}
                        {currentMode === "scenario" && "ಅಭ್ಯಾಸಕ್ಕಾಗಿ ಸನ್ನಿವೇಶವನ್ನು ಆಯ್ಕೆಮಾಡಿ"}
                      </>
                    ) : (
                      <>
                        {currentMode === "conversation" && "Start a conversation"}
                        {currentMode === "pronunciation" && "Begin pronunciation practice"}
                        {currentMode === "grammar" && "Try a grammar exercise"}
                        {currentMode === "scenario" && "Select a scenario to practice"}
                      </>
                    )}
                  </h2>
                  <p className="text-sm text-gray-600 max-w-md mx-auto">
                    {selectedLanguage === "kannada"
                      ? "ನಿಮ್ಮ ಇಂಗ್ಲಿಷ್ ತರಬೇತುದಾರರೊಂದಿಗೆ ಮಾತನಾಡಲು ಮೈಕ್ರೋಫೋನ್ ಬಟನ್ ಒತ್ತಿ ಹಿಡಿದಿರಿ."
                      : "Press and hold the microphone button to speak with your English trainer."
                    }
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
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                            <div
                              className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {getText("Thinking...", "ಯೋಚಿಸುತ್ತಿದ್ದೇನೆ...")}
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

        <div>
          <div className="fixed inset-x-0 bottom-[30px] flex justify-center lg:justify-start lg:pl-[52%]">
            <PushToTalkBar
              isRecording={isRecording}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onBack={handleBackToScenarios}
              currentMode={currentMode as "scenario" | "conversation" | "pronunciation" | "grammar"}
              onToggleMode={handleToggleMode}
              showModeIndicator={true}
              selectedLanguage={selectedLanguage}
            />
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}