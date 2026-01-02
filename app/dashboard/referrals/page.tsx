"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useReferrals } from "@/hooks/use-referrals"
import { Copy, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function ReferralsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { referrals, earnings, stats, loading: referralsLoading } = useReferrals()
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

  const referralsByLevel = {
    1: referrals?.filter((r: any) => r.level === 1) || [],
    2: referrals?.filter((r: any) => r.level === 2) || [],
    3: referrals?.filter((r: any) => r.level === 3) || [],
    4: referrals?.filter((r: any) => r.level === 4) || [],
    5: referrals?.filter((r: any) => r.level === 5) || [],
  }

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Referral System</h1>
          <p className="text-muted-foreground">Earn commissions from your referrals across 5 levels</p>
        </div>

        {/* Earnings Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">₦{(stats?.totalEarnings || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Credited</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">₦{(stats?.creditedEarnings || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">₦{(stats?.pendingEarnings || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Code */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Your Referral Code</CardTitle>
            <CardDescription>Share this code to earn commissions from referrals</CardDescription>
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
              Commission Rates: Level 1 (10%), Level 2 (5%), Level 3 (2%), Level 4 (1%), Level 5 (0.5%)
            </p>
          </CardContent>
        </Card>

        {/* Referrals by Level */}
        <div className="space-y-6">
          {[1, 2, 3, 4, 5].map((level) => (
            <Card key={level}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Level {level} Referrals</CardTitle>
                    <CardDescription>
                      {referralsByLevel[level as keyof typeof referralsByLevel]?.length || 0} referrals
                    </CardDescription>
                  </div>
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                    {level === 1 ? "10%" : level === 2 ? "5%" : level === 3 ? "2%" : level === 4 ? "1%" : "0.5%"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {referralsByLevel[level as keyof typeof referralsByLevel]?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referralsByLevel[level as keyof typeof referralsByLevel]?.map((ref: any) => (
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
      </div>
    </DashboardLayout>
  )
}
