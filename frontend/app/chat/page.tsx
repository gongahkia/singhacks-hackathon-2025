"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Send, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { addAgentTransaction } from '@/lib/tx-store'
import PaymentRequest from '@/components/payment-request'
import ProgressSidebar, { type ProgressItem } from '@/components/progress-sidebar'

type MessageRole = 'user' | 'assistant' | 'event' | 'connector'

type EventStatus = 'pending' | 'done' | 'error'

interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  event?: {
    type: Breakpoint['type'] | string
    status: EventStatus
    data?: any
  }
  connector?: {
    durationMs: number
  }
}

type Breakpoint =
  | { type: 'marketplace_search_started'; text: string }
  | { type: 'sellers_found'; text: string; count: number }
  | { type: 'sellers_ranked'; text: string }
  | { type: 'seller_confirmed'; text: string; seller?: { name: string; accountId?: string } }
  | { type: 'seller_verifying_ecr8004'; text: string }
  | { type: 'seller_verified_ecr8004'; text: string }
  | { type: 'transaction_details_confirmed'; text: string; quantity?: number; amount?: number }
  | { type: 'transaction_ready'; text: string }
  | { type: 'agent_session_initializing'; text: string }
  | { type: 'agent_session_loaded'; text: string }
  | { type: string; [key: string]: any }

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
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [paymentConfirmationText, setPaymentConfirmationText] = useState<string | undefined>(undefined)
  const [sellerName, setSellerName] = useState<string | undefined>(undefined)
  const [isProgressThinking, setIsProgressThinking] = useState(false)
  const initializedRef = useRef(false)

  const getRegisteredAgentName = () => {
    if (typeof window !== 'undefined') {
      const v = window.localStorage.getItem('heracles.registeredAgentName')
      if (v && v.trim().length > 0) return v.trim()
    }
    // Fallback default for now; to be sourced from Settings/Dashboard later
    return 'Alice tan'
  }

  // Keep connectors snappy: 0.1s to 1.5s
  const randomDelayMs = (min = 100, max = 1500) => Math.floor(Math.random() * (max - min + 1)) + min

  const addEventMessage = (bp: Breakpoint, status: EventStatus = 'done') => {
    const msg: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role: 'event',
      content: bp.text || '',
      timestamp: new Date(),
      event: { type: bp.type, status, data: bp }
    }
    setMessages(prev => [...prev, msg])
    return msg.id
  }

  const addConnectorMessage = (durationMs: number) => {
    const msg: Message = {
      id: `${Date.now()}-connector-${Math.random().toString(36).slice(2)}`,
      role: 'connector',
      content: '',
      timestamp: new Date(),
      connector: { durationMs }
    }
    setMessages(prev => [...prev, msg])
  }

  const updateEventStatusById = (id: string, status: EventStatus) => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, event: m.event ? { ...m.event, status } : m.event } : m)))
  }

  const markLastEventOfTypeDone = (type: Breakpoint['type'] | string) => {
    setMessages(prev => {
      const idx = [...prev].reverse().findIndex(m => m.role === 'event' && m.event?.type === type && m.event.status === 'pending')
      if (idx === -1) return prev
      const trueIdx = prev.length - 1 - idx
      const updated = [...prev]
      const m = updated[trueIdx]
      updated[trueIdx] = { ...m, event: m.event ? { ...m.event, status: 'done' } : m.event }
      return updated
    })
  }

  const playBreakpointsSequentially = (bps: Breakpoint[], startDelay = 300) => {
    let delay = startDelay
    bps.forEach((bp, i) => {
      const connectorTime = randomDelayMs()
      // Draw connector between previous box and next box
      setTimeout(() => {
        setIsProgressThinking(true)
        addConnectorMessage(connectorTime)
        // After the connector draws, show the next box and mark done
        setTimeout(() => {
          const id = addEventMessage(bp, 'pending')
          setTimeout(() => {
            updateEventStatusById(id, 'done')
            setIsProgressThinking(false)
          }, 600)
        }, connectorTime)
      }, delay)
      // Next delay accumulates
      delay += connectorTime + 700
    })
  }

  const extractSellerName = (action: any): string | undefined => {
    if (!action) return undefined
    if (action.payload?.seller?.name) return action.payload.seller.name
    const desc: string = action.payload?.description || ''
    const m = desc.match(/from\s+([^\n]+)$/i)
    if (m && m[1]) return m[1].trim()
    // Fallback to known single seller scenario
    return 'Bob Wong'
  }

  const sendQuickReply = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const initialBp: Breakpoint = { type: 'marketplace_search_started', text: 'Retrieving agents from Hedera marketplace...' }
      const initialId = addEventMessage(initialBp, 'pending')

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const resp = await fetch(`${backendUrl}/api/gemini/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text.trim() })
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
        setSellerName(extractSellerName(d.action))

        markLastEventOfTypeDone('marketplace_search_started')
        if (Array.isArray(d.breakpoints)) {
          const remaining = d.breakpoints.filter((bp: Breakpoint) => bp.type !== 'marketplace_search_started') as Breakpoint[]
          const expanded: Breakpoint[] = remaining.flatMap((bp: Breakpoint) => {
            if (bp.type === 'seller_verified_ecr8004') {
              return [
                { type: 'seller_verifying_ecr8004', text: 'Verifying seller via ECR-8004 protocol...' } as Breakpoint,
                { type: 'seller_verified_ecr8004', text: 'Verified' } as Breakpoint
              ]
            }
            return [bp]
          })
          playBreakpointsSequentially(expanded, 150)
        }

        if (d.action && d.action.type === 'request_confirmation') {
          setShowPaymentCard(true)
          setPaymentProcessing(false)
          setPaymentConfirmed(false)
          setPaymentConfirmationText(undefined)
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    // Capture and clear input, then reuse quick-reply sender
    const text = input.trim()
    setInput('')
    await sendQuickReply(text)
  }

  // On first mount, simulate loading registered agent and ask for confirmation
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    const agentName = getRegisteredAgentName()
    // Add a right sidebar init event
    const initId = addEventMessage({ type: 'agent_session_initializing', text: 'Initializing agent session...' } as any, 'pending')
    setIsProgressThinking(true)
    // Keep total init under ~1–2s deterministically
    const lead = 250 // ms before showing connector
    const connectorTime = 550 // ms fixed connector draw for reliability
    const finalizeDelay = lead + connectorTime + 250 // total ~1.05s

    const tLead = setTimeout(() => {
      addConnectorMessage(connectorTime)
    }, lead)

    const tFinalize = setTimeout(() => {
      updateEventStatusById(initId, 'done')
      addEventMessage({ type: 'agent_session_loaded', text: 'Registered agent loaded.' } as any, 'done')
      const followMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I've loaded your registered agent, ${agentName}. Confirm you want to transact on Heracles with this agent account?`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, followMsg])
      setIsProgressThinking(false)
    }, finalizeDelay)

    // Hard stop fallback to avoid rare stuck state
    const tSafety = setTimeout(() => {
      updateEventStatusById(initId, 'done')
      setIsProgressThinking(false)
    }, 2000)

    return () => {
      clearTimeout(tLead)
      clearTimeout(tFinalize)
      clearTimeout(tSafety)
    }
  }, [])

  // Listen for registered agent changes during a session
  useEffect(() => {
    const handler = (e: any) => {
      const name = (e?.detail?.name || '').trim()
      if (!name) return
      const msg: Message = {
        id: (Date.now() + 5).toString(),
        role: 'assistant',
        content: `Registered agent updated to ${name} for this session.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, msg])
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('heracles:agentNameChanged', handler as any)
      return () => window.removeEventListener('heracles:agentNameChanged', handler as any)
    }
  }, [])

  return (
    <main className="min-h-screen flex flex-col">
      <style jsx>{`
        @keyframes drawLineKey {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
        .draw-line {
          transform-origin: top;
          animation-name: drawLineKey;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
      `}</style>
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
  <div className="flex-1 flex flex-col p-12 max-w-7xl mx-auto w-full" style={{ paddingRight: 390 }}>
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
            {messages.filter(m => m.role === 'user' || m.role === 'assistant').map((message) => {
              const isUser = message.role === 'user'
              const isEvent = false
              const isConnector = false
                const quickReplies = !isUser && /confirm\b/i.test(message.content) ?
                  (message.content.toLowerCase().includes('confirm you want to transact') ? ['Yes','No'] : []) : []
              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-3 ${
                      isUser
                        ? 'bg-foreground text-background'
                        : 'bg-foreground/5 border border-border'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs mt-2 opacity-60">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                      {quickReplies.length > 0 && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {quickReplies.map((qr) => (
                            <button
                              key={qr}
                              onClick={() => sendQuickReply(qr)}
                              disabled={isLoading}
                              className="px-3 py-1 text-xs border border-border hover:bg-accent disabled:opacity-50"
                            >
                              {qr}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              )
            })}

            {(isLoading || isProgressThinking) && (
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
                sellerName={sellerName}
                isProcessing={paymentProcessing}
                confirmed={paymentConfirmed}
                confirmationText={paymentConfirmationText}
                onSendClick={async () => {
                  try {
                    setPaymentProcessing(true)
                    // Connector between "Payment request ready" and "Initiating transaction"
                    const preTxConnector = randomDelayMs()
                    setIsProgressThinking(true)
                    addConnectorMessage(preTxConnector)
                    await new Promise(res => setTimeout(res, preTxConnector))
                    // Add transaction start breakpoint card
                    const txStartId = addEventMessage({ type: 'transaction_started', text: 'Initiating transaction on Hedera...' } as any, 'pending')
                    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
                    const pResp = await fetch(`${backendUrl}/api/payments`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        payee: assistantAction.payload.payee || assistantAction.payload.recipient,
                        amount: assistantAction.payload.amount,
                        description: assistantAction.payload.description || assistantAction.payload.purpose || 'Payment via chat'
                      })
                    })
                    const pData = await pResp.json()

                    const success = !pData.error
                    const text = success
                      ? `Transaction submitted. Escrow ID: ${pData.escrowId || 'n/a'} | Tx: ${pData.txHash || 'n/a'}`
                      : `Payment failed: ${pData.error || 'Unknown error'}`
                    setPaymentConfirmed(success)
                    setPaymentConfirmationText(text)
                    setPaymentProcessing(false)

                    // Add transaction result breakpoint card
                    updateEventStatusById(txStartId, success ? 'done' : 'error')
                    // Draw connector before result to simulate processing time
                    const txConnectorTime = randomDelayMs()
                    setIsProgressThinking(true)
                    addConnectorMessage(txConnectorTime)
                    await new Promise(res => setTimeout(res, txConnectorTime))
                    addEventMessage({ type: 'transaction_result', text: success ? 'Transaction confirmed.' : 'Transaction failed.' } as any, success ? 'done' : 'error')
                    setIsProgressThinking(false)

                    const confirmMsg: Message = {
                      id: (Date.now() + 2).toString(),
                      role: 'assistant',
                      content: success ? `Payment initiated successfully. Escrow: ${pData.escrowId || 'n/a'} | Tx: ${pData.txHash || 'n/a'}` : 'Payment failed: ' + (pData.error || JSON.stringify(pData)),
                      timestamp: new Date()
                    }
                    setMessages(prev => [...prev, confirmMsg])

                    // Record transaction for dashboard
                    if (success) {
                      const recordId = (pData.txHash || pData.escrowId || `${Date.now()}`).toString()
                      addAgentTransaction({
                        id: recordId,
                        txHash: pData.txHash,
                        escrowId: pData.escrowId,
                        amountHBAR: Number(assistantAction.payload.amount) || 0,
                        payee: assistantAction.payload.payee || assistantAction.payload.recipient,
                        sellerName: sellerName,
                        description: assistantAction.payload.description || assistantAction.payload.purpose,
                        status: 'completed',
                        timestamp: Date.now(),
                        source: 'chat'
                      })
                    }
                  } catch (err: any) {
                    setPaymentProcessing(false)
                    setPaymentConfirmed(false)
                    setPaymentConfirmationText('Payment request failed.')
                    addEventMessage({ type: 'transaction_result', text: 'Transaction failed.' } as any, 'error')
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
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
      {/* Right progress sidebar (fixed) */}
      {(() => {
        const progressItems: ProgressItem[] = messages
          .filter(m => m.role === 'event' || m.role === 'connector')
          .map(m =>
            m.role === 'connector'
              ? { id: m.id, kind: 'connector', durationMs: m.connector?.durationMs || 1000, timestamp: m.timestamp }
              : { id: m.id, kind: 'event', text: m.content, status: m.event?.status as any, timestamp: m.timestamp }
          )
        // Reserve room for the top nav so buttons are usable
        return <ProgressSidebar items={progressItems} offsetTop={72} />
      })()}
    </main>
  )
}