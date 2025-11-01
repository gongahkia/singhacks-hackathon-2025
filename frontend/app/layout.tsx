import type React from "react"
import type { Metadata } from "next"
import { JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { WalletProvider } from "../components/wallet-provider"
import { Header } from "../components/header"
import "./globals.css"

const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Heracles",
  description: "Minimal Web3 payment interface",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${jetbrainsMono.className} font-mono antialiased`}>
        <WalletProvider>
          <Header />
          {children}
          <Analytics />
        </WalletProvider>
      </body>
    </html>
  )
}
