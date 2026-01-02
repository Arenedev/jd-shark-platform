"use client"

import { useState, useEffect } from "react"
import { getUserPortfolios } from "@/lib/api/portfolios"
import { createBrowserClient } from "@/lib/supabase/client"

export function usePortfolios() {
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPortfolios() {
      try {
        setLoading(true)
        const supabase = createBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user?.id) {
          setError("No user session found")
          return
        }

        const data = await getUserPortfolios(session.user.id)
        setPortfolios(data)
        setError(null)
      } catch (err: any) {
        console.error("[v0] Error loading portfolios:", err)
        setError(err.message || "Failed to load portfolios")
      } finally {
        setLoading(false)
      }
    }

    loadPortfolios()
  }, [])

  return { portfolios, loading, error, refetch: () => {} }
}
