'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Star, Loader2 } from 'lucide-react'
import { Input } from './ui/input'

interface AgentFeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentAddress: string
  agentName: string
  agentId?: string | number
  onSuccess?: () => void
}

export function AgentFeedbackModal({
  open,
  onOpenChange,
  agentAddress,
  agentName,
  agentId,
  onSuccess,
}: AgentFeedbackModalProps) {
  const { address, isConnected } = useAccount()
  const [rating, setRating] = useState<number>(0)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [comment, setComment] = useState('')
  const [tag1, setTag1] = useState('')
  const [tag2, setTag2] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first')
      return
    }

    if (rating === 0) {
      setError('Please select a rating')
      return
    }

    // Prevent self-feedback
    if (address.toLowerCase() === agentAddress.toLowerCase()) {
      setError('Cannot submit feedback for your own agent')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      
      const payload: any = {
        fromAgent: address,
        toAgent: agentId || agentAddress, // Use ERC-8004 ID if available, otherwise address
        rating: rating, // 1-5 stars
        comment: comment.trim() || '',
      }

      if (tag1.trim()) payload.tag1 = tag1.trim()
      if (tag2.trim()) payload.tag2 = tag2.trim()

      const res = await fetch(`${BASE_URL}/api/reputation/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok && data.success !== false) {
        setSuccess(true)
        setTimeout(() => {
          // Reset form
          setRating(0)
          setComment('')
          setTag1('')
          setTag2('')
          setError(null)
          setSuccess(false)
          onOpenChange(false)
          if (onSuccess) onSuccess()
        }, 2000)
      } else {
        setError(data.error || 'Failed to submit feedback')
      }
    } catch (e: any) {
      setError(e.message || 'Failed to submit feedback')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Submit Feedback for {agentName}</DialogTitle>
          <DialogDescription>
            Share your experience with this agent. Your feedback will be recorded on-chain via ERC-8004 and will update the agent's trust score.
          </DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Please connect your wallet to submit feedback
            </p>
          </div>
        ) : success ? (
          <div className="py-6 text-center">
            <div className="text-green-600 dark:text-green-400 mb-2">
              ✓ Feedback submitted successfully!
            </div>
            <p className="text-sm text-muted-foreground">
              Your feedback has been recorded on-chain and will update the trust score.
            </p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Star Rating */}
            <div className="space-y-2">
              <Label>Rating *</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-colors focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= (hoveredRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    {rating} {rating === 1 ? 'star' : 'stars'}
                  </span>
                )}
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label htmlFor="comment">Comment (optional)</Label>
              <Textarea
                id="comment"
                placeholder="Share your experience with this agent..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </div>

            {/* Tags */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tag1">Tag 1 (optional)</Label>
                <Input
                  id="tag1"
                  placeholder="e.g., quality, speed"
                  value={tag1}
                  onChange={(e) => setTag1(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag2">Tag 2 (optional)</Label>
                <Input
                  id="tag2"
                  placeholder="e.g., reliability"
                  value={tag2}
                  onChange={(e) => setTag2(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded">
                {error}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {success ? (
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Close
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setRating(0)
                  setComment('')
                  setTag1('')
                  setTag2('')
                  setError(null)
                  onOpenChange(false)
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !isConnected || rating === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

