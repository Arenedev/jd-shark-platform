import { createClient } from "@/lib/supabase/client"

export async function getUserProfile(userId: string) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId)

    if (error) {
      console.error("[v0] Error fetching profile:", error)
      return null
    }

    // Return first result or null if empty
    if (!data || data.length === 0) {
      console.warn("[v0] No profile found for user:", userId)
      return null
    }

    return data[0]
  } catch (err) {
    console.error("[v0] Profile fetch error:", err)
    return null
  }
}

export async function updateUserProfile(userId: string, updates: Record<string, any>) {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("profiles").update(updates).eq("id", userId).select()

    if (error) {
      console.error("[v0] Error updating profile:", error)
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error("Profile update failed - no data returned")
    }

    return data[0]
  } catch (err) {
    console.error("[v0] Profile update error:", err)
    throw err
  }
}
