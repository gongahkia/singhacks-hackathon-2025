"use client"

interface ResultData {
  success: boolean
  txId: string
  amount: string
  timestamp: string
  recipient: string
}

interface ResultScreenProps {
  data: ResultData
  onNewPayment: () => void
}

export default function ResultScreen({ data, onNewPayment }: ResultScreenProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        {data.success ? (
          <>
            <h1 className="text-5xl font-bold">Payment Successful</h1>
            <p className="text-foreground/60 text-lg">Your transaction has been completed</p>
          </>
        ) : (
          <>
            <h1 className="text-5xl font-bold">Payment Failed</h1>
            <p className="text-foreground/60 text-lg">The transaction could not be processed</p>
          </>
        )}
      </div>

      <div className="space-y-4 max-w-2xl">
        {/* Status Indicator */}
        <div className="border border-border p-8 space-y-4">
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${data.success ? "bg-black" : "bg-black/30"}`} />
            <span className="text-lg font-semibold">
              {data.success ? "Transaction Confirmed" : "Transaction Declined"}
            </span>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="border border-border p-8 space-y-6">
          <h2 className="text-lg font-semibold">Transaction Details</h2>

          <div className="space-y-4">
            <div className="flex justify-between pb-4 border-b border-border/50">
              <span className="text-foreground/60">Transaction ID</span>
              <span className="font-semibold">{data.txId}</span>
            </div>

            <div className="flex justify-between pb-4 border-b border-border/50">
              <span className="text-foreground/60">Amount</span>
              <span className="font-semibold">{data.amount}</span>
            </div>

            <div className="flex justify-between pb-4 border-b border-border/50">
              <span className="text-foreground/60">Recipient</span>
              <span className="font-semibold text-right">{data.recipient}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-foreground/60">Timestamp</span>
              <span className="font-semibold text-right">{data.timestamp}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={onNewPayment}
            className="flex-1 bg-foreground text-background py-4 text-lg font-semibold hover:bg-foreground/90 transition-colors"
          >
            New Payment
          </button>
          <button className="flex-1 border border-foreground py-4 text-lg font-semibold hover:bg-background/50 transition-colors">
            View Details
          </button>
        </div>
      </div>
    </div>
  )
}
