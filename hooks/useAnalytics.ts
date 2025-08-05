import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from './useConversations';

export interface AnalyticsData {
  sessionsCompleted: number;
  pronunciationScore: number;
  grammarAccuracy: number;
  activeVocabulary: number;
  totalMessages: number;
  averageSessionLength: number;
  learningStreak: number;
  mostUsedWords: string[];
  commonGrammarErrors: string[];
  recentActivity: {
    date: string;
    sessions: number;
    messages: number;
  }[];
}

export function useAnalytics() {
  const { user } = useAuth();
  const { conversations } = useConversations();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    sessionsCompleted: 0,
    pronunciationScore: 0,
    grammarAccuracy: 0,
    activeVocabulary: 0,
    totalMessages: 0,
    averageSessionLength: 0,
    learningStreak: 0,
    mostUsedWords: [],
    commonGrammarErrors: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(false);

  // Calculate pronunciation score based on message patterns
  const calculatePronunciationScore = (messages: any[]): number => {
    if (messages.length === 0) return 0;
    
    let score = 7.0; // Base score
    
    // Analyze message patterns for pronunciation indicators
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    // Factor 1: Response length (longer responses might indicate better fluency)
    const avgUserMessageLength = userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / userMessages.length;
    if (avgUserMessageLength > 50) score += 0.5;
    if (avgUserMessageLength > 100) score += 0.5;
    
    // Factor 2: Conversation flow (more back-and-forth indicates better interaction)
    const conversationFlow = Math.min(userMessages.length, assistantMessages.length) / Math.max(userMessages.length, assistantMessages.length);
    score += conversationFlow * 1.0;
    
    // Factor 3: Session frequency (more sessions indicate consistent practice)
    const sessionCount = conversations.length;
    if (sessionCount > 10) score += 0.5;
    if (sessionCount > 20) score += 0.5;
    
    return Math.min(10, Math.max(0, score));
  };

  // Calculate grammar accuracy based on message analysis
  const calculateGrammarAccuracy = (messages: any[]): number => {
    if (messages.length === 0) return 0;
    
    let accuracy = 85; // Base accuracy
    
    const userMessages = messages.filter(m => m.role === 'user');
    
    // Analyze for common grammar patterns
    userMessages.forEach(message => {
      const content = message.content.toLowerCase();
      
      // Check for basic grammar patterns
      const hasProperCapitalization = /[A-Z]/.test(message.content);
      const hasPunctuation = /[.!?]/.test(message.content);
      const hasArticles = /\b(a|an|the)\b/i.test(content);
      
      if (hasProperCapitalization) accuracy += 0.5;
      if (hasPunctuation) accuracy += 0.5;
      if (hasArticles) accuracy += 0.3;
      
      // Check for common errors
      const commonErrors = [
        /\bi am\b/g, // Should be "I am"
        /\bme and\b/g, // Should be "and I"
        /\bdont\b/g, // Should be "don't"
        /\bcant\b/g, // Should be "can't"
        /\bwont\b/g, // Should be "won't"
      ];
      
      commonErrors.forEach(error => {
        if (error.test(content)) accuracy -= 0.2;
      });
    });
    
    return Math.min(100, Math.max(0, accuracy));
  };

  // Extract vocabulary from messages
  const extractVocabulary = (messages: any[]): string[] => {
    const allWords = messages
      .filter(m => m.role === 'user')
      .flatMap(m => 
        m.content
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter((word: any) => word.length > 2)
      );
    
    const wordCount = new Map<string, number>();
    allWords.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    // Return unique words that appear more than once
    return Array.from(wordCount.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, _]) => word);
  };

  // Calculate recent activity and learning streak
  const calculateRecentActivity = (conversations: any[]): any[] => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayConversations = conversations.filter(conv => 
        conv.created_at.startsWith(date)
      );
      
      return {
        date,
        sessions: dayConversations.length,
        messages: 0, // This would need to be calculated from messages
      };
    });
  };

  // Calculate learning streak
  const calculateLearningStreak = (conversations: any[]): number => {
    if (conversations.length === 0) return 0;
    
    const sortedConversations = conversations
      .map(conv => new Date(conv.created_at).toISOString().split('T')[0])
      .sort()
      .reverse();
    
    let streak = 0;
    let currentDate = new Date();
    
    for (let i = 0; i < 30; i++) { // Check last 30 days
      const dateStr = currentDate.toISOString().split('T')[0];
      if (sortedConversations.includes(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch all messages for the user
      let allMessages = [];
      if (conversations.length > 0) {
        const conversationIds = conversations.map(c => c.id);
        
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;
        allMessages = messages || [];
      }
      
      // Calculate metrics
      const sessionsCompleted = conversations.length;
      const pronunciationScore = calculatePronunciationScore(allMessages);
      const grammarAccuracy = calculateGrammarAccuracy(allMessages);
      const activeVocabulary = extractVocabulary(allMessages).length;
      const totalMessages = allMessages.length;
      const averageSessionLength = sessionsCompleted > 0 ? totalMessages / sessionsCompleted : 0;
      const learningStreak = calculateLearningStreak(conversations);
      const mostUsedWords = extractVocabulary(allMessages).slice(0, 10);
      const recentActivity = calculateRecentActivity(conversations);

      // Common grammar errors (simplified analysis)
      const commonGrammarErrors = allMessages
        .filter(m => m.role === 'user')
        .flatMap(m => {
          const content = m.content.toLowerCase();
          const errors = [];
          if (/\bi am\b/g.test(content)) errors.push('Capitalization');
          if (/\bdont\b/g.test(content)) errors.push('Contractions');
          if (/\bme and\b/g.test(content)) errors.push('Pronoun usage');
          return errors;
        })
        .filter((error, index, arr) => arr.indexOf(error) === index)
        .slice(0, 5);

      const analyticsData = {
        sessionsCompleted,
        pronunciationScore: Math.round(pronunciationScore * 10) / 10,
        grammarAccuracy: Math.round(grammarAccuracy),
        activeVocabulary,
        totalMessages,
        averageSessionLength: Math.round(averageSessionLength * 10) / 10,
        learningStreak,
        mostUsedWords,
        commonGrammarErrors,
        recentActivity,
      };
      
      // If no conversations exist, set some encouraging default values
      if (conversations.length === 0) {
        analyticsData.sessionsCompleted = 0;
        analyticsData.pronunciationScore = 0;
        analyticsData.grammarAccuracy = 0;
        analyticsData.activeVocabulary = 0;
        analyticsData.totalMessages = 0;
        analyticsData.averageSessionLength = 0;
        analyticsData.learningStreak = 0;
        analyticsData.mostUsedWords = [];
        analyticsData.commonGrammarErrors = [];
        analyticsData.recentActivity = [];
      }
      
      setAnalytics(analyticsData);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, conversations]);

  return {
    analytics,
    loading,
    refetch: fetchAnalytics,
  };
} 