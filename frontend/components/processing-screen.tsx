"use client"

import { useEffect, useState } from "react"

export default function ProcessingScreen() {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("Verifying identity")

  const steps = ["Verifying identity", "Validating transaction", "Processing payment", "Confirming blockchain"]

  useEffect(() => {
    const stepDuration = 750
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 25
        const stepIndex = Math.floor(next / 25) - 1
        if (stepIndex >= 0 && stepIndex < steps.length) {
          setCurrentStep(steps[stepIndex])
        }
        return next > 100 ? 100 : next
      })
    }, stepDuration)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-12">
      <div>
        <h1 className="text-5xl font-bold text-center mb-4">Processing Payment</h1>
        <p className="text-center text-foreground/60 text-lg">{currentStep}</p>
      </div>

      {/* Animated Spinner */}
      <div className="relative w-32 h-32">
        <svg className="w-full h-full animate-spin" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="70 200"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Progress Bar */}
      <div className="w-80 space-y-2">
        <div className="flex justify-between text-sm text-foreground/60">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-2 bg-border">
          <div className="h-full bg-foreground transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <p className="text-sm text-foreground/60">Please do not close this window</p>
    </div>
  )
}
