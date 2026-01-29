import { createServiceRoleClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabaseServiceRole = createServiceRoleClient()

    const body = await request.json()
    const { email, password, fullName, phone } = body

    console.log("[v0] Creating associate for:", fullName, email)

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, password, and full name are required" },
        { status: 400 }
      )
    }

    // Create auth user using service role
    const { data: authData, error: signUpError } = await supabaseServiceRole.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (signUpError || !authData?.user) {
      console.error("[v0] Error creating auth user:", signUpError)
      return NextResponse.json({ error: signUpError?.message || "Failed to create user account" }, { status: 400 })
    }

    console.log("[v0] Auth user created:", authData.user.id)

    // Generate unique referral code: First 3 letters of name + timestamp
    const referralCode = `${fullName.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-5)}`

    // Create profile using service role
    const { data: profile, error: profileCreateError } = await supabaseServiceRole
      .from("profiles")
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        phone: phone || null,
        base_structure: "associate",
        referral_code: referralCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (profileCreateError) {
      console.error("[v0] Error creating profile:", profileCreateError)
      // Clean up auth user if profile creation fails
      await supabaseServiceRole.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: "Failed to create user profile: " + profileCreateError.message }, { status: 400 })
    }

    console.log("[v0] Profile created:", profile)

    // Create wallet using service role
    const { error: walletError } = await supabaseServiceRole.from("wallets").insert({
      user_id: authData.user.id,
      balance: 0,
      returns_balance: 0,
    })

    if (walletError) {
      console.error("[v0] Error creating wallet:", walletError)
    } else {
      console.log("[v0] Wallet created for:", authData.user.id)
    }

    console.log("[v0] Associate account created successfully:", authData.user.id, fullName)

    return NextResponse.json(
      {
        success: true,
        message: "Associate account created successfully",
        user: {
          id: authData.user.id,
          email: profile.email,
          fullName: profile.full_name,
          baseStructure: profile.base_structure,
          referralCode: referralCode,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[v0] Admin create associate error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
