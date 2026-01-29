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
    const { data: existingProfile, error: checkError } = await supabase.from("profiles").select("id").eq("id", userId)

    if (checkError && checkError.code !== "PGRST116") {
      console.error("[v0] Profile check error:", checkError)
      return NextResponse.json({ message: "Failed to check profile" }, { status: 500 })
    }

    // Step 2: Create profile if it doesn't exist
    if (!existingProfile || existingProfile.length === 0) {
      console.log("[v0] Creating profile with base_structure:", userBaseStructure)

      const { error: profileError, data: profileData } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          email,
          full_name: fullName,
          phone: phone || null,
          kyc_status: "pending",
          base_structure: userBaseStructure,
          current_rank: userBaseStructure === "associate" ? "fin_starter" : null,
          personal_capital: 0,
          network_capital: 0,
          returns_balance: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()

      if (profileError) {
        console.error("[v0] Profile creation error:", profileError)
        if (profileError.code === "23505") {
          return NextResponse.json({ message: "This email is already registered" }, { status: 409 })
        }
        if (profileError.code === "23503") {
          return NextResponse.json({ message: "User authentication failed" }, { status: 500 })
        }
        return NextResponse.json({ message: "Failed to create profile" }, { status: 500 })
      }

      console.log("[v0] Profile created:", profileData)
    }

    // Step 3: Auto-confirm the user's email
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })

    if (updateAuthError) {
      console.error("[v0] Email confirmation error:", updateAuthError)
    }

    // Step 4: Create wallet with extended fields
    const { data: existingWallet, error: walletCheckError } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", userId)

    if (walletCheckError && walletCheckError.code !== "PGRST116") {
      console.error("[v0] Wallet check error:", walletCheckError)
      return NextResponse.json({ message: "Failed to check wallet" }, { status: 500 })
    }

    if (!existingWallet || existingWallet.length === 0) {
      const { error: walletError } = await supabase
        .from("wallets")
        .insert({
          user_id: userId,
          balance: 0,
          currency: "NGN",
          total_funded: 0,
          total_withdrawn: 0,
          personal_capital: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()

      if (walletError) {
        console.error("[v0] Wallet creation error:", walletError)
        if (walletError.code === "23503") {
          return NextResponse.json({ message: "Profile not found - wallet creation failed" }, { status: 500 })
        }
        return NextResponse.json({ message: "Failed to create wallet" }, { status: 500 })
      }
    }

    if (referrerId && referrerId !== userId) {
      try {
        // Check if referral already exists
        const { data: existingReferral } = await supabase
          .from("referrals")
          .select("id")
          .eq("referred_id", userId)
          .single()

        if (!existingReferral) {
          let commissionRate = 10 // Default for associates
          if (userBaseStructure === "organization") {
            commissionRate = 1 // 1% for organization referrals
          } else if (userBaseStructure === "investor") {
            commissionRate = 0 // Investors don't earn from referrals
          }

          const { error: refError } = await supabase.from("referrals").insert({
            referrer_id: referrerId,
            referred_id: userId,
            level: 1,
            commission_rate: commissionRate,
          })

          if (refError) {
            console.error("[v0] Referral creation error:", refError)
          }

          if (userBaseStructure === "associate") {
            // Get the referrer's referrer chain
            const { data: referrerProfile } = await supabase
              .from("profiles")
              .select("referrer_id")
              .eq("id", referrerId)
              .single()

            if (referrerProfile?.referrer_id) {
              let currentReferrerId = referrerProfile.referrer_id
              let level = 2

              while (currentReferrerId && level <= 5) {
                await supabase.from("referrals").insert({
                  referrer_id: currentReferrerId,
                  referred_id: userId,
                  level: level,
                  commission_rate: 0, // Commission calculated based on rank at earning time
                })

                // Get next level referrer
                const { data: nextReferrer } = await supabase
                  .from("profiles")
                  .select("referrer_id")
                  .eq("id", currentReferrerId)
                  .single()

                currentReferrerId = nextReferrer?.referrer_id
                level++
              }
            }
          }
        }
      } catch (refErr) {
        console.error("[v0] Referral processing error:", refErr)
      }
    }

    return NextResponse.json({ message: "User data created successfully" }, { status: 200 })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
