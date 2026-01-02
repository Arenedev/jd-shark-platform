"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createPortfolio } from "@/lib/api/portfolios"
import { createClient } from "@/lib/supabase/client"

export default function NewPortfolioPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    portfolio_type: "Personal",
    purpose: "",
  })

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user?.id) {
        setUserId(session.user.id)
        console.log("[v0] User ID loaded:", session.user.id)

        // Fetch profile
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

        if (profileData) {
          setProfile(profileData)
        }
      }
    }

    fetchUser()
  }, [])

  const handleChange = (e: any) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!formData.name.trim()) {
        throw new Error("Portfolio name is required")
      }

      if (!userId) {
        throw new Error("User not authenticated")
      }

      console.log("[v0] Creating portfolio for user:", userId)

      await createPortfolio({
        name: formData.name,
        portfolio_type: formData.portfolio_type,
        purpose: formData.purpose || "",
        owner_id: userId,
        current_owner_id: userId,
      })

      console.log("[v0] Portfolio created successfully")
      router.push("/dashboard/portfolios")
    } catch (err) {
      console.error("[v0] Portfolio creation error:", err)
      setError(err instanceof Error ? err.message : "Failed to create portfolio")
    } finally {
      setLoading(false)
    }
  }

  if (!userId) {
    return (
      <DashboardLayout profile={profile}>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout profile={profile}>
      <div className="max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Create Portfolio</h1>
          <p className="text-muted-foreground">Set up a new portfolio for your savings and investments</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Portfolio Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Emergency Fund, House Fund"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="portfolio_type">Portfolio Type</Label>
                <select
                  id="portfolio_type"
                  name="portfolio_type"
                  value={formData.portfolio_type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="Personal">Personal</option>
                  <option value="For Others">For Others</option>
                  <option value="For Purpose">For a Purpose</option>
                </select>
              </div>

              {formData.portfolio_type === "For Purpose" && (
                <div>
                  <Label htmlFor="purpose">Purpose</Label>
                  <Input
                    id="purpose"
                    name="purpose"
                    placeholder="e.g., Car, House, Rent, Education"
                    value={formData.purpose}
                    onChange={handleChange}
                  />
                </div>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1 bg-primary hover:bg-primary/90">
                  {loading ? "Creating..." : "Create Portfolio"}
                </Button>
                <Button variant="outline" onClick={() => router.back()} className="flex-1 bg-transparent">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
