"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "@/hooks/use-user-profile"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { verifyReferralCode, updateUserReferrer } from "@/lib/api/referrals"
import { Loader2, UserCheck } from "lucide-react"

export default function SettingsPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { profile, loading: profileLoading } = useUserProfile(userId)
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    username: "",
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)

  const [referralCode, setReferralCode] = useState("")
  const [verifyingRef, setVerifyingRef] = useState(false)
  const [referrerName, setReferrerName] = useState<string | null>(null)
  const [hasReferrer, setHasReferrer] = useState(false)
  const [referralSaving, setReferralSaving] = useState(false)
  const [referralError, setReferralError] = useState<string | null>(null)
  const [referralSuccess, setReferralSuccess] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          router.push("/auth/login")
          return
        }

        setUserId(session.user.id)
        setMounted(true)
      } catch (err) {
        router.push("/auth/login")
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        username: profile.username || "",
      })
    }
  }, [profile])

  useEffect(() => {
    const checkReferrer = async () => {
      if (userId) {
        try {
          const supabase = createClient()
          const { data, error } = await supabase.from("referrals").select("*").eq("referred_id", userId).single()

          if (!error && data) {
            setHasReferrer(true)
          }
        } catch (err) {
          console.error("[v0] Error checking referrer:", err)
        }
      }
    }

    checkReferrer()
  }, [userId])

  useEffect(() => {
    const verifyRef = async () => {
      if (referralCode && referralCode.length >= 3) {
        setVerifyingRef(true)
        try {
          const referrer = await verifyReferralCode(referralCode)
          if (referrer) {
            setReferrerName(referrer.full_name)
          } else {
            setReferrerName(null)
          }
        } catch (err) {
          setReferrerName(null)
        } finally {
          setVerifyingRef(false)
        }
      } else {
        setReferrerName(null)
      }
    }

    const timer = setTimeout(verifyRef, 500)
    return () => clearTimeout(timer)
  }, [referralCode])

  if (!mounted || profileLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">Error loading profile</div>
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError(null)
    setSaved(false)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setPasswordError(null)
    setPasswordSaved(false)
  }

  const handlePasswordUpdate = async () => {
    setPasswordError(null)
    setPasswordSaved(false)

    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("New password fields are required")
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match")
      return
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return
    }

    setPasswordSaving(true)

    try {
      const supabase = createClient()

      console.log("[v0] Updating password via client...")

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      })

      if (updateError) {
        console.error("[v0] Password update error:", updateError)
        setPasswordError(updateError.message || "Failed to update password")
      } else {
        console.log("[v0] Password updated successfully")
        setPasswordSaved(true)
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        })
        setTimeout(() => setPasswordSaved(false), 3000)
      }
    } catch (err) {
      console.error("[v0] Password update error:", err)
      setPasswordError(err instanceof Error ? err.message : "Failed to update password")
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          username: formData.username,
        })
        .eq("id", userId)

      if (updateError) throw updateError

      console.log("[v0] Profile updated successfully")
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error("[v0] Save error:", err)
      setError(err instanceof Error ? err.message : "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  const handleReferralSubmit = async () => {
    setReferralError(null)
    setReferralSuccess(false)

    if (!referralCode || !referrerName) {
      setReferralError("Please enter a valid referral code")
      return
    }

    setReferralSaving(true)

    try {
      await updateUserReferrer(userId!, referralCode)
      setReferralSuccess(true)
      setHasReferrer(true)
      setReferralCode("")
      setReferrerName(null)
      setTimeout(() => setReferralSuccess(false), 3000)
    } catch (err) {
      console.error("[v0] Referral submission error:", err)
      setReferralError(err instanceof Error ? err.message : "Failed to add referral code")
    } finally {
      setReferralSaving(false)
    }
  }

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        {/* Account Information */}
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-600/50">
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  disabled={saving}
                  className="bg-card border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={saving}
                  className="bg-card border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled
                  className="bg-card border-border text-foreground opacity-75 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={saving}
                  className="bg-card border-border text-foreground"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              {saved && <Badge className="bg-green-100 text-green-800">Changes saved!</Badge>}
            </div>
          </CardContent>
        </Card>

        {!hasReferrer && (
          <Card className="animate-fade-in-up border-primary/20" style={{ animationDelay: "0.05s" }}>
            <CardHeader>
              <CardTitle>Referral Code</CardTitle>
              <CardDescription>Add a referral code to get connected with your referrer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {referralError && (
                <Alert variant="destructive" className="bg-red-900/20 border-red-600/50">
                  <AlertDescription className="text-red-400">{referralError}</AlertDescription>
                </Alert>
              )}
              {referralSuccess && (
                <Alert className="bg-green-900/20 border-green-600/50">
                  <AlertDescription className="text-green-400">Referral code added successfully!</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="referralCode" className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Enter Referral Code
                </Label>
                <Input
                  id="referralCode"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Enter code"
                  disabled={referralSaving}
                  className="bg-card border-border text-foreground"
                />
                {verifyingRef && (
                  <p className="text-xs text-primary flex items-center gap-2">
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
                {!verifyingRef && referralCode && !referrerName && referralCode.length >= 3 && (
                  <p className="text-xs text-red-400">Invalid referral code</p>
                )}
              </div>

              <Button
                onClick={handleReferralSubmit}
                disabled={referralSaving || !referrerName}
                className="bg-primary hover:bg-primary/90"
              >
                {referralSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Referral Code"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {hasReferrer && (
          <Card className="animate-fade-in-up border-green-600/20" style={{ animationDelay: "0.05s" }}>
            <CardHeader>
              <CardTitle>Referral Status</CardTitle>
              <CardDescription>You are connected with a referrer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-800 dark:text-green-300">
                  You have successfully joined through a referral
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Account Status */}
        <Card className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
            <CardDescription>Your account verification and security status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border">
              <div>
                <p className="font-medium text-foreground">KYC Verification</p>
                <p className="text-sm text-muted-foreground">Know Your Customer verification status</p>
              </div>
              <Badge className="bg-green-100 text-green-800">{profile?.kyc_status || "Pending"}</Badge>
            </div>
            <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border">
              <div>
                <p className="font-medium text-foreground">Account Created</p>
                <p className="text-sm text-muted-foreground">
                  Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>Manage your password and security preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {passwordError && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-600/50">
                <AlertDescription className="text-red-400">{passwordError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <Input
                id="new_password"
                name="newPassword"
                type="password"
                placeholder="••••••••"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                disabled={passwordSaving}
                className="bg-card border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input
                id="confirm_password"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                disabled={passwordSaving}
                className="bg-card border-border text-foreground"
              />
            </div>
            <div className="flex gap-4">
              <Button
                onClick={handlePasswordUpdate}
                disabled={passwordSaving}
                className="bg-primary hover:bg-primary/90"
              >
                {passwordSaving ? "Updating..." : "Update Password"}
              </Button>
              {passwordSaved && <Badge className="bg-green-100 text-green-800">Password updated!</Badge>}
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Choose how you want to be notified</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border">
              <div>
                <p className="font-medium text-foreground">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 cursor-pointer" />
            </div>
            <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border">
              <div>
                <p className="font-medium text-foreground">SMS Alerts</p>
                <p className="text-sm text-muted-foreground">Get important alerts via SMS</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 cursor-pointer" />
            </div>
            <div className="flex items-center justify-between p-4 bg-card/50 rounded-lg border border-border">
              <div>
                <p className="font-medium text-foreground">Transaction Notifications</p>
                <p className="text-sm text-muted-foreground">Alert on all transactions</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 cursor-pointer" />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
