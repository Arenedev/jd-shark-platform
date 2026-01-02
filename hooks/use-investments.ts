"use client"

import { useState, useEffect } from "react"
import { getUserInvestments } from "@/lib/api/investments"
import { createBrowserClient } from "@/lib/supabase/client"

export function useInvestments() {
  const [investments, setInvestments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadInvestments() {
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

        const data = await getUserInvestments(session.user.id)
        setInvestments(data)
        setError(null)
      } catch (err: any) {
        console.error("[v0] Error loading investments:", err)
        setError(err.message || "Failed to load investments")
      } finally {
        setLoading(false)
      }
    }

    loadInvestments()
  }, [])

  return { investments, loading, error }
}
