"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import BackButton from "@/components/back-button"
import { createClient } from "@/lib/supabase/client"
import { useTransactions } from "@/hooks/use-transactions"

export default function TransactionsPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const { transactions: allTransactions, loading } = useTransactions(userId)
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([])

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/auth/login")
      } else {
        setUserId(session.user.id)
        setIsAuthenticated(true)
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    let filtered = allTransactions
    if (filterType !== "all") {
      filtered = filtered.filter((t) => t.type === filterType)
    }
    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.reference?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }
    setFilteredTransactions(filtered)
  }, [allTransactions, searchTerm, filterType])

  if (!isAuthenticated || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const totalTransactions = filteredTransactions.length
  const totalDeposits = filteredTransactions.filter((t) => t.type === "deposit").reduce((sum, t) => sum + t.amount, 0)
  const totalWithdrawals = filteredTransactions
    .filter((t) => t.type === "withdrawal")
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="space-y-6 animate-fade-in-up">
      <BackButton />

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Transaction History</h1>
        <p className="text-muted-foreground">View all your wallet transactions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{totalTransactions}</p>
          </CardContent>
        </Card>

        <Card className="hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Total Deposits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-accent">₦{totalDeposits.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Total Withdrawals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-secondary">₦{totalWithdrawals.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="hover:border-accent/50 transition-colors">
        <CardHeader>
          <CardTitle>Filter Transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by description or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-card border-border"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 rounded-md border border-border bg-card text-foreground"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="earnings">Earnings</option>
              <option value="investment">Investment</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="hover:border-accent/50 transition-colors">
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>{filteredTransactions.length} transactions found</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length > 0 ? (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="border border-border rounded-lg p-4 hover:border-accent/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">{transaction.reference}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          transaction.type === "withdrawal" ? "text-red-500" : "text-green-500"
                        }`}
                      >
                        {transaction.type === "withdrawal" ? "-" : "+"}₦{transaction.amount.toLocaleString()}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          transaction.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : transaction.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(transaction.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No transactions found</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
