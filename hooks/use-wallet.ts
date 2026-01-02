"use client"

import { useState, useEffect } from "react"
import { fetchUserWallet, type Wallet } from "@/lib/api/wallet"

export function useWallet(userId: string | null) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const loadWallet = async () => {
      setLoading(true)
      setError(null)

      try {
        const walletData = await fetchUserWallet(userId)
        if (walletData) {
          setWallet(walletData)
        } else {
          setError("Wallet not found")
        }
      } catch (err) {
        console.error("[v0] Error loading wallet:", err)
        setError("Failed to load wallet")
      } finally {
        setLoading(false)
      }
    }

    loadWallet()
  }, [userId])

  const refetch = async () => {
    if (!userId) return
    const walletData = await fetchUserWallet(userId)
    if (walletData) {
      setWallet(walletData)
    }
  }

  return { wallet, loading, error, refetch }
}
