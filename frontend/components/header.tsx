'use client'

import Link from 'next/link'
import { WalletConnectButton } from './wallet-connect-button'

export function Header() {
  return (
    <nav className="border-b border-border px-12 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <img src="/heracles-icon.jpg" alt="Heracles" className="w-8 h-8 object-contain" />
            <h2 className="text-xl font-semibold">Heracles</h2>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-3">
            <Link
              href="/"
              className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/marketplace"
              className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium"
            >
              Agent Marketplace
            </Link>
            <Link
              href="/chat"
              className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium"
            >
              Chat
            </Link>
            <Link
              href="/settings"
              className="px-4 py-2 border border-border hover:bg-accent transition-colors text-sm font-medium"
            >
              Settings
            </Link>
          </div>
          <WalletConnectButton />
        </div>
      </div>
    </nav>
  )
}

