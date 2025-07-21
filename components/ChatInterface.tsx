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

  const recognitionRef = useRef<any>(null);

  const memoizedHandleInputChange = useCallback(handleInputChange, [
    handleInputChange,
  ]);

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

  return (
    <div className="flex bg-slate-950 text-white overflow-hidden h-full">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar - Made narrower on mobile */}
      <div
        className={`
        fixed lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-50
        w-72 sm:w-80 bg-slate-900 border-r border-gray-700 flex flex-col full-height
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        {/* Mobile Close Button */}
        <div className="lg:hidden flex justify-end p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMobileMenu}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Header - Reduced padding on mobile */}
        <div className="p-3 lg:p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 lg:w-5 lg:h-5 text-purple-400" />
              <span className="font-semibold text-sm lg:text-base">
                Outlet Assistant
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-400 hover:text-white p-1"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3 lg:w-4 lg:h-4" />
            </Button>
          </div>

          {/* User Info - Hidden on small screens */}
          <div className="mb-3 lg:mb-4 text-sm text-gray-400 truncate">
            {user?.email}
          </div>

          {/* Search - Simplified on mobile */}
          <div className="relative">
            <Search className="w-4 h-4 lg:w-4 lg:h-4 absolute left-2 lg:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search..."
              className="pl-8 lg:pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 text-sm lg:text-sm h-10 lg:h-10"
            />
          </div>
        </div>

        {/* Chat History - More compact */}
        <ScrollArea className="flex-1 p-2 lg:p-4">
          <div className="space-y-1 lg:space-y-2">
            <div className="text-xs lg:text-sm text-gray-400 mb-2 px-1">
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
                    ? "bg-purple-600"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
                onClick={() => selectConversation(conversation)}
              >
                <div className="truncate overflow-hidden text-ellipsis whitespace-nowrap w-64 text-sm lg:text-sm font-medium pr-5">
                  {conversation.title}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(conversation.updated_at).toLocaleDateString()}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-1 lg:top-2 right-1 lg:right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-5 w-5 lg:h-6 lg:w-6 text-gray-400 hover:text-red-400"
                  onClick={(e) => handleDeleteConversation(conversation.id, e)}
                >
                  <Trash2 className="w-2 h-2 lg:w-3 lg:h-3" />
                </Button>
              </div>
            ))}
            {conversations.length === 0 && !conversationsLoading && (
              <div className="text-xs lg:text-sm text-gray-500 text-center py-4">
                No conversations yet
              </div>
            )}
          </div>
        </ScrollArea>

        {/* New Chat Button */}
        <div className="p-3 lg:p-4 border-t border-gray-700">
          <Button
            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs lg:text-sm h-8 lg:h-10"
            onClick={startNewConversation}
          >
            <Plus className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Main Chat Area - FIXED: Better height management on mobile */}
      <div className="flex-1 flex flex-col min-w-0 full-height">
        {/* Header - Reduced height and simplified */}
        <div className="h-12 lg:h-16 px-3 lg:px-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              className="lg:hidden text-gray-400 hover:text-white p-1 h-8 w-8 flex-shrink-0"
            >
              <Menu className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-1 lg:gap-2 min-w-0">
              <span className="text-xs lg:text-sm text-gray-400 hidden md:inline truncate">
                Ice Cream Outlet Assistant
              </span>
              <span className="text-xs bg-purple-600 px-1 lg:px-2 py-0.5 lg:py-1 rounded font-medium flex-shrink-0">
                AI
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="p-1 lg:p-2 h-8 w-8 lg:h-10 lg:w-10"
            >
              <Settings className="w-3 h-3 lg:w-4 lg:h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 lg:p-2 h-8 w-8 lg:h-10 lg:w-10"
              onClick={() => setShowAuthModal(true)}
            >
              <User className="w-3 h-3 lg:w-4 lg:h-4" />
            </Button>
          </div>
        </div>

        {/* Error Display - More compact */}
        {error && (
          <div className="p-2 lg:p-4 bg-red-900/50 border-l-4 border-red-500 text-red-100 flex-shrink-0">
            <p className="font-semibold text-xs lg:text-sm">Error:</p>
            <p className="text-xs lg:text-sm">{error.message}</p>
          </div>
        )}

        {/* Loading Conversation - More compact */}
        {isLoadingConversation && (
          <div className="p-2 lg:p-4 bg-blue-900/50 border-l-4 border-blue-500 text-blue-100 flex-shrink-0">
            <p className="text-xs lg:text-sm">Loading conversation...</p>
          </div>
        )}

        {/* Chat Messages - FIXED: Proper flex and overflow handling for mobile */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full flex flex-col p-2 lg:p-4">
            {messages.length === 0 && !isLoadingConversation ? (
              <div className="flex flex-col items-center justify-center min-h-full max-w-4xl mx-auto px-2 lg:px-4 py-4">
                <div className="w-10 h-10 lg:w-16 lg:h-16 bg-purple-600 rounded-full flex items-center justify-center mb-3 lg:mb-6">
                  <Bot className="w-5 h-5 lg:w-8 lg:h-8 text-white" />
                </div>

                <h1 className="text-lg lg:text-3xl font-semibold mb-2 text-center leading-tight">
                  How can I help with your outlet approach today?
                </h1>
                <p className="text-gray-400 text-center mb-4 lg:mb-8 max-w-2xl text-sm lg:text-base leading-relaxed">
                  I'm here to assist you with any queries related to approaching
                  outlets, understanding competitive advantages, and
                  strategizing your pitch — all in your preferred language.
                </p>

                {/* Suggestion Cards - More compact on mobile */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-4 mb-4 lg:mb-8 w-full max-w-4xl">
                  {suggestionCards.map((card, index) => {
                    const IconComponent = card.icon;
                    return (
                      <Card
                        key={index}
                        className="p-3 lg:p-5 bg-gray-800 border-gray-700 hover:bg-gray-750 cursor-pointer transition-colors group"
                        onClick={() =>
                          handleSuggestionClick(
                            `Help me with ${card.title.toLowerCase()} ${card.subtitle.toLowerCase()}`
                          )
                        }
                      >
                        <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
                          <div className="w-6 h-6 lg:w-8 lg:h-8 bg-purple-600 rounded-lg flex items-center justify-center group-hover:bg-purple-500 transition-colors flex-shrink-0">
                            <IconComponent className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-white text-sm lg:text-base">
                              {card.title}
                            </h3>
                            <p className="text-xs lg:text-sm text-purple-400">
                              {card.subtitle}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs lg:text-sm text-gray-400 leading-relaxed">
                          {card.description}
                        </p>
                      </Card>
                    );
                  })}
                </div>

                {/* Call to Action - Hidden on mobile to save space */}
                <div className="text-center max-w-2xl hidden lg:block">
                  <p className="text-sm lg:text-base text-gray-300 mb-2 font-medium">
                    Ready to expand your ice cream distribution?
                  </p>
                  <p className="text-xs lg:text-sm text-gray-400">
                    Ask anything about outlet approach, compare with competitor
                    offerings, or get guidance on your store visits.
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-3 lg:space-y-6 pb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 lg:gap-4 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-6 h-6 lg:w-8 lg:h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] lg:max-w-2xl p-2 lg:p-4 rounded-lg ${
                        message.role === "user"
                          ? "bg-purple-600 text-white ml-6 lg:ml-12"
                          : "bg-gray-800 text-white"
                      }`}
                    >
                      <div className="prose prose-invert text-sm lg:text-base leading-relaxed max-w-none prose-p:my-1 lg:prose-p:my-2 prose-headings:my-1 lg:prose-headings:my-2">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                    {message.role === "user" && (
                      <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 lg:gap-4 justify-start">
                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Store className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                    </div>
                    <div className="max-w-2xl p-2 lg:p-4 rounded-lg bg-gray-800 text-white">
                      <div className="flex items-center gap-1 lg:gap-2">
                        <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-purple-400 rounded-full animate-pulse"></div>
                        <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-purple-400 rounded-full animate-pulse delay-100"></div>
                        <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-purple-400 rounded-full animate-pulse delay-200"></div>
                        <span className="text-xs lg:text-sm text-gray-400 ml-1 lg:ml-2">
                          Thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Input Area - FIXED: Better mobile spacing and positioning */}
        <div className="sticky bottom-4 p-2 lg:p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={onSubmit} className="relative">
              <div className="flex items-end gap-1 lg:gap-2 bg-gray-800 rounded-lg border border-gray-700 p-2 min-h-[44px] lg:min-h-[52px]">
                <textarea
                  value={input}
                  onChange={handleInputChange}
                  placeholder={placeholder}
                  className="w-full bg-transparent border-none outline-none focus:outline-none text-white placeholder-gray-400 focus:ring-0 text-sm lg:text-base p-1 lg:p-2 resize-none min-h-[28px] lg:min-h-[36px] max-h-[80px] lg:max-h-[160px] leading-tight overflow-y-auto"
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
                      "text-white px-2 py-1 lg:px-3 lg:py-2 relative overflow-hidden h-8 w-8 lg:h-10 lg:w-10 flex-shrink-0",
                      listening
                        ? "bg-red-600 hover:bg-red-700 animate-pulse-ring"
                        : "bg-purple-600 hover:bg-purple-700"
                    )}
                  >
                    {listening ? (
                      <MicOff className="w-3 h-3 lg:w-4 lg:h-4" />
                    ) : (
                      <Mic className="w-3 h-3 lg:w-4 lg:h-4" />
                    )}
                  </Button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 lg:px-3 lg:py-2 h-8 w-8 lg:h-10 lg:w-10 flex-shrink-0"
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
