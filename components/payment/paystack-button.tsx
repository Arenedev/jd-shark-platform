"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface PaystackButtonProps {
  amount: number
  description?: string
  onSuccess?: (reference: string) => void
  disabled?: boolean
}

export function PaystackButton({
  amount,
  description = "Wallet Funding",
  onSuccess,
  disabled = false,
}: PaystackButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handlePayment = async () => {
    setLoading(true)
    try {
      // Initialize payment
      const initResponse = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, description }),
      })

      if (!initResponse.ok) {
        const error = await initResponse.json()
        throw new Error(error.error || "Failed to initialize payment")
      }

      const paymentData = await initResponse.json()

      // Redirect to Paystack checkout
      window.location.href = paymentData.authorization_url
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to process payment",
      })
      setLoading(false)
    }
  }

  return (
    <Button onClick={handlePayment} disabled={loading || disabled} className="w-full">
      {loading ? "Processing..." : `Fund Wallet (₦${amount.toLocaleString()})`}
    </Button>
  )
}
