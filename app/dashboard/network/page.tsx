"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "@/hooks/use-user-profile"
import { getNetworkStats, getRanks, getRankHistory } from "@/lib/api/rank-system"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Users, TrendingUp, Award, Target, ArrowUp, CheckCircle2 } from "lucide-react"

export default function NetworkPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const { profile, loading: profileLoading } = useUserProfile(userId)
  const [networkStats, setNetworkStats] = useState<any>(null)
  const [ranks, setRanks] = useState<any[]>([])
  const [rankHistory, setRankHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.log("[v0] Network page: No user, redirecting to login")
        router.push("/auth/login")
        return
      }

      console.log("[v0] Network page: User ID set:", user.id)
      setUserId(user.id)
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    const loadNetworkData = async () => {
      if (!userId) {
        console.log("[v0] Network page: No userId, skipping load")
        return
      }

      try {
        console.log("[v0] Network page: Loading network data for user:", userId)
        const [stats, ranksData, history] = await Promise.all([
          getNetworkStats(userId),
          getRanks(),
          getRankHistory(userId),
        ])

        console.log("[v0] Network page: Data loaded - stats:", stats, "ranks:", ranksData.length)
        setNetworkStats(stats)
        setRanks(ranksData)
        setRankHistory(history)
        setLoading(false)
      } catch (error) {
        console.error("[v0] Network page: Error loading network data:", error)
        setError(error instanceof Error ? error.message : "Failed to load network data")
        setLoading(false)
      }
    }

    if (userId) {
      loadNetworkData()
    }
  }, [userId])

  const handleUpdateRank = async () => {
    if (!userId) return

    setUpdating(true)
    try {
      const response = await fetch("/api/rank/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) throw new Error("Failed to update rank")

      // Reload network stats
      const stats = await getNetworkStats(userId)
      setNetworkStats(stats)

      // Reload history
      const history = await getRankHistory(userId)
      setRankHistory(history)
    } catch (error) {
      console.error("[v0] Error updating rank:", error)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading network data...</div>
  }

  if (error) {
    return (
      <DashboardLayout profile={profile}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Error Loading Network Data</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!networkStats) {
    return (
      <DashboardLayout profile={profile}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Network Data Not Available</h2>
            <p className="text-muted-foreground">Unable to load your network information</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-8">
        {/* Only show rank system for associate accounts */}
        {profile?.base_structure === "associate" ? (
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Network & Rank System</h1>
                <p className="text-muted-foreground">Track your network growth and rank progression</p>
              </div>
              <Button onClick={handleUpdateRank} disabled={updating}>
                {updating ? "Updating..." : "Update Rank"}
              </Button>
            </div>

            {/* Current Rank Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Current Rank
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="default" className="text-lg">
                    {networkStats?.currentRank || "Unranked"}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Personal Capital
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₦{networkStats && typeof networkStats.personalCapital === "number" ? networkStats.personalCapital.toLocaleString() : "0"}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Network Capital
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₦{networkStats && typeof networkStats.networkCapital === "number" ? networkStats.networkCapital.toLocaleString() : "0"}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Network Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{networkStats?.totalNetworkMembers || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {networkStats?.directReferrals || 0} direct referrals
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Progress to Next Rank */}
            {networkStats?.nextRank && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUp className="h-5 w-5" />
                    Progress to {networkStats.nextRank}
                  </CardTitle>
                  <CardDescription>Keep growing your PC and NC to advance to the next rank</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-medium">{networkStats.progressToNextRank.toFixed(1)}%</span>
                    </div>
                    <Progress value={networkStats.progressToNextRank} className="h-3" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Network Generations */}
            <Card>
              <CardHeader>
                <CardTitle>Network Structure by Generation</CardTitle>
                <CardDescription>View your network members organized by generation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(networkStats?.generations || {}).map(([gen, count]) => (
                    <div key={gen} className="flex items-center justify-between">
                      <span className="text-sm font-medium">Generation {gen}</span>
                      <Badge variant="secondary">{count as number} members</Badge>
                    </div>
                  ))}
                  {Object.keys(networkStats?.generations || {}).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No network members yet. Start referring others to build your network.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Rank History */}
            <Card>
              <CardHeader>
                <CardTitle>Rank History</CardTitle>
                <CardDescription>Your rank advancement journey</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rankHistory.map((history) => (
                    <div key={history.id} className="flex items-start gap-3 border-b pb-3 last:border-0">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{history.new_rank}</span>
                          {history.old_rank && (
                            <>
                              <span className="text-muted-foreground">from</span>
                              <span className="text-muted-foreground">{history.old_rank}</span>
                            </>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          PC: ₦{history.pc_at_time ? history.pc_at_time.toLocaleString() : "0"} | NC: ₦{history.nc_at_time ? history.nc_at_time.toLocaleString() : "0"}
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(history.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {rankHistory.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No rank changes yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* All Ranks Reference */}
            <Card>
              <CardHeader>
                <CardTitle>Rank Requirements</CardTitle>
                <CardDescription>Overview of all available ranks and their requirements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ranks.map((rank) => (
                    <div
                      key={rank.id}
                      className={`p-4 rounded-lg border ${
                        rank.rank_name === networkStats?.currentRank ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{rank.rank_name}</h3>
                        {rank.rank_name === networkStats?.currentRank && <Badge variant="default">Current</Badge>}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Min PC:</span>{" "}
                          <span className="font-medium">₦{(rank.min_personal_capital || 0).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Min NC:</span>{" "}
                          <span className="font-medium">₦{rank.min_network_capital ? rank.min_network_capital.toLocaleString() : "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">PC ROI:</span>{" "}
                          <span className="font-medium">{rank.pc_roi_percentage || 0}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">NC Commission:</span>{" "}
                          <span className="font-medium">{rank.nc_commission_percentage || 0}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Rank System Not Available</h2>
                <p className="text-muted-foreground">
                  The rank system is only available for Associate accounts. Your account type ({profile?.base_structure}) does not have access to this feature.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
