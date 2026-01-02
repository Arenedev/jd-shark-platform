"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Mail, Lock, TrendingUp } from "lucide-react"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!formData.email || !formData.password) {
        throw new Error("Email and password are required")
      }

      const supabase = createClient()

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (authError) {
        console.error("[v0] Login error:", authError)
        throw new Error(authError.message || "Invalid login credentials. Please check your email and password.")
      }

      if (data.user) {
        console.log("[v0] Login successful, user:", data.user.id)
        localStorage.setItem("isAuthenticated", "true")
        localStorage.setItem("userId", data.user.id)
        window.location.href = "/dashboard"
      }
    } catch (err) {
      console.error("[v0] Login error:", err)
      setError(err instanceof Error ? err.message : "Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0e27] via-[#111d3d] to-[#1e3a5f] p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/abstract-financial-graph.jpg')] opacity-5"></div>
      <div className="absolute top-20 right-10 w-96 h-96 bg-[#5dade2] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-glow"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-[#d4a574] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-glow"></div>

      <Card className="w-full max-w-md bg-[#111d3d]/80 backdrop-blur-sm border-[#5dade2]/30 shadow-2xl relative z-10 animate-fade-in-up">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#5dade2] to-[#3a8d7a] rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[#d4a574] to-[#f59e0b] bg-clip-text text-transparent">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-[#a8b2c1]">Sign in to your JD SHARK account</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-600/50 animate-fade-in">
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#a8b2c1] flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                className="bg-[#0a0e27] border-[#1e3a5f] text-white placeholder:text-[#2d3e52] focus:border-[#5dade2] focus:ring-[#5dade2] transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#a8b2c1] flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                className="bg-[#0a0e27] border-[#1e3a5f] text-white placeholder:text-[#2d3e52] focus:border-[#5dade2] focus:ring-[#5dade2] transition-all"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#d4a574] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d4a574] text-[#0a0e27] font-semibold transition-all duration-300 shadow-lg hover:shadow-[#d4a574]/50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#1e3a5f]"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#111d3d] px-2 text-[#2d3e52]">Don't have an account?</span>
              </div>
            </div>

            <Link href="/auth/register">
              <Button
                type="button"
                variant="outline"
                className="w-full border-[#5dade2]/30 text-[#5dade2] hover:bg-[#5dade2]/10 hover:border-[#5dade2] transition-all bg-transparent"
              >
                Create Account
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
