"use client"

interface PaymentRequestProps {
  payee: string
  amount: number
  description?: string
  sellerName?: string
  isProcessing?: boolean
  confirmed?: boolean
  confirmationText?: string
  onSendClick: () => void
}

export default function PaymentRequest({ payee, amount, description, sellerName, isProcessing, confirmed, confirmationText, onSendClick }: PaymentRequestProps) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-5xl font-bold mb-2">Payment Request</h1>
        <p className="text-foreground/60">Confirm the details and send the payment on Hedera</p>
      </div>

      {confirmed && (
        <div className="border-2 border-green-600 bg-green-600/10 p-4">
          <div className="font-semibold">Payment confirmed</div>
          <div className="text-sm text-foreground/80 mt-1">{confirmationText || 'Your transaction has been submitted.'}</div>
        </div>
      )}

      <div className="space-y-6 max-w-2xl">
        {/* Recipient Section */}
        <div className="border border-border p-8 space-y-4">
          <h2 className="text-lg font-semibold">Recipient Agent</h2>
          <div className="space-y-2">
            {sellerName && (
              <>
                <div className="text-sm text-foreground/60">Agent Name</div>
                <div className="text-xl font-semibold">{sellerName}</div>
              </>
            )}
            <div className="text-sm text-foreground/60">Agent Account ID</div>
            <div className="text-xl font-semibold">{payee}</div>
          </div>
        </div>

        {/* Amount Section */}
        <div className="border border-border p-8 space-y-4">
          <h2 className="text-lg font-semibold">Amount</h2>
          <div className="space-y-2">
            <div className="text-sm text-foreground/60">HBAR Amount</div>
            <div className="text-4xl font-bold">{amount}</div>
          </div>
        </div>

        {/* Purpose Section */}
        <div className="border border-border p-8 space-y-4">
          <h2 className="text-lg font-semibold">Transaction Purpose</h2>
          <div className="space-y-2">
            <div className="text-sm text-foreground/60">Description</div>
            <div className="text-foreground/80">{description || 'Payment via chat'}</div>
          </div>
        </div>

        {/* Send Button */}
        <button
          onClick={onSendClick}
          disabled={!!confirmed || !!isProcessing}
          className="w-full bg-foreground text-background py-4 text-lg font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Sending…' : confirmed ? 'Payment Sent' : 'Send Payment'}
        </button>
      </div>
    </div>
  )
}
