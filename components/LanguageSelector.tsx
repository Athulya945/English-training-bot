"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Languages, Globe, MessageSquare } from "lucide-react";
import clsx from "clsx";

export interface LanguageOption {
  id: string;
  name: string;
  nativeName: string;
  flag: string;
  description: string;
  apiEndpoint: string;
  voiceApiEndpoint: string;
}

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  className?: string;
}

const languageOptions: LanguageOption[] = [
  {
    id: "english",
    name: "English",
    nativeName: "English",
    flag: "🇺🇸",
    description: "Practice English with native-like conversations",
    apiEndpoint: "/api/chat",
    voiceApiEndpoint: "/api/voicechat"
  },
  {
    id: "kannada",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    flag: "🇮🇳",
    description: "Speak in Kannada, learn English with bilingual support",
    apiEndpoint: "/api/kannada-chat",
    voiceApiEndpoint: "/api/kannada-voicechat"
  },
  {
    id: "english-pronunciation",
    name: "English Pronunciation",
    nativeName: "English Pronunciation",
    flag: "🎤",
    description: "Practice English pronunciation with clear American accent",
    apiEndpoint: "/api/chat",
    voiceApiEndpoint: "/api/english-voicechat"
  }
];

export default function LanguageSelector({ 
  selectedLanguage, 
  onLanguageChange, 
  className 
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = languageOptions.find(option => option.id === selectedLanguage);

  return (
    <div className={clsx("relative", className)}>
      {/* Language Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 h-auto bg-white border-gray-200 hover:bg-gray-50"
      >
        <Globe className="w-4 h-4 text-gray-600" />
        <span className="text-lg">{selectedOption?.flag}</span>
        <span className="text-sm font-medium text-gray-700">
          {selectedOption?.name}
        </span>
        <Languages className="w-4 h-4 text-gray-500" />
      </Button>

      {/* Language Options Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Languages className="w-4 h-4" />
              Choose Language
            </h3>
            
            <div className="space-y-2">
              {languageOptions.map((option) => (
                <Card
                  key={option.id}
                  className={clsx(
                    "p-3 cursor-pointer transition-all duration-200 border",
                    selectedLanguage === option.id
                      ? "bg-purple-50 border-purple-200 shadow-md"
                      : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                  )}
                  onClick={() => {
                    onLanguageChange(option.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{option.flag}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-800">
                          {option.name}
                        </h4>
                        {option.nativeName !== option.name && (
                          <span className="text-sm text-gray-500">
                            ({option.nativeName})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {option.description}
                      </p>
                    </div>
                    {selectedLanguage === option.id && (
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Info Section */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-blue-800 mb-1">
                    Language Features
                  </p>
                  <p className="text-xs text-blue-700">
                    {selectedLanguage === "kannada" 
                      ? "Speak in Kannada and get responses in both Kannada and English for better learning."
                      : selectedLanguage === "english-pronunciation"
                      ? "Practice English pronunciation with clear American accent for focused learning."
                      : "Practice English with native-like conversations and pronunciation guidance."
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export { languageOptions };

