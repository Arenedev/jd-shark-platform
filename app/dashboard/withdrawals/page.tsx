"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { createBrowserClient } from "@/lib/supabase/client"
import { useWallet } from "@/hooks/use-wallet"

interface WithdrawalRequest {
  id: string
  amount: number
  status: string
  bank_name: string
  account_number: string
  account_name: string
  admin_note?: string
  created_at: string
}

export default function WithdrawalsPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { wallet, loading: walletLoading } = useWallet()
  const [profile, setProfile] = useState<any>(null)

  const [formData, setFormData] = useState({
    amount: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
  })

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/auth/login")
        return
      }

      // Fetch profile
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

      setProfile(profileData)

      // Fetch withdrawals
      await fetchWithdrawals()
      setMounted(true)
    }

    checkAuth()
  }, [router])

  const fetchWithdrawals = async () => {
    try {
      const response = await fetch("/api/withdrawals/list")
      if (response.ok) {
        const result = await response.json()
        setWithdrawals(result.data || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching withdrawals:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const amount = Number(formData.amount)

      if (amount < 1000) {
        throw new Error("Minimum withdrawal is ₦1,000")
      }

      if (!wallet || amount > wallet.balance) {
        throw new Error("Insufficient balance")
      }

      const response = await fetch("/api/withdrawals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          accountName: formData.accountName,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit withdrawal request")
      }

      toast({
        title: "Success",
        description: "Withdrawal request submitted successfully",
      })

      setFormData({ amount: "", bankName: "", accountNumber: "", accountName: "" })
      await fetchWithdrawals()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit withdrawal request",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted || walletLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <DashboardLayout profile={profile}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Withdrawals</h1>
          <p className="text-muted-foreground">Withdraw your earnings to your bank account</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Request Withdrawal</CardTitle>
              <CardDescription>Available Balance: ₦{wallet?.balance.toLocaleString() || "0"}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="amount">Amount (₦)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min="1000"
                    max={wallet?.balance || 0}
                    value={formData.amount}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    placeholder="e.g., GTBank, Access Bank"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleChange}
                    placeholder="e.g., 1234567890"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleChange}
                    placeholder="e.g., John Doe"
                    required
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Processing..." : "Request Withdrawal"}
                </Button>

                <Alert>
                  <AlertDescription className="text-xs">
                    Withdrawals are processed within 24 hours. You'll receive an email confirmation once approved.
                  </AlertDescription>
                </Alert>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Withdrawal History</CardTitle>
              <CardDescription>Your recent withdrawal requests</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading...</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {withdrawals.length > 0 ? (
                        withdrawals.map((withdrawal) => (
                          <TableRow key={withdrawal.id}>
                            <TableCell className="font-medium">₦{withdrawal.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  withdrawal.status === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : withdrawal.status === "rejected"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell>{new Date(withdrawal.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                            No withdrawal requests yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
