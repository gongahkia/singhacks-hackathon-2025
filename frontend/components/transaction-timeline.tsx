'use client'

import { useState, useEffect } from 'react'
import { Clock, CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react'

interface TimelineStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'active' | 'completed' | 'failed'
  timestamp?: string
  txHash?: string
  hcsMessage?: any
  topicName?: string
}

interface TransactionTimelineProps {
  transactionId: string
  type?: 'registration' | 'a2a-payment' | 'reputation'
}

export function TransactionTimeline({ transactionId, type = 'a2a-payment' }: TransactionTimelineProps) {
  const [steps, setSteps] = useState<TimelineStep[]>([])
  const [loading, setLoading] = useState(true)
  const [aiInsights, setAiInsights] = useState<string>('')

  useEffect(() => {
    fetchTimelineData()
    // Poll for updates every 3 seconds
    const interval = setInterval(fetchTimelineData, 3000)
    return () => clearInterval(interval)
  }, [transactionId])

  useEffect(() => {
    if (steps.length > 0) {
      fetchAIInsights()
    }
  }, [steps])

  const fetchTimelineData = async () => {
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${BASE_URL}/api/timeline/${transactionId}`)
      const data = await res.json()
      setSteps(data.steps || [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch timeline:', error)
      setLoading(false)
    }
  }

  const fetchAIInsights = async () => {
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${BASE_URL}/api/ai/analyze-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps })
      })
      const data = await res.json()
      setAiInsights(data.insights || '')
    } catch (error) {
      console.error('Failed to get AI insights:', error)
    }
  }

  const getStepIcon = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-6 h-6 text-green-600" />
      case 'active': return <Clock className="w-6 h-6 text-blue-600 animate-pulse" />
      case 'failed': return <XCircle className="w-6 h-6 text-red-600" />
      default: return <AlertCircle className="w-6 h-6 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-muted rounded w-1/4"></div>
        <div className="h-20 bg-muted rounded"></div>
        <div className="h-20 bg-muted rounded"></div>
      </div>
    )
  }

  if (steps.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No timeline data available yet. Transaction events will appear here as they occur.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Transaction Flow</h3>
      
      {/* AI Insights */}
      {aiInsights && (
        <div className="border border-blue-500 p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <span>🤖</span> AI Analysis (Powered by Groq)
          </h4>
          <p className="text-sm">{aiInsights}</p>
        </div>
      )}
      
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
        
        {steps.map((step, index) => (
          <div key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Icon */}
            <div className="relative z-10 flex-shrink-0 w-16 flex items-center justify-center">
              {getStepIcon(step.status)}
            </div>
            
            {/* Content */}
            <div className="flex-1 pt-1">
              <div className="border border-border p-4 rounded-lg bg-background hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold">{step.title}</h4>
                  {step.timestamp && (
                    <span className="text-sm text-muted-foreground">
                      {new Date(step.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                
                {step.topicName && (
                  <div className="text-xs text-muted-foreground mb-2">
                    Topic: {step.topicName}
                  </div>
                )}
                
                {step.txHash && (
                  <a
                    href={`https://hashscan.io/testnet/transaction/${step.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    View on HashScan <ArrowRight className="w-3 h-3" />
                  </a>
                )}
                
                {step.hcsMessage && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      HCS Message Details
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto text-xs">
                      {JSON.stringify(step.hcsMessage, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
        Live updates every 3 seconds
      </div>
    </div>
  )
}

