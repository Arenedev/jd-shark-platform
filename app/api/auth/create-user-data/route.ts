import { createClient as createServiceClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { userId, email, fullName, phone, referralCode, referrerId, baseStructure } = await request.json()

    if (!userId || !email || !fullName) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const validBaseStructures = ["investor", "organization", "associate"]
    const userBaseStructure = validBaseStructures.includes(baseStructure) ? baseStructure : "investor"

    // Create a Supabase client with service role key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log("[v0] API: Checking environment variables...")
    console.log("[v0] API: SUPABASE_URL exists:", !!supabaseUrl)
    console.log("[v0] API: SERVICE_ROLE_KEY exists:", !!supabaseServiceKey)

    if (!supabaseUrl) {
      console.error("[v0] API: Missing NEXT_PUBLIC_SUPABASE_URL")
      return NextResponse.json({ message: "Server configuration error: Missing Supabase URL" }, { status: 500 })
    }

    if (!supabaseServiceKey) {
      console.error("[v0] API: Missing SUPABASE_SERVICE_ROLE_KEY")
      return NextResponse.json({ message: "Server configuration error: Missing service role key. Contact admin." }, { status: 500 })
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

    // Step 1: Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)

    if (checkError) {
      console.error("[v0] Profile check error:", checkError.message, checkError.code)
    }

    // Step 2: Create profile if it doesn't exist
    if (!existingProfile || existingProfile.length === 0) {
      console.log("[v0] Creating profile with:", { userId, email, fullName, userBaseStructure })

      const { error: profileError, data: profileData } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          email,
          full_name: fullName,
          base_structure: userBaseStructure,
          rank: "bronze",
          current_rank: "bronze",
          is_admin: false,
          phone_number: phone || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()

      if (profileError) {
        console.error("[v0] Profile creation error details:", {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
        })
        if (profileError.code === "23505") {
          return NextResponse.json({ message: "This email is already registered" }, { status: 409 })
        }
        if (profileError.code === "23503") {
          return NextResponse.json({ message: "User authentication failed" }, { status: 500 })
        }
        return NextResponse.json({ message: `Failed to create profile: ${profileError.message}` }, { status: 500 })
      }

      console.log("[v0] Profile created successfully")
    } else {
      console.log("[v0] Profile already exists for user:", userId)
    }

    // Step 3: Note - Email confirmation is handled by Supabase Auth automatically
    console.log("[v0] User created with email:", email)

    // Step 4: Create wallet with extended fields
    const { data: existingWallet, error: walletCheckError } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", userId)

    if (walletCheckError) {
      console.error("[v0] Wallet check error:", walletCheckError.message)
    }

    if (!existingWallet || existingWallet.length === 0) {
      console.log("[v0] Creating wallet for user:", userId)

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
        console.error("[v0] Wallet creation error details:", {
          message: walletError.message,
          code: walletError.code,
          details: walletError.details,
        })
        if (walletError.code === "23503") {
          return NextResponse.json({ message: "Profile not found - wallet creation failed" }, { status: 500 })
        }
        return NextResponse.json({ message: `Failed to create wallet: ${walletError.message}` }, { status: 500 })
      }

      console.log("[v0] Wallet created successfully for user:", userId)
    } else {
      console.log("[v0] Wallet already exists for user:", userId)
    }

    if (referrerId && referrerId !== userId) {
      try {
        // Check if referral already exists
        const { data: existingReferral } = await supabase
          .from("referrals")
          .select("id")
          .eq("referred_id", userId)
          .maybeSingle()

        if (!existingReferral) {
          // Create referral relationship
          const { error: refError } = await supabase.from("referrals").insert({
            referrer_id: referrerId,
            referred_id: userId,
            status: "active",
          })

          if (refError) {
            console.error("[v0] Referral creation error:", refError)
          } else {
            console.log("[v0] Referral created successfully for user:", userId)
          }
        }
      } catch (refErr) {
        console.error("[v0] Referral processing error:", refErr)
        // Non-blocking error - don't fail the entire registration
      }
    }

    return NextResponse.json({ message: "User data created successfully" }, { status: 200 })
  } catch (error) {
    console.error("[v0] API error:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ message: errorMessage }, { status: 500 })
  }
}
