"use client"

import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

export type ProgressItem =
  | { id: string; kind: 'event'; text: string; status: 'pending' | 'done' | 'error'; timestamp: Date }
  | { id: string; kind: 'connector'; durationMs: number; timestamp: Date }

interface ProgressSidebarProps {
  items: ProgressItem[]
  title?: string
  width?: number // px
  visible?: boolean
  offsetTop?: number // px; space reserved for top nav so buttons remain visible
}

export default function ProgressSidebar({ items, title = 'Agent progress', width = 380, visible = true, offsetTop = 64 }: ProgressSidebarProps) {
  if (!visible) return null

  return (
    <aside
      className="fixed right-0 border-l border-border bg-background z-40"
      style={{ width, top: offsetTop, height: `calc(100vh - ${offsetTop}px)` }}
      aria-label="Agent progress sidebar"
    >
      <style jsx>{`
        @keyframes drawLineKey {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
        .draw-line { animation: drawLineKey 1s linear forwards; transform-origin: top; }
      `}</style>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border sticky top-0 bg-background">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-foreground/60">Live marketplace and transaction steps</div>
      </div>

      {/* Scrollable content */}
      <div className="h-[calc(100%-48px)] overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-xs text-foreground/50">Awaiting your first request…</div>
        ) : (
          items.map((it) =>
            it.kind === 'connector' ? null : (
              <div
                key={it.id}
                className="px-4 py-3 border-2 border-foreground bg-foreground/5 text-center font-semibold"
              >
                <div className="flex items-center justify-center gap-2">
                  {it.status === 'pending' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {it.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                  {it.status === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                  <p className="text-sm whitespace-pre-wrap">{it.text}</p>
                </div>
                <p className="text-xs mt-2 opacity-60">{it.timestamp.toLocaleTimeString()}</p>
              </div>
            )
          )
        )}
      </div>
    </aside>
  )
}
