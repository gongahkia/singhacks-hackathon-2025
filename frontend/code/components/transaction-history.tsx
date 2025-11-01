"use client"

interface Transaction {
  id: string
  date: string
  time: string
  amount: string
  status: "success" | "failed"
}

interface TransactionHistoryProps {
  transactions: Transaction[]
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Transaction History</h2>
        <p className="text-sm text-foreground/60">Recent payments</p>
      </div>

      <div className="space-y-3">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="border border-border p-4 space-y-2 hover:bg-background/50 transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold text-sm">{tx.date}</div>
                <div className="text-xs text-foreground/60">{tx.time}</div>
              </div>
              <div className={`w-2 h-2 rounded-full mt-1 ${tx.status === "success" ? "bg-black" : "bg-black/30"}`} />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">{tx.amount}</span>
              <span
                className={`text-xs font-semibold ${
                  tx.status === "success" ? "text-foreground" : "text-foreground/50"
                }`}
              >
                {tx.status === "success" ? "Confirmed" : "Failed"}
              </span>
            </div>

            <div className="text-xs text-foreground/50 truncate">{tx.id}</div>
          </div>
        ))}
      </div>

      {transactions.length === 0 && <p className="text-sm text-foreground/60 text-center py-8">No transactions yet</p>}
    </div>
  )
}
