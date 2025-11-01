"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Send, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useAccount } from 'wagmi'
import { addAgentTransaction } from '@/lib/tx-store'
import PaymentRequest from '@/components/payment-request'
import ProgressSidebar, { type ProgressItem } from '@/components/progress-sidebar'
import { formatPaymentConfirmation } from '@/lib/format-utils'

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
  // Start with no messages; we'll show the greeting after a short init
  const [messages, setMessages] = useState<Message[]>([])
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
  const [matchedAgents, setMatchedAgents] = useState<any[]>([])
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null)
  const [selectedCurrency, setSelectedCurrency] = useState<'HBAR' | 'USDC'>('HBAR')
  const [paymentAmount, setPaymentAmount] = useState<number>(10)

  // Initialize payment amount when assistant action or selected agent changes
  useEffect(() => {
    if (assistantAction?.payload?.amount) {
      setPaymentAmount(Number(assistantAction.payload.amount) || 10)
    } else if (!assistantAction && !selectedAgent) {
      // Reset to default when no payment context
      setPaymentAmount(10)
    }
  }, [assistantAction?.payload?.amount, selectedAgent])
  const [connectedAgent, setConnectedAgent] = useState<any | null>(null)
  const { address: walletAddress, isConnected: walletConnected } = useAccount()
  
  // Wallet toggle state - user chooses between "My Wallet" or "Agent Wallet"
  const [useAgentWallet, setUseAgentWallet] = useState<boolean>(false)

  const getRegisteredAgentName = () => {
    if (typeof window !== 'undefined') {
      const v = window.localStorage.getItem('heracles.registeredAgentName')
      if (v && v.trim().length > 0) return v.trim()
    }
    // Fallback default for now; to be sourced from Settings/Dashboard later
    return 'Alice tan'
  }
  const toTitleCase = (s: string) => s.replace(/\b\w+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase())

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
      
      // First, fetch all available agents to include in the chat context
      let availableAgents: any[] = []
      try {
        const agentsRes = await fetch(`${backendUrl}/api/agents`)
        if (agentsRes.ok) {
          const agentsData = await agentsRes.json()
          availableAgents = agentsData.agents || []
        }
      } catch (e) {
        console.warn('Failed to fetch agents for chat context:', e)
      }
      
      const resp = await fetch(`${backendUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          input: text.trim(),
          availableAgents: availableAgents.map((a: any) => ({
            name: a.name,
            address: a.address,
            capabilities: a.capabilities,
            metadata: a.metadata,
            trustScore: a.trustScore,
            agentId: a.agentId
          }))
        })
      })
      const data = await resp.json()

      let assistantText = ''
      setReasoning(null)
      setAssistantAction(null)
      setShowPaymentCard(false)
      setMatchedAgents([])

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
        
        // Store matched agents if available and fetch hybrid trust scores
        if (d.matchedAgents && Array.isArray(d.matchedAgents) && d.matchedAgents.length > 0) {
          // Fetch hybrid trust scores for matched agents
          const agentsWithTrust = await Promise.all(
            d.matchedAgents.map(async (agent: any) => {
              try {
                const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
                const trustRes = await fetch(`${BASE_URL}/api/reputation/agents/${agent.address || agent.agentAddress}/hybrid-trust`)
                if (trustRes.ok) {
                  const trustData = await trustRes.json()
                  return { ...agent, hybridTrustScore: trustData.final || trustData.hybrid || agent.trustScore }
                }
              } catch (e) {
                // Failed to fetch trust
              }
              return agent
            })
          )
          setMatchedAgents(agentsWithTrust)
        }

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

  // On first mount, show a short initialization then prompt to use the agent (non-blocking)
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    // Add a right sidebar init event and resolve it deterministically in 1s
    const initId = addEventMessage({ type: 'agent_session_initializing', text: 'Initializing agent session...' } as any, 'pending')
    setIsProgressThinking(true)

    const tFinalize = setTimeout(() => {
      // Mark init as done and show the greeting message (non-blocking)
      updateEventStatusById(initId, 'done')
      const agent = toTitleCase(getRegisteredAgentName())
      const greet: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Hi! I'm ready to help you find agents and make payments. You can ask me to find agents, pay them, or use your connected agent for transactions. How can I help you?`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, greet])
      setIsProgressThinking(false)
      // Auto-dismiss confirmation dialog after 3 seconds or let user continue chatting
      // Don't show blocking dialog - just inform via message
    }, 1000)

    // Safety: ensure we never remain stuck beyond 1.5s
    const tSafety = setTimeout(() => {
      updateEventStatusById(initId, 'done')
      setIsProgressThinking(false)
    }, 1500)

    return () => {
      clearTimeout(tFinalize)
      clearTimeout(tSafety)
    }
  }, [])

  // Check for connected agent when wallet is connected
  useEffect(() => {
    const checkConnectedAgent = async () => {
      if (!walletConnected || !walletAddress) {
        setConnectedAgent(null)
        return
      }
      
      try {
        const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const res = await fetch(`${BASE_URL}/api/agent-connection/user/${walletAddress}`)
        if (res.ok) {
          const data = await res.json()
          setConnectedAgent(data)
        }
      } catch (e) {
        setConnectedAgent(null)
      }
    }
    
    checkConnectedAgent()
  }, [walletConnected, walletAddress])

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
      {/* Main content */}
  <div className="flex-1 flex flex-col p-12 max-w-7xl mx-auto w-full" style={{ paddingRight: 390 }}>
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
          <h1 className="text-5xl font-bold mb-2">AI Agent Chat</h1>
          <p className="text-foreground/60">
            Chat with an AI assistant to help you navigate the platform, understand blockchain concepts,
            and get guidance on using AI agents.
          </p>
            </div>
            {/* Connection Status */}
            <div className="text-right">
              {walletConnected && walletAddress ? (
                <div className="border border-border p-3 rounded bg-foreground/5">
                  <div className="text-xs text-foreground/60 mb-1">Wallet Connected</div>
                  <div className="text-xs font-mono break-all mb-2">{walletAddress.substring(0, 20)}...</div>
                  {connectedAgent ? (
                    <div className="text-xs text-green-600">
                      ✓ Agent: {connectedAgent.agent?.name || connectedAgent.agentId}
                    </div>
                  ) : (
                    <div className="text-xs text-yellow-600">
                      ⚠ No agent connected
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-border p-3 rounded bg-foreground/5">
                  <div className="text-xs text-foreground/60">Wallet Not Connected</div>
                </div>
              )}
            </div>
          </div>
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

          {/* Matched Agents Display */}
          {matchedAgents.length > 0 && (
            <div className="border-t border-border p-4 space-y-3">
              <div className="text-sm font-medium">Matched Agents ({matchedAgents.length})</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {matchedAgents.map((agent, idx) => (
                  <div
                    key={idx}
                    className="border border-border p-4 hover:bg-accent/50 transition-colors rounded"
                  >
                    <div className="font-medium mb-1 flex items-center gap-2">
                      {agent.name || 'Unknown Agent'}
                      {agent.paymentMode === 'permissionless' && (
                        <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-600 border border-purple-500/30 rounded" title="Autonomous payment agent">
                          🤖
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mb-2 break-all">
                      {agent.address || agent.agentAddress || 'N/A'}
                    </div>
                    {agent.paymentMode === 'permissionless' && agent.agentWalletAddress && (
                      <div className="text-xs text-purple-600 mb-1">
                        Wallet: {agent.agentWalletAddress.substring(0, 16)}...
                      </div>
                    )}
                    {agent.trustScore !== undefined && (
                      <div className="text-xs text-foreground/60 mb-2">
                        Trust Score: <span className="font-semibold">{agent.hybridTrustScore || agent.trustScore}</span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Link
                        href={`/marketplace/${agent.address || agent.agentAddress || '#'}`}
                        className="flex-1 px-3 py-1.5 text-xs bg-foreground/5 border border-border hover:bg-accent transition-colors rounded text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Profile
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedAgent(agent)
                          setShowPaymentCard(false)
                          const msg: Message = {
                            id: (Date.now() + 100).toString(),
                            role: 'assistant',
                            content: `I've selected ${agent.name || 'this agent'} for payment. How much would you like to pay? Please specify the amount and currency (HBAR or USDC).`,
                            timestamp: new Date()
                          }
                          setMessages(prev => [...prev, msg])
                        }}
                        className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Pay Agent
                      </button>
                    </div>
                    {agent.capabilities && Array.isArray(agent.capabilities) && agent.capabilities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {agent.capabilities.slice(0, 3).map((cap: string, i: number) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-foreground/5 border border-foreground/10 rounded">
                            {cap}
                          </span>
                        ))}
                        {agent.capabilities.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{agent.capabilities.length - 3} more</span>
                        )}
                      </div>
                    )}
                    {agent.reasoning && (
                      <div className="text-xs text-muted-foreground mt-2 italic">{agent.reasoning}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
          {(showPaymentCard || selectedAgent) && (assistantAction?.payload || selectedAgent) && (
            <div className="border-t border-border p-4">
              <PaymentRequest
                payee={selectedAgent?.address || selectedAgent?.agentAddress || assistantAction?.payload?.payee || assistantAction?.payload?.recipient || ''}
                amount={paymentAmount}
                onAmountChange={setPaymentAmount}
                description={selectedAgent ? `Payment to ${selectedAgent.name}` : (assistantAction?.payload?.description || assistantAction?.payload?.purpose)}
                sellerName={selectedAgent?.name || sellerName}
                isProcessing={paymentProcessing}
                confirmed={paymentConfirmed}
                confirmationText={paymentConfirmationText}
                currency={selectedCurrency}
                onCurrencyChange={setSelectedCurrency}
                agentWalletAddress={selectedAgent?.agentWalletAddress || connectedAgent?.agent?.agentWalletAddress}
                useAgentWallet={useAgentWallet}
                onWalletToggle={setUseAgentWallet}
                canUseAgentWallet={!!(selectedAgent?.agentWalletAddress || connectedAgent?.agent?.agentWalletAddress)}
                userWalletAddress={walletAddress || null}
                onSendClick={async () => {
                  // Check if we can pay: either with agent wallet OR user wallet
                  const canPayWithAgentWallet = !!(selectedAgent?.agentWalletAddress || connectedAgent?.agent?.agentWalletAddress)
                  const canPayWithUserWallet = !!walletAddress
                  
                  if (!canPayWithAgentWallet && !canPayWithUserWallet) {
                    const errMsg: Message = {
                      id: (Date.now() + 200).toString(),
                      role: 'assistant',
                      content: 'Please connect your wallet or ensure the agent has a wallet available for payment.',
                      timestamp: new Date()
                    }
                    setMessages(prev => [...prev, errMsg])
                    return
                  }
                  
                  // If user selected agent wallet but agent doesn't have one, switch to user wallet
                  if (useAgentWallet && !canPayWithAgentWallet) {
                    setUseAgentWallet(false)
                    const errMsg: Message = {
                      id: (Date.now() + 201).toString(),
                      role: 'assistant',
                      content: 'Agent wallet not available. Using your wallet instead.',
                      timestamp: new Date()
                    }
                    setMessages(prev => [...prev, errMsg])
                    // Continue with user wallet
                  }
                  
                  // If user selected user wallet but wallet not connected, try agent wallet
                  if (!useAgentWallet && !canPayWithUserWallet && canPayWithAgentWallet) {
                    setUseAgentWallet(true)
                    const errMsg: Message = {
                      id: (Date.now() + 202).toString(),
                      role: 'assistant',
                      content: 'Wallet not connected. Using agent wallet instead.',
                      timestamp: new Date()
                    }
                    setMessages(prev => [...prev, errMsg])
                  }
                  try {
                    setPaymentProcessing(true)
                    // Connector between "Payment request ready" and "Initiating transaction"
                    const preTxConnector = randomDelayMs()
                    setIsProgressThinking(true)
                    addConnectorMessage(preTxConnector)
                    await new Promise(res => setTimeout(res, preTxConnector))
                    // Add transaction start breakpoint card
                    const txStartId = addEventMessage({ type: 'transaction_started', text: `Initiating ${selectedCurrency} transaction on Hedera via connected agent...` } as any, 'pending')
                    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
                    
                    // Payment flow:
                    // - toAgentId = selectedAgent (Alice - the recipient)
                    // - fromAgentId = The agent paying (Bob if useAgentWallet, or connected agent)
                    const toAgentId = selectedAgent?.agentId || selectedAgent?.address
                    // Use the editable payment amount from state
                    
                    if (!toAgentId) {
                      throw new Error('No recipient agent selected for payment')
                    }
                    
                    // Determine which agent is paying (the "from" agent)
                    // If using agent wallet, we need to find which agent has a wallet available
                    // The wallet toggle shows which agent's wallet we're using
                    let fromAgentId: string | null = null
                    
                    if (useAgentWallet) {
                      // User selected "Agent Wallet" - need to find which agent has a wallet
                      // Check if selectedAgent has a wallet (could be Bob paying to Alice)
                      if (selectedAgent?.agentWalletAddress) {
                        // If selectedAgent has wallet, it could be the payer
                        // But usually selectedAgent is the recipient (Alice)
                        // So we should look for a different agent with a wallet (Bob)
                        // For now, try using connectedAgent or search for an agent with wallet
                        if (connectedAgent?.agent?.agentWalletAddress) {
                          fromAgentId = connectedAgent.agentId
                        } else if (selectedAgent?.agentWalletAddress) {
                          // Fallback: if selectedAgent has wallet, maybe it's both sender and recipient?
                          // This shouldn't happen, but handle it
                          fromAgentId = selectedAgent.agentId || selectedAgent.address
                        }
                      } else {
                        // selectedAgent doesn't have wallet, so find the agent that does
                        if (connectedAgent?.agent?.agentWalletAddress) {
                          fromAgentId = connectedAgent.agentId
                        }
                      }
                      
                      // If still no fromAgentId, try to find Bob or Alice by name
                      if (!fromAgentId) {
                        // Fetch agents to find Bob or Alice
                        try {
                          const agentsRes = await fetch(`${backendUrl}/api/agents`)
                          if (agentsRes.ok) {
                            const agentsData = await agentsRes.json()
                            const agents = agentsData.agents || []
                            // Find an agent with a wallet (Bob or Alice)
                            const agentWithWallet = agents.find((a: any) => 
                              a.agentWalletAddress && 
                              (a.name?.toLowerCase() === 'bob' || a.name?.toLowerCase() === 'alice') &&
                              a.agentId !== toAgentId && 
                              a.address !== toAgentId
                            )
                            if (agentWithWallet) {
                              fromAgentId = agentWithWallet.agentId || agentWithWallet.address
                            }
                          }
                        } catch (e) {
                          console.warn('Failed to fetch agents for payment:', e)
                        }
                      }
                      
                      if (!fromAgentId) {
                        throw new Error('No agent with wallet found for payment. Please select an agent with an available wallet.')
                      }
                    } else {
                      // Using user wallet - fromAgentId should be the connected agent
                      fromAgentId = connectedAgent?.agentId || connectedAgent?.agent?.agentId
                      if (!fromAgentId) {
                        throw new Error('No connected agent found. Please connect your wallet to an agent first.')
                      }
                    }
                    
                    // Prevent self-payment
                    if (fromAgentId === toAgentId || 
                        (selectedAgent?.address && fromAgentId?.toLowerCase() === selectedAgent.address.toLowerCase()) ||
                        (selectedAgent?.agentId && fromAgentId?.toLowerCase() === selectedAgent.agentId.toLowerCase())) {
                      throw new Error('Cannot pay an agent to itself. Please select a different recipient agent.')
                    }
                    
                    // Prepare payment request body
                    const paymentBody: any = {
                      fromAgentId: fromAgentId,
                      toAgentId: toAgentId,
                      amount: paymentAmount,
                      currency: selectedCurrency,
                      useAgentWallet: useAgentWallet
                    }
                    
                    // Add user wallet address if using user wallet
                    if (!useAgentWallet) {
                      if (!walletAddress) {
                        throw new Error('Wallet address required when using your wallet')
                      }
                      paymentBody.userWalletAddress = walletAddress
                      // TODO: Add signedPaymentHeader when x402 frontend signing is complete
                      // paymentBody.signedPaymentHeader = await signPaymentHeader(...)
                    }
                    
                    // Make payment request
                    const pResp = await fetch(`${backendUrl}/api/agent-connection/pay-agent`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(paymentBody)
                    })
                    const pData = await pResp.json()

                    const success = !pData.error
                    const text = success
                      ? formatPaymentConfirmation(pData.payment?.escrowId || pData.escrowId, pData.payment?.txHash || pData.txHash)
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
                      content: success 
                        ? formatPaymentConfirmation(pData.payment?.escrowId || pData.escrowId, pData.payment?.txHash || pData.txHash)
                        : 'Payment failed: ' + (pData.error || JSON.stringify(pData)),
                      timestamp: new Date()
                    }
                    setMessages(prev => [...prev, confirmMsg])

                    // Record transaction for dashboard
                    if (success) {
                      const txHash = pData.payment?.txHash || pData.txHash
                      const escrowId = pData.payment?.escrowId || pData.escrowId
                      const recordId = (txHash || escrowId || `${Date.now()}`).toString()
                      addAgentTransaction({
                        id: recordId,
                        txHash: txHash,
                        escrowId: escrowId,
                        amountHBAR: paymentAmount || 0,
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