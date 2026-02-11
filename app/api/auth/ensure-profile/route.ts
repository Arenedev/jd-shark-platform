import { createClient as createServiceClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { userId, email, fullName } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const supabase = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    let existingProfile = null
    try {
      const { data } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle()
      existingProfile = data
    } catch (err) {
      console.error("[v0] Error checking profile:", err)
      // Profile doesn't exist, that's fine
      existingProfile = null
    }

    // If profile already exists, return it
    if (existingProfile) {
      console.log("[v0] Profile already exists:", userId)
      return NextResponse.json({ message: "Profile already exists" }, { status: 200 })
    }

    console.log("[v0] Creating new profile for user:", userId)

    const { error: profileError, data: profileData } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        email,
        full_name: fullName || "User",
        base_structure: "user",
        rank: "bronze",
        current_rank: "bronze",
        is_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle()

    if (profileError) {
      console.error("[v0] Profile creation error:", profileError.message)
      return NextResponse.json({ message: `Failed to create profile: ${profileError.message}` }, { status: 500 })
    }

    console.log("[v0] Profile created on-demand:", profileData?.id)

    let existingWallet = null
    try {
      const { data } = await supabase.from("wallets").select("id").eq("user_id", userId).maybeSingle()
      existingWallet = data
    } catch (err) {
      console.error("[v0] Error checking wallet:", err)
      // Wallet doesn't exist, that's fine
      existingWallet = null
    }

    if (!existingWallet) {
      console.log("[v0] Creating new wallet for user:", userId)
      const { error: walletError } = await supabase
        .from("wallets")
        .insert({
          user_id: userId,
          balance: 0,
          currency: "NGN",
          total_funded: 0,
          total_withdrawn: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()

      if (walletError) {
        console.error("[v0] Wallet creation error:", walletError.message)
        // Don't fail if wallet creation fails, profile is more important
      } else {
        console.log("[v0] Wallet created on-demand for user:", userId)
      }
    }

    return NextResponse.json({ message: "Profile ensured", profile: profileData }, { status: 200 })
  } catch (error) {
    console.error("[v0] Ensure profile error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
