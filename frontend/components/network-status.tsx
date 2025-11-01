'use client'

import { Wifi, WifiOff, Activity, Server, Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Health = { status: string; timestamp: string; network?: string; version?: string }

interface NetworkStatusProps {
  health: Health | null
  loading?: boolean
  error?: string | null
}

export function NetworkStatus({ health, loading, error }: NetworkStatusProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 animate-pulse text-foreground/60" />
            Network Status
          </CardTitle>
          <CardDescription>Checking connection to Hedera blockchain network...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-foreground/60">
            <div className="w-2 h-2 rounded-full bg-foreground/40 animate-pulse" />
            <span>Connecting...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-red-600 dark:text-red-400" />
            Network Status
          </CardTitle>
          <CardDescription>Unable to connect to the backend server</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="font-medium text-red-600 dark:text-red-400">Connection Failed</span>
          </div>
          <div className="text-sm text-foreground/60">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-foreground/60" />
            Network Status
          </CardTitle>
          <CardDescription>No status information available</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const isOnline = health.status?.toLowerCase() === 'ok' || health.status?.toLowerCase() === 'healthy'
  const networkType = health.network || 'Unknown'
  const isTestnet = networkType.toLowerCase().includes('testnet')
  const isMainnet = networkType.toLowerCase().includes('mainnet')

  // Parse timestamp
  let timeDisplay = 'Unknown'
  try {
    const timestamp = new Date(health.timestamp)
    if (!isNaN(timestamp.getTime())) {
      timeDisplay = timestamp.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  } catch (e) {
    // Keep default
  }

  return (
    <Card className={cn(
      isOnline ? 'border-green-200 dark:border-green-900' : 'border-yellow-200 dark:border-yellow-900'
    )}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <WifiOff className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            )}
            Network Status
          </div>
          <Badge 
            variant={isOnline ? "default" : "outline"}
            className={cn(
              isOnline 
                ? "bg-green-600 text-white border-green-600 dark:bg-green-700 dark:border-green-700" 
                : "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700"
            )}
          >
            {isOnline ? 'Online' : 'Limited'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Connection to Hedera blockchain network
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Row */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full",
            isOnline ? "bg-green-600 animate-pulse" : "bg-yellow-600 animate-pulse"
          )} />
          <div className="flex-1">
            <div className="text-sm font-medium">
              {isOnline ? 'Connected and Operational' : 'Connection Issues Detected'}
            </div>
            <div className="text-xs text-foreground/60 mt-0.5">
              Status: {health.status}
            </div>
          </div>
        </div>

        {/* Network Type */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <Server className="w-4 h-4 text-foreground/60" />
          <div className="flex-1">
            <div className="text-sm text-foreground/60">Network</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium">{networkType}</span>
              {isTestnet && (
                <Badge variant="outline" className="text-xs">
                  Testnet
                </Badge>
              )}
              {isMainnet && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700">
                  Mainnet
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Version (if available) */}
        {health.version && (
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <Activity className="w-4 h-4 text-foreground/60" />
            <div className="flex-1">
              <div className="text-sm text-foreground/60">Version</div>
              <div className="text-sm font-medium mt-1">{health.version}</div>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <Clock className="w-4 h-4 text-foreground/60" />
          <div className="flex-1">
            <div className="text-sm text-foreground/60">Last Updated</div>
            <div className="text-sm font-medium mt-1">{timeDisplay}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

