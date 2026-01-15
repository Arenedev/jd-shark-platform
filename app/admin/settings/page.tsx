"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBrowserClient } from "@/lib/supabase/client"
import { checkAdminSession } from "@/lib/admin-auth"
import { Save, SettingsIcon } from "lucide-react"

export default function AdminSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [baseROI, setBaseROI] = useState("15")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const isAuthenticated = checkAdminSession()
    if (!isAuthenticated) {
      router.push("/admin/login")
      return
    }

    fetchSettings()
  }, [router])

  const fetchSettings = async () => {
    try {
      const supabase = createBrowserClient()
      const { data } = await supabase.from("system_config").select("*").eq("key", "base_roi").single()

      if (data) {
        setBaseROI(data.value)
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    setMessage("")

    try {
      const supabase = createBrowserClient()

      const { error } = await supabase
        .from("system_config")
        .upsert({ key: "base_roi", value: baseROI, updated_at: new Date().toISOString() })

      if (error) throw error

      setMessage("Settings saved successfully!")
      setTimeout(() => setMessage(""), 3000)
    } catch (error) {
      console.error("Error saving settings:", error)
      setMessage("Error saving settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Settings</h1>
          <p className="text-muted-foreground mt-2">Configure platform parameters</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              Investment Settings
            </CardTitle>
            <CardDescription>Configure return rates and investment parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baseROI">Base ROI (Annual %)</Label>
              <Input
                id="baseROI"
                type="number"
                value={baseROI}
                onChange={(e) => setBaseROI(e.target.value)}
                placeholder="15"
                min="0"
                max="100"
                step="0.1"
              />
              <p className="text-sm text-muted-foreground">
                Base annual return on investment percentage. LCR bonuses are added on top of this rate.
              </p>
            </div>

            {message && (
              <div
                className={`p-3 rounded-lg ${message.includes("Error") ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"}`}
              >
                {message}
              </div>
            )}

            <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LCR Lock Bonuses</CardTitle>
            <CardDescription>Additional return rates for locked capital</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
              <span className="font-medium">No Lock</span>
              <span className="text-muted-foreground">Base ROI only</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
              <span className="font-medium">1 Year Lock</span>
              <span className="text-green-600 font-medium">+5% Bonus</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
              <span className="font-medium">10 Years Lock</span>
              <span className="text-green-600 font-medium">+10% Bonus</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Returns Schedule</CardTitle>
            <CardDescription>Investment return calculation timeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                <span className="font-medium">Wait Period</span>
                <span className="text-muted-foreground">4 months after approval</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-accent/5 rounded-lg">
                <span className="font-medium">Calculation Frequency</span>
                <span className="text-muted-foreground">Monthly</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
