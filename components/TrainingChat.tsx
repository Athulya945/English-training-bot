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
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations, type Conversation } from "@/hooks/useConversations";
import { AuthModal } from "@/components/AuthModal";
import { useModel } from "@/contexts/ModelContext";
import  ModelSelector  from "@/components/ModelSelector"

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
    api: "/api/chat",
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
  const [placeholder, setPlaceholder] = useState(
    "Ask about outlet strategy or pitch..."
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
        recog.lang = "en-US";

        recog.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          memoizedHandleInputChange({ target: { value: transcript } } as any);
        };

        recog.onend = () => {
          setListening(false);
          setPlaceholder("Ask about outlet strategy or pitch...");
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

  const suggestionCards = [
    {
      title: "Outlet Approach",
      subtitle: "Strategy",
      description:
        "Get guidance on approaching new retail outlets and building partnerships",
      icon: Store,
    },
    {
      title: "Competitive",
      subtitle: "Analysis",
      description:
        "Compare your offerings with competitors and identify advantages",
      icon: TrendingUp,
    },
    {
      title: "Pitch",
      subtitle: "Preparation",
      description:
        "Prepare compelling presentations for store managers and buyers",
      icon: Users,
    },
  ];

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      memoizedHandleInputChange({ target: { value: suggestion } } as any);
    },
    [memoizedHandleInputChange]
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
      setPlaceholder("Listening...");
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
                Training Assistant
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
            <ModelSelector selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
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
          
        </div>

        {/* Input Area - FIXED: Better mobile spacing and positioning */}
        <div className="sticky bottom-4 p-2 lg:p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={onSubmit} className="relative">
              <div className="flex items-center gap-1 lg:gap-2 bg-white rounded-full border border-gray-300 p-2 min-h-[44px] lg:min-h-[52px] shadow-[0_0_6px_2px_rgba(106,27,154,0.25)]">
                
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