"use client"

import { useChat } from "@ai-sdk/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Send, Search, Settings, User, Menu, X, Store, TrendingUp, Users } from "lucide-react"

export default function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [chatHistory] = useState([
    { id: 1, title: "Retail Chain Approach", active: false },
    { id: 2, title: "Competitor Analysis", active: false },
    { id: 3, title: "Pricing Strategy", active: false },
    { id: 4, title: "Store Visit Planning", active: false },
  ])

  const suggestionCards = [
    {
      title: "Outlet Approach",
      subtitle: "Strategy",
      description: "Get guidance on approaching new retail outlets and building partnerships",
      icon: Store,
    },
    {
      title: "Competitive",
      subtitle: "Analysis",
      description: "Compare your offerings with competitors and identify advantages",
      icon: TrendingUp,
    },
    {
      title: "Pitch",
      subtitle: "Preparation",
      description: "Prepare compelling presentations for store managers and buyers",
      icon: Users,
    },
  ]

  const handleSuggestionClick = (suggestion: string) => {
    handleInputChange({ target: { value: suggestion } } as any)
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={toggleMobileMenu} />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-50
        w-80 bg-gray-800 border-r border-gray-700 flex flex-col h-full
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        lg:w-80 md:w-72 sm:w-64
      `}
      >
        {/* Mobile Close Button */}
        <div className="lg:hidden flex justify-end p-4">
          <Button variant="ghost" size="sm" onClick={toggleMobileMenu} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-purple-400" />
            <span className="font-semibold text-sm sm:text-base">Outlet Assistant</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search conversations"
              className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 text-sm"
            />
          </div>
        </div>

        {/* Chat History */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            <div className="text-sm text-gray-400 mb-2">Recent Conversations</div>
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 cursor-pointer transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="text-sm font-medium truncate">{chat.title}</div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* New Chat Button */}
        <div className="p-4 border-t border-gray-700">
          <Button
            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm"
            onClick={() => {
              window.location.reload()
              setIsMobileMenuOpen(false)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Conversation
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              className="lg:hidden text-gray-400 hover:text-white p-1"
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 hidden sm:inline">Ice Cream Outlet Assistant</span>
              <span className="text-xs bg-purple-600 px-2 py-1 rounded font-medium">AI ASSISTANT</span>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" className="p-1 sm:p-2">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-1 sm:p-2">
              <User className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-3 sm:p-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto px-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-600 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                <Store className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold mb-2 text-center">
                How can I help with your outlet approach today?
              </h1>
              <p className="text-gray-400 text-center mb-6 sm:mb-8 max-w-2xl text-sm sm:text-base leading-relaxed">
                I'm here to assist you with any queries related to approaching outlets, understanding competitive
                advantages, and strategizing your pitch — all in your preferred language.
              </p>

              {/* Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8 w-full max-w-4xl">
                {suggestionCards.map((card, index) => {
                  const IconComponent = card.icon
                  return (
                    <Card
                      key={index}
                      className="p-4 sm:p-5 bg-gray-800 border-gray-700 hover:bg-gray-750 cursor-pointer transition-colors group"
                      onClick={() =>
                        handleSuggestionClick(`Help me with ${card.title.toLowerCase()} ${card.subtitle.toLowerCase()}`)
                      }
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                          <IconComponent className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white text-sm sm:text-base">{card.title}</h3>
                          <p className="text-xs sm:text-sm text-purple-400">{card.subtitle}</p>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{card.description}</p>
                    </Card>
                  )
                })}
              </div>

              {/* Call to Action */}
              <div className="text-center max-w-2xl">
                <p className="text-sm sm:text-base text-gray-300 mb-2 font-medium">
                  Ready to expand your ice cream distribution?
                </p>
                <p className="text-xs sm:text-sm text-gray-400">
                  Ask anything about outlet approach, compare with competitor offerings, or get guidance on your store
                  visits.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 sm:gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Store className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] sm:max-w-2xl p-3 sm:p-4 rounded-lg ${
                      message.role === "user" ? "bg-purple-600 text-white ml-8 sm:ml-12" : "bg-gray-800 text-white"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{message.content}</div>
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 sm:gap-4 justify-start">
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Store className="w-4 h-4 text-white" />
                  </div>
                  <div className="max-w-2xl p-3 sm:p-4 rounded-lg bg-gray-800 text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-100"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-3 sm:p-6 border-t border-gray-700">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex items-center gap-2 bg-gray-800 rounded-lg border border-gray-700 p-2">
                <Input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask about outlet strategies, competitor analysis, or pitch preparation..."
                  className="flex-1 bg-transparent border-none text-white placeholder-gray-400 focus:ring-0 text-sm sm:text-base"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2"
                  disabled={isLoading || !input.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
            <p className="text-xs text-gray-500 text-center mt-2">
              AI Assistant can provide guidance. Always verify important business decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
