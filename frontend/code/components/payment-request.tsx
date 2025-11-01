"use client"

interface PaymentRequestProps {
  onSendClick: () => void
}

export default function PaymentRequest({ onSendClick }: PaymentRequestProps) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-5xl font-bold mb-2">Payment Request</h1>
        <p className="text-foreground/60">Enter payment details below</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Recipient Section */}
        <div className="border border-border p-8 space-y-4">
          <h2 className="text-lg font-semibold">Recipient Agent</h2>
          <div className="space-y-2">
            <div className="text-sm text-foreground/60">Agent Name</div>
            <div className="text-xl font-semibold">Agent Nexus AI</div>
            <div className="text-sm text-foreground/60">Address: 0x8a5f9c2e7b1d3a4f6e9c2b5d8a1f4e7c</div>
          </div>
        </div>

        {/* Amount Section */}
        <div className="border border-border p-8 space-y-4">
          <h2 className="text-lg font-semibold">Amount</h2>
          <div className="space-y-2">
            <div className="text-sm text-foreground/60">ETH Amount</div>
            <div className="text-4xl font-bold">2.5</div>
            <div className="text-sm text-foreground/60">≈ $5,250 USD</div>
          </div>
        </div>

        {/* Purpose Section */}
        <div className="border border-border p-8 space-y-4">
          <h2 className="text-lg font-semibold">Transaction Purpose</h2>
          <div className="space-y-2">
            <div className="text-sm text-foreground/60">Purpose (Optional)</div>
            <div className="text-foreground/80">AI Model Training Services - Q1 2025</div>
          </div>
        </div>

        {/* Send Button */}
        <button
          onClick={onSendClick}
          className="w-full bg-foreground text-background py-4 text-lg font-semibold hover:bg-foreground/90 transition-colors"
        >
          Send Payment
        </button>
      </div>
    </div>
  )
}
