"use client"

import { Badge } from "@/components/ui/badge"

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
  const { referrals, stats, loading: referralsLoading, earnings, earningsLoading, referralsByLevel } = useReferrals()
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

  if (loading || referralsLoading || earningsLoading) {
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
              : "Direct referral system available for Organization accounts"}
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

            {/* Referrals by Level */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4, 5].map((level) => (
                <Card key={level}>
                  <CardHeader>
                    <CardTitle>Level {level} Referrals</CardTitle>
                    <CardDescription>
                      {referralsByLevel[level]?.length || 0} referral{referralsByLevel[level]?.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {referralsByLevel[level]?.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Joined</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {referralsByLevel[level]?.map((ref: any) => (
                            <TableRow key={ref.id}>
                              <TableCell className="font-medium">{ref.referred?.full_name || "Unknown"}</TableCell>
                              <TableCell>{ref.referred?.email}</TableCell>
                              <TableCell>{new Date(ref.created_at).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No referrals at this level yet</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Earnings History */}
            <Card>
              <CardHeader>
                <CardTitle>Earnings History</CardTitle>
                <CardDescription>Track all your referral earnings</CardDescription>
              </CardHeader>
              <CardContent>
                {earnings && earnings.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Level</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {earnings.map((earning: any) => (
                        <TableRow key={earning.id}>
                          <TableCell>Level {earning.level}</TableCell>
                          <TableCell className="font-semibold">₦{Number(earning.amount).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                earning.status === "credited"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {earning.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(earning.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No earnings yet</p>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Direct Referral System</h2>
                <p className="text-muted-foreground">
                  The direct referral system with 1% commission on investment returns is only available for Organization accounts. Please upgrade your account to access this feature.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
