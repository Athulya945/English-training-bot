// components/AuthGuard.tsx
'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'
import { AuthModal } from './AuthModal'
import { Button } from '@/components/ui/button'
import { User } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center text-white">
          <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-8 h-8" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Welcome to Outlet Assistant</h1>
          <p className="text-gray-400 mb-6">
            Sign in to access your personalized ice cream outlet strategy assistant and chat history.
          </p>
          
          <Button 
            onClick={() => setShowAuthModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3"
          >
            Get Started
          </Button>

          <AuthModal 
            isOpen={showAuthModal} 
            onClose={() => setShowAuthModal(false)} 
          />
        </div>
      </div>
    )
  }

  return <>{children}</>
}