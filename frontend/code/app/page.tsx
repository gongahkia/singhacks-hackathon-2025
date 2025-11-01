"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import PaymentRequest from "@/components/payment-request"
import ProcessingScreen from "@/components/processing-screen"
import ResultScreen from "@/components/result-screen"
import TransactionHistory from "@/components/transaction-history"
import apiClient from '@/lib/api-client'

type Screen = "request" | "processing" | "result"

interface Transaction {
  id: string
  date: string
  time: string
  amount: string
  status: "success" | "failed"
}

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("request")
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "0x7a2c...8f9b",
      date: "2025-01-15",
      time: "14:32",
      amount: "2.5 ETH",
      status: "success",
    },
    {
      id: "0x5e1d...3a4c",
      date: "2025-01-14",
      time: "09:15",
      amount: "1.0 ETH",
      status: "success",
    },
    {
      id: "0x9f2e...7b1d",
      date: "2025-01-13",
      time: "16:45",
      amount: "0.5 ETH",
      status: "failed",
    },
  ])
  const [resultData, setResultData] = useState<{
    success: boolean
    txId: string
    amount: string
    timestamp: string
    recipient: string
  } | null>(null)

  const handleSendPayment = () => {
    setCurrentScreen("processing")
    // Try real API call, fallback to simulated if backend not available
    ;(async () => {
      try {
        const resp = await apiClient.createPayment('0xDemoPayee', '1.0', 'Demo payment from UI')
        const txId = resp.escrowId ? String(resp.escrowId) : '0x' + Math.random().toString(16).slice(2, 8)
        const newTx: Transaction = {
          id: txId,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          amount: resp.amount ?? '1.0 HBAR',
          status: 'success',
        }

        setTransactions([newTx, ...transactions])
        setResultData({
          success: true,
          txId: newTx.id,
          amount: newTx.amount,
          timestamp: new Date().toLocaleString(),
          recipient: 'Demo Payee (0xDemoPayee)',
        })
        setCurrentScreen('result')
      } catch (err) {
        // fallback simulated behavior
        setTimeout(() => {
          const success = Math.random() > 0.2
          const newTx: Transaction = {
            id: '0x' + Math.random().toString(16).slice(2, 8) + '...' + Math.random().toString(16).slice(2, 6),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            amount: '2.5 ETH',
            status: success ? 'success' : 'failed',
          }

          setTransactions([newTx, ...transactions])
          setResultData({
            success,
            txId: newTx.id,
            amount: '2.5 ETH',
            timestamp: new Date().toLocaleString(),
            recipient: 'Agent Nexus AI (0x8a5...9c2)',
          })
          setCurrentScreen('result')
        }, 3000)
      }
    })()
  }

  useEffect(() => {
    ;(async () => {
      try {
        const h = await apiClient.healthCheck()
        // quick console log to show backend connectivity
        // eslint-disable-next-line no-console
        console.info('backend health:', h)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('health check failed:', e)
      }
    })()
  }, [])

  const handleNewPayment = () => {
    setCurrentScreen("request")
    setResultData(null)
  }

  return (
    <div className="min-h-screen">
      {/* Header Navigation */}
      <nav className="border-b border-border px-12 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Web3 Payment</h2>
          <Link
            href="/marketplace"
            className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium"
          >
            Agent Marketplace
          </Link>
        </div>
      </nav>

      <main className="flex gap-12 p-12" style={{ height: 'calc(100vh - 73px)' }}>
        {/* Main Content */}
        <div className="flex-1">
          {currentScreen === "request" && <PaymentRequest onSendClick={handleSendPayment} />}
          {currentScreen === "processing" && <ProcessingScreen />}
          {currentScreen === "result" && resultData && <ResultScreen data={resultData} onNewPayment={handleNewPayment} />}
        </div>

        {/* Sidebar - Transaction History */}
        <aside className="w-80 border-l border-border pl-12">
          <TransactionHistory transactions={transactions} />
        </aside>
      </main>
    </div>
  )
}
