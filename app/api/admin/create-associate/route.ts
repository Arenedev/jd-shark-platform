import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import * as bcrypt from "bcrypt"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Verify admin user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin (you can add role checking here)
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single()

    if (!adminProfile || adminProfile.role !== "admin") {
      return NextResponse.json({ error: "Only admins can create associates" }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, fullName, phone } = body

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, password, and full name are required" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create auth user
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (signUpError || !authData.user) {
      console.error("[v0] Error creating auth user:", signUpError)
      return NextResponse.json({ error: "Failed to create user account" }, { status: 400 })
    }

    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        phone: phone || null,
        base_structure: "associate",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (profileError) {
      console.error("[v0] Error creating profile:", profileError)
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: "Failed to create user profile" }, { status: 400 })
    }

    // Create wallet
    const { error: walletError } = await supabase.from("wallets").insert({
      user_id: authData.user.id,
      balance: 0,
      returns_balance: 0,
    })

    if (walletError) {
      console.error("[v0] Error creating wallet:", walletError)
    }

    console.log("[v0] Associate account created:", authData.user.id, fullName)

    return NextResponse.json(
      {
        success: true,
        message: "Associate account created successfully",
        user: {
          id: authData.user.id,
          email: profile.email,
          fullName: profile.full_name,
          baseStructure: profile.base_structure,
          referralCode: authData.user.id.substring(0, 8).toUpperCase(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[v0] Admin create associate error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
