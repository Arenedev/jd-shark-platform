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
      const { data } = await supabase.from("profiles").select("id").eq("id", userId).single()
      existingProfile = data
    } catch (err) {
      // Profile doesn't exist, that's fine
      existingProfile = null
    }

    // If profile already exists, return it
    if (existingProfile) {
      console.log("[v0] Profile already exists:", userId)
      return NextResponse.json({ message: "Profile already exists" }, { status: 200 })
    }

    const { error: profileError, data: profileData } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        email,
        full_name: fullName || "User",
        kyc_status: "pending",
        base_structure: "investor",
        current_rank: "unranked",
        personal_capital: 0,
        network_capital: 0,
        grand_network_capital: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (profileError) {
      console.error("[v0] Profile creation error:", profileError)
      return NextResponse.json({ message: "Failed to create profile" }, { status: 500 })
    }

    console.log("[v0] Profile created on-demand:", profileData)

    let existingWallet = null
    try {
      const { data } = await supabase.from("wallets").select("id").eq("user_id", userId).single()
      existingWallet = data
    } catch (err) {
      // Wallet doesn't exist, that's fine
      existingWallet = null
    }

    if (!existingWallet) {
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
        console.error("[v0] Wallet creation error:", walletError)
        // Don't fail if wallet creation fails, profile is more important
      } else {
        console.log("[v0] Wallet created on-demand")
      }
    }

    return NextResponse.json({ message: "Profile ensured", profile: profileData }, { status: 200 })
  } catch (error) {
    console.error("[v0] Ensure profile error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
