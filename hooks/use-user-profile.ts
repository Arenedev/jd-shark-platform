"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface UserProfile {
  id: string
  email: string
  full_name: string
  phone: string | null
  username: string | null
  kyc_status: string | null
  created_at: string
  [key: string]: any
}

export function useUserProfile(userId: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      try {
        setLoading(true)
        const supabase = createClient()

        const { data, error } = await supabase.from("profiles").select("*").eq("id", userId)

        if (error) {
          console.error("[v0] Profile fetch error:", error)
          setError(error.message)
          return
        }

        if (data && data.length > 0) {
          console.log("[v0] Profile loaded:", data[0]?.id)
          setProfile(data[0])
          setError(null)
          return
        }

        console.warn("[v0] No profile found, attempting to create on-demand:", userId)
        const session = await supabase.auth.getSession()

        if (session.data?.session?.user?.email) {
          try {
            const response = await fetch("/api/auth/ensure-profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                email: session.data.session.user.email,
                fullName: session.data.session.user.user_metadata?.full_name || "User",
              }),
            })

            if (response.ok) {
              console.log("[v0] Profile created on-demand, refetching...")
              // Refetch the profile
              const { data: newProfile } = await supabase.from("profiles").select("*").eq("id", userId)
              if (newProfile && newProfile.length > 0) {
                setProfile(newProfile[0])
                setError(null)
                return
              }
            }
          } catch (err) {
            console.error("[v0] Failed to create profile on-demand:", err)
          }
        }

        setError("Profile not found and could not be created")
      } catch (err) {
        console.error("[v0] Unexpected profile error:", err)
        setError(err instanceof Error ? err.message : "Failed to load profile")
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userId])

  return { profile, loading, error }
}
