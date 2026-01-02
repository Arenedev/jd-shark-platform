"use client"

import { useState, useEffect } from "react"
import { fetchUserTransactions, type Transaction } from "@/lib/api/wallet"

export function useTransactions(userId: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const loadTransactions = async () => {
      setLoading(true)
      setError(null)

      try {
        const txData = await fetchUserTransactions(userId)
        setTransactions(txData)
      } catch (err) {
        console.error("[v0] Error loading transactions:", err)
        setError("Failed to load transactions")
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [userId])

  const refetch = async () => {
    if (!userId) return
    const txData = await fetchUserTransactions(userId)
    setTransactions(txData)
  }

  return { transactions, loading, error, refetch }
}
