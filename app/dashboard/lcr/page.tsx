"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Lock } from "lucide-react"

export default function LCRInvestmentsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [withdrawing, setWithdrawing] = useState<string | null>(null)
  const [amount, setAmount] = useState("")
  const [lockPeriod, setLockPeriod] = useState("90")
  const [walletBalance, setWalletBalance] = useState(0)
  const [investments, setInvestments] = useState<any[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      router.push("/auth/login")
      return
    }
    fetchData()
  }

  async function fetchData() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const [walletResult, investmentsResult] = await Promise.all([
        supabase.from("wallets").select("balance").eq("user_id", user.id).single(),
        supabase.from("lcr_investments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ])

      setWalletBalance(walletResult.data?.balance || 0)
      setInvestments(investmentsResult.data || [])
    } catch (error) {
      console.error("Error fetching LCR data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateInvestment(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setCreating(true)

    try {
      const investmentAmount = Number.parseFloat(amount)
      const lockDays = Number.parseInt(lockPeriod)

      if (investmentAmount <= 0) {
        setError("Please enter a valid amount")
        return
      }

      if (investmentAmount > walletBalance) {
        setError("Insufficient wallet balance")
        return
      }

      const response = await fetch("/api/lcr/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: investmentAmount, lockPeriodDays: lockDays }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create investment")
      }

      setSuccess("LCR investment created successfully!")
      setAmount("")
      fetchData()
    } catch (error: any) {
      setError(error.message || "Failed to create LCR investment")
    } finally {
      setCreating(false)
    }
  }

  async function handleWithdraw(investmentId: string) {
    setError("")
    setSuccess("")
    setWithdrawing(investmentId)

    try {
      const response = await fetch("/api/lcr/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investmentId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to withdraw investment")
      }

      setSuccess(`Investment withdrawn successfully! ₦${data.amount.toLocaleString()} credited to your wallet.`)
      fetchData()
    } catch (error: any) {
      setError(error.message || "Failed to withdraw investment")
    } finally {
      setWithdrawing(null)
    }
  }

  function calculateBonusRate(days: number): number {
    if (days >= 365) return 10
    if (days >= 180) return 5
    if (days >= 90) return 2
    return 0
  }

  const selectedLockDays = Number.parseInt(lockPeriod)
  const bonusRate = calculateBonusRate(selectedLockDays)
  const estimatedReturn = amount ? Number.parseFloat(amount) * (1 + bonusRate / 100) : 0

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading LCR investments...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">LCR Investments</h1>
          <p className="text-muted-foreground">Lock your capital and earn bonus interest</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦{walletBalance.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Available to invest</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Investments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{investments.filter((i) => i.status === "active").length}</div>
              <p className="text-xs text-muted-foreground">Currently locked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Invested</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₦
                {investments
                  .filter((i) => i.status === "active")
                  .reduce((sum, i) => sum + i.amount, 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Locked capital</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create New LCR Investment</CardTitle>
            <CardDescription>Lock your funds for a fixed period and earn guaranteed bonus interest</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateInvestment} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount">Investment Amount (₦)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  min="1"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lockPeriod">Lock Period</Label>
                <select
                  id="lockPeriod"
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={lockPeriod}
                  onChange={(e) => setLockPeriod(e.target.value)}
                >
                  <option value="90">3 Months (2% bonus)</option>
                  <option value="180">6 Months (5% bonus)</option>
                  <option value="365">12 Months (10% bonus)</option>
                </select>
              </div>

              {amount && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Investment Amount:</span>
                    <span className="font-semibold">₦{Number.parseFloat(amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Bonus Interest Rate:</span>
                    <span className="font-semibold text-primary">{bonusRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Lock Period:</span>
                    <span className="font-semibold">{selectedLockDays} days</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Total at Maturity:</span>
                      <span className="font-bold text-lg text-secondary">₦{estimatedReturn.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "Creating..." : "Create LCR Investment"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your LCR Investments</CardTitle>
            <CardDescription>View and manage your locked capital reserves</CardDescription>
          </CardHeader>
          <CardContent>
            {investments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Lock Period</TableHead>
                    <TableHead>Bonus Rate</TableHead>
                    <TableHead>Maturity Date</TableHead>
                    <TableHead>Final Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investments.map((investment) => {
                    const maturityDate = new Date(investment.maturity_date)
                    const isMatured = new Date() >= maturityDate
                    const daysRemaining = Math.ceil((maturityDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

                    return (
                      <TableRow key={investment.id}>
                        <TableCell className="font-semibold">₦{investment.amount.toLocaleString()}</TableCell>
                        <TableCell>{investment.lock_period_days} days</TableCell>
                        <TableCell className="text-primary">{investment.bonus_interest_rate}%</TableCell>
                        <TableCell>{maturityDate.toLocaleDateString()}</TableCell>
                        <TableCell className="font-semibold text-secondary">
                          ₦{investment.final_amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {investment.status === "withdrawn" ? (
                            <Badge className="bg-gray-100 text-gray-800">Withdrawn</Badge>
                          ) : isMatured ? (
                            <Badge className="bg-green-100 text-green-800">Matured</Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">{daysRemaining} days left</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {investment.status === "active" && isMatured && (
                            <Button
                              size="sm"
                              onClick={() => handleWithdraw(investment.id)}
                              disabled={withdrawing === investment.id}
                            >
                              {withdrawing === investment.id ? "Withdrawing..." : "Withdraw"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No LCR investments yet</p>
                <p className="text-sm text-muted-foreground">Create your first investment above</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
