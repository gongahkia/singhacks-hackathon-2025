"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Send } from 'lucide-react'
import PaymentRequest from '@/components/payment-request'

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
      content: 'Hello! I\'m your AI agent assistant. How can I help you navigate Heracles today?',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [reasoning, setReasoning] = useState<string[] | null>(null)
  const [assistantAction, setAssistantAction] = useState<any | null>(null)
  const [showPaymentCard, setShowPaymentCard] = useState(false)

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

    try {
      // Send user input to backend chat API
      const resp = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() })
      })
      const data = await resp.json()

      let assistantText = ''
      setReasoning(null)
      setAssistantAction(null)
      setShowPaymentCard(false)

      if (!data.success) {
        assistantText = 'Assistant error: ' + (data.error || 'Unknown error from model')
      } else if (data.raw) {
        assistantText = data.raw
      } else if (data.data) {
        const d = data.data
        assistantText = d.message || 'Here are suggested actions.'
        if (d.reasoning) setReasoning(d.reasoning)
        if (d.action) setAssistantAction(d.action)

        // Show payment card if payment confirmation requested
        if (d.action && d.action.type === 'request_confirmation') {
          setShowPaymentCard(true)
        }
      } else {
        assistantText = 'No response from assistant.'
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantText,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMessage])
    } catch (e: any) {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Failed to contact assistant: ' + (e.message || e),
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Top navigation bar */}
      <nav className="border-b border-border px-12 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/heracles-icon.jpg" alt="Heracles" className="w-8 h-8 object-contain" />
            <h2 className="text-xl font-semibold">Heracles</h2>
          </div>
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

          {/* Reasoning / verification area */}
          {reasoning && (
            <div className="border-t border-border p-4 space-y-2">
              <div className="text-sm font-medium">Agent reasoning</div>
              <ol className="list-decimal list-inside text-sm text-foreground/80">
                {reasoning.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Payment card area (embedded) */}
          {showPaymentCard && assistantAction && assistantAction.payload && (
            <div className="border-t border-border p-4">
              <PaymentRequest
                payee={assistantAction.payload.payee || assistantAction.payload.recipient}
                amount={assistantAction.payload.amount}
                description={assistantAction.payload.description || assistantAction.payload.purpose}
                onSendClick={async () => {
                  try {
                    const pResp = await fetch('/api/payments', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        payee: assistantAction.payload.payee || assistantAction.payload.recipient,
                        amount: assistantAction.payload.amount,
                        description: assistantAction.payload.description || assistantAction.payload.purpose || 'Payment via chat'
                      })
                    })
                    const pData = await pResp.json()
                    const confirmMsg: Message = {
                      id: (Date.now() + 2).toString(),
                      role: 'assistant',
                      content: pData.error ? 'Payment failed: ' + (pData.error || JSON.stringify(pData)) : 'Payment initiated successfully',
                      timestamp: new Date()
                    }
                    setMessages(prev => [...prev, confirmMsg])
                    setShowPaymentCard(false)
                  } catch (err: any) {
                    const errMsg: Message = {
                      id: (Date.now() + 3).toString(),
                      role: 'assistant',
                      content: 'Payment request failed: ' + (err.message || err),
                      timestamp: new Date()
                    }
                    setMessages(prev => [...prev, errMsg])
                  }
                }}
              />
            </div>
          )}

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