// hooks/useConversations.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export function useConversations() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)

  const fetchConversations = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setConversations(data || [])
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const createConversation = async (title: string) => {
    if (!user) return null

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title,
        })
        .select()
        .single()

      if (error) throw error
      
      setConversations(prev => [data, ...prev])
      return data
    } catch (error) {
      console.error('Error creating conversation:', error)
      return null
    }
  }

  const updateConversationTitle = async (conversationId: string, title: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', conversationId)
        .eq('user_id', user.id)

      if (error) throw error
      
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId ? { ...conv, title } : conv
        )
      )
    } catch (error) {
      console.error('Error updating conversation:', error)
    }
  }

  const deleteConversation = async (conversationId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id)

      if (error) throw error
      
      setConversations(prev => prev.filter(conv => conv.id !== conversationId))
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  const getMessages = async (conversationId: string): Promise<Message[]> => {
    if (!user) return []

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching messages:', error)
      return []
    }
  }

  const saveMessage = async (conversationId: string, role: 'user' | 'assistant', content: string) => {
    if (!user) return null

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role,
          content,
        })
        .select()
        .single()

      if (error) throw error

      // Update conversation's updated_at timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('user_id', user.id)

      return data
    } catch (error) {
      console.error('Error saving message:', error)
      return null
    }
  }

  useEffect(() => {
    if (user) {
      fetchConversations()
    }
  }, [user])

  return {
    conversations,
    loading,
    createConversation,
    updateConversationTitle,
    deleteConversation,
    getMessages,
    saveMessage,
    refetch: fetchConversations,
  }
}