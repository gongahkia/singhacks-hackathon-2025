"use client"

interface PaymentRequestProps {
  payee: string
  amount: number
  onAmountChange?: (amount: number) => void
  description?: string
  sellerName?: string
  isProcessing?: boolean
  confirmed?: boolean
  confirmationText?: string
  currency?: 'HBAR' | 'USDC'
  onCurrencyChange?: (currency: 'HBAR' | 'USDC') => void
  agentWalletAddress?: string | null
  useAgentWallet?: boolean
  onWalletToggle?: (useAgentWallet: boolean) => void
  canUseAgentWallet?: boolean // Whether agent has a wallet available
  userWalletAddress?: string | null
  onSendClick: () => void
}

export default function PaymentRequest({ 
  payee, 
  amount, 
  onAmountChange,
  description, 
  sellerName, 
  isProcessing, 
  confirmed, 
  confirmationText, 
  currency = 'HBAR', 
  onCurrencyChange, 
  agentWalletAddress,
  useAgentWallet = false,
  onWalletToggle,
  canUseAgentWallet = false,
  userWalletAddress,
  onSendClick 
}: PaymentRequestProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Payment Request</h2>
        <p className="text-sm text-foreground/60">Confirm the details and send the payment on Hedera</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-blue-600 border border-blue-500 px-2 py-1 rounded flex items-center gap-1">
            💵 x402 Protocol
          </span>
          <span className="text-xs text-muted-foreground">
            Using official x402 payment facilitator
          </span>
        </div>
      </div>

      {confirmed && (
        <div className="border-2 border-green-600 bg-green-600/10 p-4">
          <div className="font-semibold">Payment confirmed</div>
          <div className="text-sm text-foreground/80 mt-1">{confirmationText || 'Your transaction has been submitted.'}</div>
        </div>
      )}

      <div className="space-y-4 max-w-2xl">
        {/* Recipient Section */}
        <div className="border border-border p-6 space-y-3">
          <h3 className="text-base font-semibold">Recipient Agent</h3>
          <div className="space-y-2">
            {sellerName && (
              <>
                <div className="text-sm text-foreground/60">Agent Name</div>
                <div className="text-xl font-semibold">{sellerName}</div>
              </>
            )}
            <div className="text-sm text-foreground/60">Agent Account ID</div>
            <div className="text-xl font-semibold break-all">{payee}</div>
          </div>
        </div>

        {/* Wallet Selection Toggle */}
        <div className="border border-border p-6 space-y-3">
          <h3 className="text-base font-semibold">Payment Source</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <button
                onClick={() => onWalletToggle?.(false)}
                disabled={isProcessing || confirmed || !userWalletAddress}
                className={`flex-1 px-4 py-3 border rounded transition-colors ${
                  !useAgentWallet
                    ? 'bg-blue-500/20 text-blue-600 border-blue-500/50'
                    : 'border-border hover:bg-accent'
                } ${(!userWalletAddress || isProcessing || confirmed) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-sm font-semibold">💳 My Wallet</div>
                {userWalletAddress && (
                  <div className="text-xs text-foreground/60 mt-1 font-mono">
                    {userWalletAddress.substring(0, 10)}...{userWalletAddress.substring(userWalletAddress.length - 8)}
                  </div>
                )}
                {!userWalletAddress && (
                  <div className="text-xs text-red-500 mt-1">Wallet not connected</div>
                )}
              </button>
              <button
                onClick={() => onWalletToggle?.(true)}
                disabled={isProcessing || confirmed || !canUseAgentWallet}
                className={`flex-1 px-4 py-3 border rounded transition-colors ${
                  useAgentWallet
                    ? 'bg-purple-500/20 text-purple-600 border-purple-500/50'
                    : 'border-border hover:bg-accent'
                } ${(!canUseAgentWallet || isProcessing || confirmed) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-sm font-semibold">🤖 Agent Wallet</div>
                {agentWalletAddress && (
                  <div className="text-xs text-foreground/60 mt-1 font-mono">
                    {agentWalletAddress.substring(0, 10)}...{agentWalletAddress.substring(agentWalletAddress.length - 8)}
                  </div>
                )}
                {!canUseAgentWallet && (
                  <div className="text-xs text-red-500 mt-1">Agent has no wallet</div>
                )}
              </button>
            </div>
            <div className="text-xs text-foreground/60">
              {useAgentWallet 
                ? 'Payment will be made from the agent\'s wallet (no signature required)'
                : 'Payment will be made from your wallet (signature required)'}
            </div>
          </div>
        </div>

        {/* Amount Section */}
        <div className="border border-border p-6 space-y-4">
          <h3 className="text-base font-semibold">Amount</h3>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-foreground/60 mb-2">Currency</div>
              <div className="flex gap-3">
                <button
                  onClick={() => onCurrencyChange?.('HBAR')}
                  className={`px-4 py-2 border rounded transition-colors ${
                    currency === 'HBAR'
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border hover:bg-accent'
                  }`}
                  disabled={isProcessing || confirmed}
                >
                  HBAR
                </button>
                <button
                  onClick={() => onCurrencyChange?.('USDC')}
                  className={`px-4 py-2 border rounded transition-colors ${
                    currency === 'USDC'
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border hover:bg-accent'
                  }`}
                  disabled={isProcessing || confirmed}
                >
                  USDC
                </button>
              </div>
            </div>
          <div className="space-y-2">
              <div className="text-sm text-foreground/60">{currency} Amount</div>
              {confirmed || isProcessing ? (
                // Display only when processing or confirmed
                <div className="text-4xl font-bold">{amount}</div>
              ) : (
                // Editable input when not processing/confirmed
                <input
                  type="number"
                  min="0"
                  step="0.00000001"
                  value={amount}
                  onChange={(e) => {
                    const newAmount = parseFloat(e.target.value) || 0
                    if (newAmount >= 0) {
                      onAmountChange?.(newAmount)
                    }
                  }}
                  className="text-4xl font-bold bg-transparent border-b-2 border-border focus:border-foreground focus:outline-none w-full pb-2 transition-colors"
                  placeholder="0.00"
                  disabled={isProcessing || confirmed}
                />
              )}
            </div>
          </div>
        </div>

        {/* Purpose Section */}
        <div className="border border-border p-6 space-y-3">
          <h3 className="text-base font-semibold">Transaction Purpose</h3>
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
