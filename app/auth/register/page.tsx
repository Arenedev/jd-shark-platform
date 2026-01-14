"use client"

import type React from "react"
import { Suspense, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createClient } from "@/lib/supabase/client"
import { verifyReferralCode } from "@/lib/api/referrals"
import { Loader2, Mail, Lock, User, Sparkles, UserCheck, Building2, Users, Briefcase } from "lucide-react"

type BaseStructure = "investor" | "organization" | "associate"

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifyingRef, setVerifyingRef] = useState(false)
  const [referrerName, setReferrerName] = useState<string | null>(null)
  const [referrerId, setReferrerId] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2>(1)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
    fullName: "",
    phone: "",
    referralCode: searchParams.get("ref") || "",
    baseStructure: "" as BaseStructure | "",
  })

  const hasReferralFromUrl = !!searchParams.get("ref")

  useEffect(() => {
    const verifyRef = async () => {
      if (formData.referralCode && formData.referralCode.length >= 3) {
        setVerifyingRef(true)
        try {
          const referrer = await verifyReferralCode(formData.referralCode)
          if (referrer) {
            setReferrerName(referrer.full_name)
            setReferrerId(referrer.id)
          } else {
            setReferrerName(null)
            setReferrerId(null)
          }
        } catch (err) {
          setReferrerName(null)
          setReferrerId(null)
        } finally {
          setVerifyingRef(false)
        }
      } else {
        setReferrerName(null)
        setReferrerId(null)
      }
    }

    const timer = setTimeout(verifyRef, 500)
    return () => clearTimeout(timer)
  }, [formData.referralCode])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleBaseStructureSelect = (value: BaseStructure) => {
    setFormData((prev) => ({ ...prev, baseStructure: value }))
    setError(null)
  }

  const handleContinueToStep2 = () => {
    if (!formData.baseStructure) {
      setError("Please select an account type")
      return
    }

    // Associate MUST have a valid referral code
    if (formData.baseStructure === "associate") {
      if (!formData.referralCode) {
        setError("Associates must register with a valid referral code")
        return
      }
      if (!referrerId) {
        setError("Please enter a valid referral code to register as an Associate")
        return
      }
    }

    setError(null)
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (formData.password !== formData.passwordConfirm) {
      setError("Passwords do not match")
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      const redirectUrl = siteUrl ? `${siteUrl}/auth/callback` : `${window.location.origin}/auth/callback`

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            referral_code: formData.referralCode || null,
            base_structure: formData.baseStructure,
          },
          emailRedirectTo: redirectUrl,
        },
      })

      if (authError) throw authError

      if (authData.user) {
        try {
          const createUserResponse = await fetch("/api/auth/create-user-data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: authData.user.id,
              email: formData.email,
              fullName: formData.fullName,
              phone: formData.phone,
              referralCode: formData.referralCode || null,
              referrerId: referrerId,
              baseStructure: formData.baseStructure,
            }),
          })

          if (!createUserResponse.ok) {
            const error = await createUserResponse.json()
            console.error("[v0] Profile creation warning:", error)
          }
        } catch (err) {
          console.error("[v0] Profile creation fetch error:", err)
        }
      }

      setSuccess(true)
    } catch (err) {
      console.error("[v0] Register error:", err)
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0e27] via-[#111d3d] to-[#1e3a5f] p-4">
        <Card className="w-full max-w-md bg-[#111d3d]/80 backdrop-blur-sm border-[#5dade2]/30 shadow-2xl animate-fade-in-up">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#5dade2] to-[#3a8d7a] rounded-full flex items-center justify-center mb-4 animate-scale-in">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-[#5dade2]">Check Your Email</CardTitle>
            <CardDescription className="text-[#a8b2c1] text-base">
              We've sent a confirmation link to <span className="text-[#d4a574] font-semibold">{formData.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-[#5dade2]/10 border-[#5dade2]/30">
              <AlertDescription className="text-[#5dade2] text-sm">
                Please check your inbox and click the confirmation link to activate your account. The link will expire
                in 24 hours.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => router.push("/auth/login")}
              className="w-full bg-gradient-to-r from-[#d4a574] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d4a574] text-[#0a0e27] font-semibold transition-all duration-300"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0e27] via-[#111d3d] to-[#1e3a5f] p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/abstract-financial-network.jpg')] opacity-5"></div>
      <div className="absolute top-20 left-10 w-72 h-72 bg-[#5dade2] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-glow"></div>
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-[#d4a574] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-glow"></div>

      <Card className="w-full max-w-md bg-[#111d3d]/80 backdrop-blur-sm border-[#5dade2]/30 shadow-2xl relative z-10 animate-fade-in-up">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#5dade2] to-[#3a8d7a] rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-[#d4a574] to-[#f59e0b] bg-clip-text text-transparent">
                Join JD SHARK
              </CardTitle>
              <CardDescription className="text-[#a8b2c1]">
                {step === 1 ? "Select your account type" : "Complete your registration"}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <div className={`h-1 flex-1 rounded ${step >= 1 ? "bg-[#5dade2]" : "bg-[#1e3a5f]"}`} />
            <div className={`h-1 flex-1 rounded ${step >= 2 ? "bg-[#5dade2]" : "bg-[#1e3a5f]"}`} />
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4 bg-red-900/20 border-red-600/50 animate-fade-in">
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Label className="text-[#a8b2c1]">Select Account Type</Label>
              <RadioGroup
                value={formData.baseStructure}
                onValueChange={(value) => handleBaseStructureSelect(value as BaseStructure)}
                className="space-y-3"
              >
                {/* Investor Option */}
                <div
                  className={`relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    formData.baseStructure === "investor"
                      ? "border-[#5dade2] bg-[#5dade2]/10"
                      : "border-[#1e3a5f] hover:border-[#5dade2]/50"
                  }`}
                  onClick={() => handleBaseStructureSelect("investor")}
                >
                  <RadioGroupItem value="investor" id="investor" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="investor" className="text-white font-medium flex items-center gap-2 cursor-pointer">
                      <Briefcase className="w-4 h-4 text-[#5dade2]" />
                      Investor
                    </Label>
                    <p className="text-xs text-[#a8b2c1] mt-1">
                      Personal investment account. Earn 7-8% PA based on tier. Referral optional.
                    </p>
                  </div>
                </div>

                {/* Organization Option */}
                <div
                  className={`relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    formData.baseStructure === "organization"
                      ? "border-[#5dade2] bg-[#5dade2]/10"
                      : "border-[#1e3a5f] hover:border-[#5dade2]/50"
                  }`}
                  onClick={() => handleBaseStructureSelect("organization")}
                >
                  <RadioGroupItem value="organization" id="organization" className="mt-1" />
                  <div className="flex-1">
                    <Label
                      htmlFor="organization"
                      className="text-white font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <Building2 className="w-4 h-4 text-[#d4a574]" />
                      Organization
                    </Label>
                    <p className="text-xs text-[#a8b2c1] mt-1">
                      Corporate account. Earn 8-9% PA. Loan access up to 80%. 1% referral commission.
                    </p>
                  </div>
                </div>

                {/* Associate Option */}
                <div
                  className={`relative flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                    formData.baseStructure === "associate"
                      ? "border-[#5dade2] bg-[#5dade2]/10"
                      : "border-[#1e3a5f] hover:border-[#5dade2]/50"
                  }`}
                  onClick={() => handleBaseStructureSelect("associate")}
                >
                  <RadioGroupItem value="associate" id="associate" className="mt-1" />
                  <div className="flex-1">
                    <Label
                      htmlFor="associate"
                      className="text-white font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-[#3a8d7a]" />
                      Associate
                    </Label>
                    <p className="text-xs text-[#a8b2c1] mt-1">
                      Network builder. Earn from PC + network commissions. Rank progression.{" "}
                      <span className="text-[#d4a574]">Referral required.</span>
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {/* Referral Code - Always visible but required for Associate */}
              <div className="space-y-2 pt-2">
                <Label htmlFor="referralCode" className="text-[#a8b2c1] flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Referral Code {formData.baseStructure === "associate" ? "(Required)" : "(Optional)"}
                </Label>
                <Input
                  id="referralCode"
                  name="referralCode"
                  placeholder="Enter referral code"
                  value={formData.referralCode}
                  onChange={handleChange}
                  disabled={loading}
                  className="bg-[#0a0e27] border-[#1e3a5f] text-white placeholder:text-[#2d3e52] focus:border-[#5dade2] focus:ring-[#5dade2] transition-all"
                />
                {verifyingRef && (
                  <p className="text-xs text-[#5dade2] flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Verifying code...
                  </p>
                )}
                {!verifyingRef && referrerName && (
                  <p className="text-xs text-green-400 flex items-center gap-2">
                    <UserCheck className="w-3 h-3" />
                    Referred by: {referrerName}
                  </p>
                )}
                {!verifyingRef && formData.referralCode && !referrerName && (
                  <p className="text-xs text-red-400">Invalid referral code</p>
                )}
              </div>

              <Button
                type="button"
                onClick={handleContinueToStep2}
                className="w-full bg-gradient-to-r from-[#d4a574] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d4a574] text-[#0a0e27] font-semibold transition-all duration-300 shadow-lg hover:shadow-[#d4a574]/50"
              >
                Continue
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#1e3a5f]"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#111d3d] px-2 text-[#2d3e52]">Already have an account?</span>
                </div>
              </div>

              <Link href="/auth/login">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-[#5dade2]/30 text-[#5dade2] hover:bg-[#5dade2]/10 hover:border-[#5dade2] transition-all bg-transparent"
                >
                  Sign In Instead
                </Button>
              </Link>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Show selected base structure */}
              <div className="flex items-center gap-2 p-2 bg-[#5dade2]/10 rounded-lg border border-[#5dade2]/30">
                {formData.baseStructure === "investor" && <Briefcase className="w-4 h-4 text-[#5dade2]" />}
                {formData.baseStructure === "organization" && <Building2 className="w-4 h-4 text-[#d4a574]" />}
                {formData.baseStructure === "associate" && <Users className="w-4 h-4 text-[#3a8d7a]" />}
                <span className="text-sm text-white capitalize">{formData.baseStructure} Account</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="ml-auto text-xs text-[#a8b2c1] hover:text-white"
                >
                  Change
                </Button>
              </div>

              {referrerName && (
                <div className="flex items-center gap-2 p-2 bg-green-900/20 rounded-lg border border-green-600/30">
                  <UserCheck className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">Referred by: {referrerName}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-[#a8b2c1] flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {formData.baseStructure === "organization" ? "Organization Name" : "Full Name"}
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  placeholder={formData.baseStructure === "organization" ? "Company Ltd" : "John Doe"}
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="bg-[#0a0e27] border-[#1e3a5f] text-white placeholder:text-[#2d3e52] focus:border-[#5dade2] focus:ring-[#5dade2] transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#a8b2c1] flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="bg-[#0a0e27] border-[#1e3a5f] text-white placeholder:text-[#2d3e52] focus:border-[#5dade2] focus:ring-[#5dade2] transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[#a8b2c1] flex items-center gap-2">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+234 800 000 0000"
                  value={formData.phone}
                  onChange={handleChange}
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
                <p className="text-xs text-[#2d3e52]">Minimum 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordConfirm" className="text-[#a8b2c1] flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Confirm Password
                </Label>
                <Input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  placeholder="••••••••"
                  value={formData.passwordConfirm}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="bg-[#0a0e27] border-[#1e3a5f] text-white placeholder:text-[#2d3e52] focus:border-[#5dade2] focus:ring-[#5dade2] transition-all"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 border-[#5dade2]/30 text-[#5dade2] hover:bg-[#5dade2]/10 hover:border-[#5dade2] transition-all bg-transparent"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-[#d4a574] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#d4a574] text-[#0a0e27] font-semibold transition-all duration-300 shadow-lg hover:shadow-[#d4a574]/50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0e27] via-[#111d3d] to-[#1e3a5f]">
          <Loader2 className="w-8 h-8 animate-spin text-[#5dade2]" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  )
}
