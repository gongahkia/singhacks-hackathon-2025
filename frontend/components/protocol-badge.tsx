'use client'

import { Badge } from '@/components/ui/badge'
import { Shield, Coins, ExternalLink } from 'lucide-react'

interface ProtocolBadgeProps {
  protocol: 'erc8004' | 'x402' | 'hybrid-trust'
  size?: 'sm' | 'md' | 'lg'
}

const PROTOCOL_INFO = {
  erc8004: {
    name: 'ERC-8004',
    description: 'Official Identity & Reputation Registry',
    contract: '0x4c74ebd72921d537159ed2053f46c12a7d8e5923',
    url: 'https://hashscan.io/testnet/address/0x4c74ebd72921d537159ed2053f46c12a7d8e5923',
    icon: Shield
  },
  x402: {
    name: 'x402 Protocol',
    description: 'Micropayment Standard',
    facilitator: 'https://x402-hedera-production.up.railway.app',
    url: 'https://x402-hedera-production.up.railway.app',
    icon: Coins
  },
  'hybrid-trust': {
    name: 'Hybrid Trust',
    description: '60% Custom + 40% ERC-8004 Official',
    icon: Shield
  }
}

export function ProtocolBadge({ protocol, size = 'md' }: ProtocolBadgeProps) {
  const info = PROTOCOL_INFO[protocol]
  const Icon = info.icon
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  }
  
  const hasUrl = (info as any).url
  return (
    <Badge 
      variant="outline" 
      className={`${sizeClasses[size]} flex items-center gap-1.5 border-border text-foreground rounded-none`}
    >
      <Icon className="w-3 h-3" />
      <span>{info.name}</span>
      {hasUrl && (
        <a 
          href={(info as any).url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </Badge>
  )
}

export function ProtocolInfoPanel() {
  return (
    <div className="border border-border bg-background p-4 rounded-none space-y-3">
      <h3 className="font-semibold text-sm">Protocols Used</h3>
      <div className="flex flex-wrap gap-2">
        <ProtocolBadge protocol="erc8004" />
        <ProtocolBadge protocol="x402" />
        <ProtocolBadge protocol="hybrid-trust" />
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <div>• ERC-8004: Official contracts on Hedera Testnet</div>
        <div>• x402: Payment protocol via hosted facilitator</div>
        <div>• Hybrid Trust: Combines custom metrics + ERC-8004 reputation</div>
      </div>
    </div>
  )
}

