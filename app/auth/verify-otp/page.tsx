"use client"

import type React from "react"
import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

function VerifyOTPContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [otp, setOtp] = useState("")
  const [resendLoading, setResendLoading] = useState(false)

  const handleVerifyOTP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (!otp || otp.length !== 6) {
        setError("OTP must be 6 digits")
        setLoading(false)
        return
      }

      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to verify OTP")
      }

      setMessage("Email verified successfully! Redirecting to login...")
      setTimeout(() => {
        router.push("/auth/login")
      }, 2000)
    } catch (err) {
      console.error("[v0] OTP verification error:", err)
      setError(err instanceof Error ? err.message : "Verification failed")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setResendLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to resend OTP")
      }

      setMessage("OTP sent to your email. Check your inbox!")
    } catch (err) {
      console.error("[v0] Resend OTP error:", err)
      setError(err instanceof Error ? err.message : "Failed to resend OTP")
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <Card className="w-full max-w-md bg-slate-800 border-amber-600/30">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-amber-400">Verify Email</CardTitle>
          <CardDescription className="text-slate-400">Enter the 6-digit code sent to {email}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-600/50">
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="mb-4 bg-green-900/20 border-green-600/50">
              <AlertDescription className="text-green-400">{message}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <Label htmlFor="otp" className="text-slate-300">
                One-Time Password
              </Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                disabled={loading}
                className="bg-slate-700 border-slate-600 text-white text-center text-2xl letter-spacing tracking-widest placeholder:text-slate-500"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-all duration-200"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={resendLoading}
              onClick={handleResendOTP}
              className="w-full border-slate-600 text-amber-400 hover:bg-slate-700 transition-all duration-200 bg-transparent"
            >
              {resendLoading ? "Sending..." : "Resend OTP"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOTPContent />
    </Suspense>
  )
}
