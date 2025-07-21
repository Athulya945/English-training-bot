import { AuthGuard } from '@/components/AuthGuard'
import ChatInterface from '@/components/ChatInterface'

export default function Home() {
  return (
    <AuthGuard>
      <ChatInterface />
    </AuthGuard>
  )
}