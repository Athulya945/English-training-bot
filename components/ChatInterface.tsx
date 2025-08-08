"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  TrendingUp,
  Users,
  Bot,
  Mic,
  MicOff,
  LogOut,
  Trash2,
  GraduationCap,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations, type Conversation } from "@/hooks/useConversations";
import { AuthModal } from "@/components/AuthModal";
import { useModel } from "@/contexts/ModelContext";
import LanguageSelector, { languageOptions } from "@/components/LanguageSelector";
import { FeedbackModal } from "@/components/FeedbackModal";
//import  ModelSelector  from "@/components/ModelSelector"

export default function ChatInterface() {
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

  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

  // Add ref to track if we've loaded a conversation to prevent re-loading
  const loadedConversationRef = useRef<string | null>(null);

  const currentConversationRef = useRef<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Update the ref whenever conversation changes
  useEffect(() => {
    currentConversationRef.current = currentConversationId;
  }, [currentConversationId]);

  // Get the current language option
  const currentLanguageOption = languageOptions.find(option => option.id === selectedLanguage);

  // Custom chat hook with conversation management
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
  } = useChat({
    api: currentLanguageOption?.apiEndpoint || "/api/chat",
    onError: (error) => {
      console.error("Chat error:", error);
    },
    onFinish: async (message) => {
      console.log("onFinish called with message:", message);
      console.log("Current conversation ref:", currentConversationRef.current);
      console.log("Current conversation state:", currentConversationId);

      // Use ref instead of state to get the most up-to-date conversation ID
      const conversationId = currentConversationRef.current;

      if (conversationId && message.role === "assistant") {
        try {
          await saveMessage(conversationId, "assistant", message.content);
          console.log("Assistant message saved to DB");
          refetchConversations();
        } catch (error) {
          console.error("Failed to save assistant message:", error);
        }
      } else {
        console.log(
          "Skipping save - conversationId:",
          conversationId,
          "role:",
          message.role
        );
      }
    },
  });

  const [listening, setListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [placeholder, setPlaceholder] = useState(
    "Ask about English..."
  );
  const { selectedModel, setSelectedModel } = useModel();

  const recognitionRef = useRef<any>(null);

  const memoizedHandleInputChange = useCallback(handleInputChange, [
    handleInputChange,
  ]);

  useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const setAppHeight = () => {
      document.documentElement.style.setProperty(
        "--app-height",
        `${window.innerHeight}px`
      );
    };

    setAppHeight();
    window.addEventListener("resize", setAppHeight);

    return () => {
      window.removeEventListener("resize", setAppHeight);
    };
  }, []);

  // Speech recognition setup
  useEffect(() => {
    if (typeof window !== "undefined" && !recognitionRef.current) {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = false;
        recog.lang = selectedLanguage === "kannada" ? "kn-IN" : "en-US";

        recog.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          memoizedHandleInputChange({ target: { value: transcript } } as any);
        };

        recog.onend = () => {
          setListening(false);
          setPlaceholder(selectedLanguage === "kannada" 
            ? "ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ..." 
            : "Ask about English..."
          );
        };

        recognitionRef.current = recog;
        setRecognition(recog);
      }
    }
  }, [memoizedHandleInputChange]);

  // FIXED: Load conversation messages when conversation changes
  useEffect(() => {
    const loadConversationMessages = async () => {
      // Only load if conversation ID changed and we're not already loading
      if (
        currentConversationId &&
        loadedConversationRef.current !== currentConversationId
      ) {
        console.log(
          "Loading conversation messages for:",
          currentConversationId
        );
        setIsLoadingConversation(true);
        loadedConversationRef.current = currentConversationId; // Mark as loading

        try {
          const dbMessages = await getMessages(currentConversationId);
          // Convert database messages to chat format
          const chatMessages = dbMessages.map((msg) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            createdAt: new Date(msg.created_at),
          }));
          console.log("Loaded messages:", chatMessages);
          setMessages(chatMessages);
        } catch (error) {
          console.error("Failed to load conversation messages:", error);
          // Reset the ref on error so we can retry
          loadedConversationRef.current = null;
        } finally {
          setIsLoadingConversation(false);
        }
      } else if (
        !currentConversationId &&
        loadedConversationRef.current !== null
      ) {
        // Clear messages when no conversation is selected
        setMessages([]);
        loadedConversationRef.current = null;
      }
    };

    loadConversationMessages();
  }, [currentConversationId, getMessages, setMessages]); // REMOVED isLoading from dependencies

  const suggestionCards = selectedLanguage === "kannada" ? [
    {
      title: "ಕನ್ನಡ-ಇಂಗ್ಲಿಷ್ ಸಂಭಾಷಣೆ",
      subtitle: "Bilingual",
      description:
        "ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ, ಇಂಗ್ಲಿಷ್ ಕಲಿಯಿರಿ", 
      icon: GraduationCap,
    },
    {
      title: "ಉಚ್ಚಾರಣೆ ಅಭ್ಯಾಸ",
      subtitle: "Pronunciation",
      description:
        "ಇಂಗ್ಲಿಷ್ ಉಚ್ಚಾರಣೆಯನ್ನು ಸುಧಾರಿಸಿ", 
      icon: BookOpen,
    },
    {
      title: "ವ್ಯಾಕರಣ ಕಲಿಕೆ",
      subtitle: "Grammar",
      description:
        "ಇಂಗ್ಲಿಷ್ ವ್ಯಾಕರಣವನ್ನು ಕಲಿಯಿರಿ", 
      icon: HelpCircle,
    },
  ] : [
    {
      title: "Interview Preparation",
      subtitle: "Training",
      description:
        "Get guidance on interview preparation and building partnerships", 
      icon: GraduationCap,
    },
    {
      title: "English Training",
      subtitle: "Training",
      description:
        "Get guidance on English training and build confidence in your speaking skills", 
      icon: BookOpen,
    },
    {
      title: "Quiz",
      subtitle: "Training",
      description:
        "Let's get know how much you know about English", 
      icon: HelpCircle,
    },
  ];

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      const languageSpecificSuggestion = selectedLanguage === "kannada" 
        ? "ನನ್ನೊಂದಿಗೆ ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ ಮತ್ತು ಇಂಗ್ಲಿಷ್ ಕಲಿಯಿರಿ"
        : suggestion;
      memoizedHandleInputChange({ target: { value: languageSpecificSuggestion } } as any);
    },
    [memoizedHandleInputChange, selectedLanguage]
  );

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!input.trim() || isLoading || !user) return;

      console.log("Form submitted with input:", input);

      // Create new conversation if none exists
      let conversationId = currentConversationId;
      if (!conversationId) {
        console.log("Creating new conversation...");
        const newConversation = await createConversation(
          input.length > 50 ? input.substring(0, 50) + "..." : input
        );
        if (newConversation) {
          conversationId = newConversation.id;
          setCurrentConversationId(conversationId);
          // Update the ref to prevent reloading
          loadedConversationRef.current = conversationId;
          console.log("New conversation created:", conversationId);
        } else {
          console.error("Failed to create conversation");
          return;
        }
      }

      // Save user message to database
      if (conversationId) {
        try {
          await saveMessage(conversationId, "user", input);
          console.log("User message saved to DB");
          refetchConversations(); // Update conversation list
        } catch (error) {
          console.error("Failed to save user message:", error);
        }
      }

      try {
        await handleSubmit(e);
        console.log("handleSubmit completed");
      } catch (error) {
        console.error("Submit error:", error);
      }
    },
    [
      input,
      isLoading,
      user,
      currentConversationId,
      createConversation,
      saveMessage,
      refetchConversations,
      handleSubmit,
    ]
  );

  const toggleSpeechRecognition = useCallback(() => {
    if (!recognition) return;

    if (listening) {
      recognition.stop();
      setListening(false);
      setPlaceholder("Ask about outlet strategy or pitch...");
    } else {
      recognition.start();
      setListening(true);
      setPlaceholder(selectedLanguage === "kannada" ? "ಕೇಳುತ್ತಿದ್ದೇನೆ..." : "Listening...");
    }
  }, [recognition, listening]);

  const handleTextareaResize = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      const target = e.target as HTMLTextAreaElement;
      target.style.height = "auto";
      target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (input.trim() && !isLoading) {
          onSubmit(e as any);
        }
      }
    },
    [input, isLoading, onSubmit]
  );

  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
    loadedConversationRef.current = null; // Reset the ref
    setIsMobileMenuOpen(false);
  }, [setMessages]);

  const selectConversation = useCallback(
    (conversation: Conversation) => {
      if (conversation.id !== currentConversationId) {
        setCurrentConversationId(conversation.id);
        // Don't reset loadedConversationRef here - let useEffect handle the loading
        setIsMobileMenuOpen(false);
      }
    },
    [currentConversationId]
  );

  const handleDeleteConversation = useCallback(
    async (conversationId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm("Are you sure you want to delete this conversation?")) {
        await deleteConversation(conversationId);
        if (currentConversationId === conversationId) {
          startNewConversation();
        }
      }
    },
    [deleteConversation, currentConversationId, startNewConversation]
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    setCurrentConversationId(null);
    setMessages([]);
    loadedConversationRef.current = null; // Reset the ref
  }, [signOut, setMessages]);

  // Debug logging
  useEffect(() => {
    console.log("Current messages:", messages);
    console.log("Current conversation ID:", currentConversationId);
    console.log("Is loading:", isLoading);
    console.log("Is loading conversation:", isLoadingConversation);
    console.log("Loaded conversation ref:", loadedConversationRef.current);
  }, [messages, currentConversationId, isLoading, isLoadingConversation]);

  const modelOptions = [
    { value: 'query', label: 'Query AI' },
    { value: 'training', label: 'Training AI' },
  ];

  return (
    <div className="flex bg-stone-50 text-gray-800 overflow-hidden h-full">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 lg:hidden"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar - Made narrower on mobile */}
      <div
        className={`
        fixed lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-50
        w-72 sm:w-80 bg-white border-r border-gray-200 flex flex-col full-height shadow-md
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        {/* Mobile Close Button */}
        <div className="lg:hidden flex justify-end p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobileMenu}
            className="text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Header - Reduced padding on mobile */}
        <div className="p-3 lg:p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 lg:w-5 lg:h-5 text-purple-700" />
              <span className="font-semibold text-sm lg:text-base text-gray-800">
                {selectedLanguage === "kannada" ? "ಕನ್ನಡ-ಇಂಗ್ಲಿಷ್ ತರಬೇತಿ" : "English Training Bot"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-500 hover:text-gray-800 hover:bg-gray-100 p-1"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3 lg:w-4 lg:h-4" />
            </Button>
          </div>

          {/* User Info - Hidden on small screens */}
          <div className="mb-3 lg:mb-4 text-sm text-gray-600 truncate">
            {user?.email}
          </div>

          {/* Search - Simplified on mobile */}
          <div className="relative">
            <Search className="w-4 h-4 lg:w-4 lg:h-4 absolute left-2 lg:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search..."
              className="pl-8 lg:pl-10 bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 text-sm lg:text-sm h-10 lg:h-10 focus:border-purple-700 focus:ring-purple-700"
            />
          </div>
        </div>

        {/* Chat History - More compact */}
        <ScrollArea className="flex-1 p-2 lg:p-4">
          <div className="space-y-1 lg:space-y-2">
            <div className="text-xs lg:text-sm text-gray-500 mb-2 px-1">
              Recent
              {conversationsLoading && (
                <span className="ml-1 text-xs">(Loading...)</span>
              )}
            </div>
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group p-3 lg:p-3 rounded-lg cursor-pointer transition-colors relative ${
                  currentConversationId === conversation.id
                    ? "bg-purple-700 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                }`}
                onClick={() => selectConversation(conversation)}
              >
                <div className="truncate overflow-hidden text-ellipsis whitespace-nowrap w-60 text-sm lg:text-sm font-medium pr-5">
                  {conversation.title}
                </div>
                <div className={`text-xs mt-1 ${
                  currentConversationId === conversation.id
                    ? "text-purple-200"
                    : "text-gray-500"
                }`}>
                  {new Date(conversation.updated_at).toLocaleDateString()}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`absolute top-3 lg:top-2 right-1 lg:right-2 p-1 h-5 w-5 lg:h-6 lg:w-6
                    transition-opacity
                    ${
                      currentConversationId === conversation.id
                        ? "opacity-100 text-purple-200 hover:text-red-300"
                        : "opacity-0 lg:group-hover:opacity-100 text-gray-400"
                    }
                    hover:text-red-600`}
                  onClick={(e) => handleDeleteConversation(conversation.id, e)}
                >
                  <Trash2 className="w-2 h-2 lg:w-3 lg:h-3" />
                </Button>
              </div>
                            ))}
            {conversations.length === 0 && !conversationsLoading && (
              <div className="text-xs lg:text-sm text-gray-400 text-center py-4">
                No conversations yet
              </div>
            )}
          </div>
        </ScrollArea>

        {/* New Chat Button */}
        <div className="p-3 lg:p-4 border-t border-gray-200">
          <Button
            className="w-full bg-purple-700 hover:bg-purple-800 text-white text-xs lg:text-sm h-8 lg:h-10 shadow-sm"
            onClick={startNewConversation}
          >
            <Plus className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Main Chat Area - FIXED: Better height management on mobile */}
      <div className="flex-1 flex flex-col min-w-0 full-height bg-stone-50">
        {/* Header - Reduced height and simplified */}
        <div className="h-12 lg:h-16 px-3 lg:px-4 flex items-center justify-between flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              className="lg:hidden text-gray-500 hover:text-gray-800 hover:bg-gray-100 p-1 h-8 w-8 flex-shrink-0"
            >
              <Menu className="w-4 h-4" />
            </Button>
            {/* TODO: Fix - ModelSelector is not defined or imported */}
            {/* <ModelSelector selectedModel={selectedModel} setSelectedModel={setSelectedModel} /> */}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <LanguageSelector
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
              className="mr-2"
            />
            <Button
              variant="ghost"
              size="sm"
              className="p-1 lg:p-2 h-8 w-8 lg:h-10 lg:w-10 text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            >
              <Settings className="w-3 h-3 lg:w-4 lg:h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 lg:p-2 h-8 w-8 lg:h-10 lg:w-10 text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              onClick={() => setShowAuthModal(true)}
            >
              <User className="w-3 h-3 lg:w-4 lg:h-4" />
            </Button>
          </div>
        </div>

        {/* Error Display - More compact */}
        {error && (
          <div className="p-2 lg:p-4 bg-red-50 border-l-4 border-red-400 text-red-800 flex-shrink-0">
            <p className="font-semibold text-xs lg:text-sm">Error:</p>
            <p className="text-xs lg:text-sm">{error.message}</p>
          </div>
        )}

        {/* Loading Conversation - More compact */}
        {isLoadingConversation && (
          <div className="p-2 lg:p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800 flex-shrink-0">
            <p className="text-xs lg:text-sm">Loading conversation...</p>
          </div>
        )}

        {/* Chat Messages - FIXED: Proper flex and overflow handling for mobile */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full flex flex-col p-2 lg:p-4">
            {messages.length === 0 && !isLoadingConversation ? (
              <div className="flex flex-col items-center justify-center min-h-full max-w-4xl mx-auto px-2 lg:px-4 py-4">
                <div className="w-10 h-10 lg:w-16 lg:h-16 bg-purple-700 rounded-full flex items-center justify-center mb-3 lg:mb-6 shadow-md">
                  <Bot className="w-5 h-5 lg:w-8 lg:h-8 text-white" />
                </div>

                <h1 className="text-lg lg:text-3xl font-semibold mb-2 text-center leading-tight text-gray-800">
                  {selectedLanguage === "kannada" 
                    ? "ನಾನು ನಿಮಗೆ ಇಂಗ್ಲಿಷ್ ಕಲಿಸಲು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?"
                    : "How can I help you with your English today?"
                  }
                </h1>
                <p className="text-gray-600 text-center mb-4 lg:mb-8 max-w-2xl text-sm lg:text-base leading-relaxed">
                  {selectedLanguage === "kannada"
                    ? "ನಾನು ನಿಮಗೆ ಇಂಗ್ಲಿಷ್ ಕಲಿಸಲು ಮತ್ತು ಇಂಗ್ಲಿಷ್ ಸಂಬಂಧಿತ ಯಾವುದೇ ಪ್ರಶ್ನೆಗಳಿಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ."
                    : "I'm here to train you in English and help you with any queries related to English."
                  }
                </p>

                {/* Suggestion Cards - More compact on mobile */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-4 mb-4 lg:mb-8 w-full max-w-4xl">
                  {suggestionCards.map((card, index) => {
                    const IconComponent = card.icon;
                    return (
                      <Card
                        key={index}
                        className="p-3 lg:p-5 bg-white border-gray-200 hover:bg-gray-50 cursor-pointer transition-all duration-300 group shadow-sm hover:shadow-[0_0_6px_2px_rgba(106,27,154,0.25)]  hover:scale-105"
                        onClick={() =>
                          handleSuggestionClick(
                            `Help me with ${card.title.toLowerCase()} ${card.subtitle.toLowerCase()}`
                          )
                        }
                      >
                        <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
                          <div className="w-6 h-6 lg:w-8 lg:h-8 bg-purple-700 rounded-lg flex items-center justify-center group-hover:bg-purple-800 transition-colors flex-shrink-0 shadow-sm">
                            <IconComponent className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-gray-800 text-sm lg:text-base">
                              {card.title}
                            </h3>
                            <p className="text-xs lg:text-sm text-purple-700">
                              {card.subtitle}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs lg:text-sm text-gray-600 leading-relaxed">
                          {card.description}
                        </p>
                      </Card>
                    );
                  })}
                </div>

                {/* Call to Action - Hidden on mobile to save space */}
                <div className="text-center max-w-2xl hidden lg:block">
                  <p className="text-sm lg:text-base text-gray-700 mb-2 font-medium">
                    {selectedLanguage === "kannada"
                      ? "ಇಂಗ್ಲಿಷ್ ಕಲಿಯಲು ಸಿದ್ಧರಿದ್ದೀರಾ?"
                      : "Ready to improve your English?"
                    }
                  </p>
                  <p className="text-xs lg:text-sm text-gray-600">
                    {selectedLanguage === "kannada"
                      ? "ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ, ಇಂಗ್ಲಿಷ್ ಕಲಿಯಿರಿ. ಯಾವುದೇ ಪ್ರಶ್ನೆ ಕೇಳಿ."
                      : "Ask anything about English learning, pronunciation, grammar, or conversation practice."
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-3 lg:space-y-6 pb-4">
                {messages.map((message,index) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 lg:gap-4 fade-in-up ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-6 h-6 lg:w-8 lg:h-8 bg-purple-700 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Bot className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] lg:max-w-2xl p-2 lg:p-4 rounded-lg shadow-sm ${
                        message.role === "user"
                          ? "bg-purple-700 text-white ml-6 lg:ml-12"
                          : "bg-white text-gray-800 border border-gray-200"
                      }`}
                    >
                      <div
                        className={`prose text-sm lg:text-base leading-relaxed max-w-none prose-p:my-1 lg:prose-p:my-2 prose-headings:my-1 lg:prose-headings:my-2 ${
                          message.role === "user" ? "text-gray-50" : "prose-gray"
                        }`}
                      >
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                    {message.role === "user" && (
                      <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                        <User className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 lg:gap-4 justify-start">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-purple-700 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Bot className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                    </div>
                    <div className="max-w-2xl p-2 lg:p-4 rounded-lg bg-white text-gray-800 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-1 lg:gap-2">
                        <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-purple-700 rounded-full animate-bounce-dot"></div>
                        <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-purple-700 rounded-full animate-bounce-dot ml-1"></div>
                        <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-purple-700 rounded-full animate-bounce-dot ml-1"></div>
                        <span className="text-xs lg:text-sm text-gray-600 ml-2">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Input Area - FIXED: Better mobile spacing and positioning */}
        <div className="sticky bottom-4 p-2 lg:p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={onSubmit} className="relative">
              <div className="flex items-center gap-1 lg:gap-2 bg-white rounded-full border border-gray-300 p-2 min-h-[44px] lg:min-h-[52px] shadow-[0_0_6px_2px_rgba(106,27,154,0.25)]">
                <textarea
                    value={input}
                    onChange={handleInputChange}
                    placeholder={placeholder}
                    className="w-full bg-transparent border-none outline-none focus:outline-none text-gray-800 placeholder-gray-500 focus:ring-0 text-sm lg:text-base p-1 lg:p-2 resize-none min-h-[28px] lg:min-h-[36px] max-h-[80px] lg:max-h-[160px] leading-[28px] lg:leading-[36px] overflow-y-auto"
                    rows={1}
                    disabled={isLoading}
                    onInput={handleTextareaResize}
                    onKeyDown={handleKeyDown}
                  />
                {recognition && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={toggleSpeechRecognition}
                    className={clsx(
                      "text-white px-2 py-1 lg:px-3 lg:py-2 relative overflow-hidden h-8 w-8 lg:h-10 lg:w-10 flex-shrink-0 shadow-sm rounded-full",
                      listening
                        ? "bg-red-600 hover:bg-red-700 animate-pulse-ring"
                        : "bg-purple-700 hover:bg-purple-800"
                    )}
                  >
                    {listening ? (
                      <MicOff className="w-3 h-3 lg:w-3 lg:h-3" />
                    ) : (
                      <Mic className="w-3 h-3 lg:w-3 lg:h-3" />
                    )}
                  </Button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  className="bg-purple-700 hover:bg-purple-800 text-white px-2 py-1 lg:px-3 lg:py-2 h-8 w-8 lg:h-10 lg:w-10 flex-shrink-0 shadow-sm rounded-full"
                  disabled={isLoading || !input.trim()}
                >
                  <Send className="w-3 h-3 lg:w-4 lg:h-4" />
                </Button>
              </div>
            </form>
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