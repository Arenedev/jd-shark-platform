"use client"

import { useReferrals } from "@/hooks/use-referrals"
import { createClient } from "@/lib/supabase/client"
import { Check, Copy } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function ReferralsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { referrals, stats, loading: referralsLoading } = useReferrals()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user?.id) {
        setUserId(session.user.id)

        // Fetch profile
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

        if (profileData) {
          setProfile(profileData)
          console.log("[v0] Profile loaded for referrals:", profileData.id)
        }
      }

      setLoading(false)
    }

    fetchUser()
  }, [])

  if (loading || referralsLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const referralCode = userId ? userId.substring(0, 8).toUpperCase() : "LOADING"

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Referral System</h1>
          <p className="text-muted-foreground">
            {profile?.base_structure === "organization"
              ? "Earn 1% commission on your direct referrals' investment returns"
              : "Referral system is not available for your account type"}
          </p>
        </div>

        {/* Only show for Organization accounts */}
        {profile?.base_structure === "organization" ? (
          <>
            {/* Earnings Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Direct Referrals</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-primary">{stats?.totalReferrals || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Commission Earned (1%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">₦{(stats?.totalEarnings || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>

            {/* Referral Code */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Your Referral Code</CardTitle>
                <CardDescription>Share this code to invite people and earn 1% on their investment returns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-6 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Your Code</p>
                      <code className="text-3xl font-bold text-primary tracking-wider">{referralCode}</code>
                    </div>
                  </div>
                  <Button size="lg" onClick={handleCopyCode} className="bg-primary hover:bg-primary/90 gap-2">
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Code
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Commission Rate: 1% on direct referrals' investment returns
                </p>
              </CardContent>
            </Card>

            {/* Direct Referrals Table */}
            <Card>
              <CardHeader>
                <CardTitle>Your Direct Referrals</CardTitle>
                <CardDescription>
                  {referrals?.length || 0} direct referral{referrals?.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {referrals && referrals.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Date Referred</TableHead>
                        <TableHead className="text-right">Commission Earned</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrals.map((referral: any) => (
                        <TableRow key={referral.id}>
                          <TableCell>{referral.full_name || "N/A"}</TableCell>
                          <TableCell>{referral.email}</TableCell>
                          <TableCell>{new Date(referral.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600">
                            ₦{(referral.commission_earned || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No direct referrals yet. Share your code to get started!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Referral System Not Available</h2>
                <p className="text-muted-foreground">
                  The referral system is only available for Organization accounts. Your account type ({profile?.base_structure}) does not have access to this feature.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
