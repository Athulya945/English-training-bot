
'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { X, Mail, Lock, Eye, EyeOff } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      let result
      if (isSignUp) {
        result = await signUp(email, password)
        if (!result.error) {
          setSuccess('Account created successfully! You are now signed in.')
          setTimeout(() => {
            onClose()
          }, 2000)
        }
      } else {
        result = await signIn(email, password)
        if (!result.error) {
          onClose()
        }
      }

      if (result.error) {
        // Handle specific email confirmation error
        if (result.error.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.')
        } else {
          setError(result.error.message)
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess('')
    setShowPassword(false)
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    resetForm()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <Card className="w-full max-w-md" style={{ backgroundColor: '#ffffff', borderColor: '#e0e0e0', color: '#333333', boxShadow: 'rgba(0, 0, 0, 0.12) 0px 4px 16px' }}>
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              style={{ color: '#666666' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#333333'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#666666'
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}>
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: '#666666' }} />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  style={{ backgroundColor: '#ffffff', borderColor: '#e0e0e0', color: '#333333' }}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: '#666666' }} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  style={{ backgroundColor: '#ffffff', borderColor: '#e0e0e0', color: '#333333' }}
                  placeholder="Enter your password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2"
                  style={{ color: '#666666' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#333333'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#666666'
                  }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Confirm Password (Sign Up only) */}
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: '#666666' }} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    style={{ backgroundColor: '#ffffff', borderColor: '#e0e0e0', color: '#333333' }}
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
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
              disabled={loading}
            >
              {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: '#666666' }}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <Button
                variant="ghost"
                onClick={toggleMode}
                className="ml-1 p-0 h-auto"
                style={{ color: '#6a1b9a' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#5e1688'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#6a1b9a'
                }}
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </Button>
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
