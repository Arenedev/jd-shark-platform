"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { getUserBonuses, getUserIncentives, type WelcomeBonus, type Incentive } from "@/lib/api/special-features"
import { Gift, Trophy, Car, Plane } from "lucide-react"

export default function BonusesPage() {
  const [bonuses, setBonuses] = useState<WelcomeBonus[]>([])
  const [incentives, setIncentives] = useState<Incentive[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const [bonusesData, incentivesData] = await Promise.all([getUserBonuses(user.id), getUserIncentives(user.id)])

      setBonuses(bonusesData)
      setIncentives(incentivesData)
    } catch (err) {
      console.error("Error loading bonuses:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  const totalBonuses = bonuses.reduce((sum, b) => sum + (b.status === "credited" ? b.bonus_amount : 0), 0)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Bonuses & Incentives</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Bonuses Earned</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(totalBonuses)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Bonuses</CardDescription>
            <CardTitle className="text-3xl">{bonuses.filter((b) => b.status === "pending").length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Incentives</CardDescription>
            <CardTitle className="text-3xl">
              {incentives.filter((i) => i.status === "awarded" || i.status === "pending").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome Bonuses</CardTitle>
          <CardDescription>Bonuses for rank advancement</CardDescription>
        </CardHeader>
        <CardContent>
          {bonuses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No welcome bonuses yet. Advance to Core Investor or higher to receive bonuses!
            </p>
          ) : (
            <div className="space-y-3">
              {bonuses.map((bonus) => (
                <div key={bonus.id} className="border rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{bonus.rank_name}</p>
                    <p className="text-sm text-muted-foreground">Welcome Bonus</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{formatCurrency(bonus.bonus_amount)}</p>
                    <span
                      className={`text-sm px-2 py-1 rounded ${
                        bonus.status === "credited" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {bonus.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Special Incentives</CardTitle>
          <CardDescription>Perks and rewards for your achievements</CardDescription>
        </CardHeader>
        <CardContent>
          {incentives.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No incentives yet. Reach Alpha Investor rank to unlock amazing perks!
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {incentives.map((incentive) => (
                <div key={incentive.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      {incentive.incentive_type === "car" && <Car className="h-5 w-5" />}
                      {incentive.incentive_type === "vacation" && <Plane className="h-5 w-5" />}
                      {incentive.incentive_type === "leadership_title" && <Trophy className="h-5 w-5" />}
                      {!["car", "vacation", "leadership_title"].includes(incentive.incentive_type) && (
                        <Gift className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{incentive.title}</p>
                      {incentive.description && (
                        <p className="text-sm text-muted-foreground">{incentive.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            incentive.status === "awarded"
                              ? "bg-green-100 text-green-800"
                              : incentive.status === "claimed"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {incentive.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
