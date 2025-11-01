"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Send } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI agent assistant. How can I help you navigate the Hedera Agent Economy today?',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate bot response (placeholder for now)
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'This is a placeholder response. The chatbot functionality will be implemented soon!',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMessage])
      setIsLoading(false)
    }, 1000)
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Top navigation bar */}
      <nav className="border-b border-border px-12 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Hedera Agent Economy</h2>
          <div className="flex gap-3">
            <Link href="/" className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium">
              Dashboard
            </Link>
            <Link href="/marketplace" className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium">
              Agent Marketplace
            </Link>
            <Link href="/settings" className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium">
              Settings
            </Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col p-12 max-w-7xl mx-auto w-full">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-2">AI Agent Chat</h1>
          <p className="text-foreground/60">
            Chat with an AI assistant to help you navigate the platform, understand blockchain concepts,
            and get guidance on using AI agents.
          </p>
        </div>

        {/* Chat container */}
        <div className="flex-1 flex flex-col border border-border">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-foreground text-background'
                      : 'bg-foreground/5 border border-border'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs mt-2 opacity-60">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[70%] px-4 py-3 bg-foreground/5 border border-border">
                  <p className="text-sm text-foreground/60">Thinking...</p>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <form onSubmit={handleSendMessage} className="border-t border-border p-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about AI agents, blockchain, or this platform..."
                className="flex-1 px-4 py-3 border border-border bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-6 py-3 bg-foreground text-background font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
