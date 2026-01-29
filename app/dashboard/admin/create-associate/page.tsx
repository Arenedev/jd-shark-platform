"use client"

import React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

export default function CreateAssociatePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [newAssociate, setNewAssociate] = useState<any>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      const response = await fetch("/api/admin/create-associate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to create associate account")
        return
      }

      setSuccess(true)
      setNewAssociate(data.user)
      setFormData({ email: "", password: "", fullName: "", phone: "" })

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(false)
        setNewAssociate(null)
      }, 5000)
    } catch (err) {
      console.error("[v0] Error creating associate:", err)
      setError("An error occurred while creating the associate account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Create Associate Account</h1>
          <p className="text-muted-foreground mt-2">
            Create a new associate account without requiring a referral code. Associates can then use their unique
            referral code to refer other associates.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>New Associate Details</CardTitle>
            <CardDescription>Fill in the information to create the associate account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="associate@example.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+234 (0) 123 456 7890"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter a secure password"
                  required
                />
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-600">{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Associate Account"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {success && newAssociate && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Associate Account Created
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold">{newAssociate.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold">{newAssociate.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Referral Code</p>
                <p className="font-mono font-semibold text-lg">{newAssociate.referralCode}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This code can be used by other associates to register
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-mono text-sm">{newAssociate.id}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
