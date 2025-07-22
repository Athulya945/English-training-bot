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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8f5f2' }}>
        <div className="text-center" style={{ color: '#333333' }}>
          <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#6a1b9a', borderTopColor: 'transparent' }}></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f8f5f2' }}>
        <div className="max-w-md w-full text-center" style={{ color: '#333333' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#6a1b9a' }}>
            <User className="w-8 h-8" style={{ color: '#ffffff' }} />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Welcome to Outlet Assistant</h1>
          <p className="mb-6" style={{ color: '#666666' }}>
            Sign in to access your personalized ice cream outlet strategy assistant and chat history.
          </p>
          
          <Button 
            onClick={() => setShowAuthModal(true)}
            className="px-8 py-3"
            style={{ 
              backgroundColor: '#6a1b9a', 
              color: '#ffffff',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#5e1688'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6a1b9a'
            }}
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