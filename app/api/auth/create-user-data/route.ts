import { createClient as createServiceClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { userId, email, fullName, referralCode } = await request.json()

    if (!userId || !email || !fullName) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    // Create a Supabase client with service role key to bypass RLS
    const supabase = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Step 1: Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase.from("profiles").select("id").eq("id", userId)

    if (checkError && checkError.code !== "PGRST116") {
      console.error("[v0] Profile check error:", checkError)
      return NextResponse.json({ message: "Failed to check profile" }, { status: 500 })
    }

    // Step 2: Create profile if it doesn't exist
    if (!existingProfile || existingProfile.length === 0) {
      const { error: profileError, data: profileData } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          email,
          full_name: fullName,
          kyc_status: "pending",
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
          // User doesn't exist in auth
          return NextResponse.json({ message: "User authentication failed" }, { status: 500 })
        }
        return NextResponse.json({ message: "Failed to create profile" }, { status: 500 })
      }

      console.log("[v0] Profile created:", profileData)
    }

    // Step 3: Auto-confirm the user's email in auth so Supabase doesn't send confirmation email
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    })

    if (updateAuthError) {
      console.error("[v0] Email confirmation error:", updateAuthError)
      // Don't fail registration if email confirmation fails, continue
    } else {
      console.log("[v0] Email auto-confirmed for user:", userId)
    }

    // Step 4: Create wallet
    const { data: existingWallet, error: walletCheckError } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", userId)

    if (walletCheckError && walletCheckError.code !== "PGRST116") {
      console.error("[v0] Wallet check error:", walletCheckError)
      return NextResponse.json({ message: "Failed to check wallet" }, { status: 500 })
    }

    if (!existingWallet || existingWallet.length === 0) {
      const { error: walletError, data: walletData } = await supabase
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
        if (walletError.code === "23503") {
          return NextResponse.json({ message: "Profile not found - wallet creation failed" }, { status: 500 })
        }
        return NextResponse.json({ message: "Failed to create wallet" }, { status: 500 })
      }

      console.log("[v0] Wallet created:", walletData)
    }

    if (referralCode) {
      try {
        // Find the referrer by username or ID
        const { data: referrer, error: referrerError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .or(`username.eq.${referralCode},id.eq.${referralCode}`)
          .single()

        if (!referrerError && referrer && referrer.id !== userId) {
          // Create the referral relationship
          const { error: refError } = await supabase.from("referrals").insert({
            referrer_id: referrer.id,
            referred_id: userId,
            level: 1,
            commission_rate: 10,
          })

          if (refError) {
            console.error("[v0] Referral creation error:", refError)
          } else {
            console.log("[v0] Referral created for user:", userId, "referred by:", referrer.id)
          }
        }
      } catch (refErr) {
        console.error("[v0] Referral processing error:", refErr)
        // Don't fail registration if referral fails
      }
    }

    return NextResponse.json({ message: "User data created successfully" }, { status: 200 })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
