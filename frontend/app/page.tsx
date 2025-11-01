"use client"

import dynamic from 'next/dynamic'

// Load the Vite-style React app (src/App.tsx) as the default Next.js page
// Disable SSR to avoid issues with import.meta and window usage
const ViteApp = dynamic(() => import('../src/App'), { ssr: false })

export default function Home() {
  return <ViteApp />
}
