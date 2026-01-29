import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const supabaseServiceRole = createServiceRoleClient()

    // Try to get the authenticated user
    let user = null
    try {
      const { data } = await supabase.auth.getUser()
      user = data?.user
    } catch (err) {
      console.error("[v0] Could not get user from session:", err)
    }

    if (!user) {
      console.error("[v0] Admin auth error: No authenticated user")
      return NextResponse.json({ error: "Unauthorized - please log in" }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("[v0] Error fetching admin profile:", profileError)
      return NextResponse.json({ error: "Could not verify admin status" }, { status: 403 })
    }

    if (!adminProfile || adminProfile.role !== "admin") {
      console.error("[v0] User is not an admin:", user.id)
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

    // Create profile using service role
    const { data: profile, error: profileCreateError } = await supabaseServiceRole
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

    if (profileCreateError) {
      console.error("[v0] Error creating profile:", profileCreateError)
      // Clean up auth user if profile creation fails
      await supabaseServiceRole.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: "Failed to create user profile" }, { status: 400 })
    }

    // Create wallet using service role
    const { error: walletError } = await supabaseServiceRole.from("wallets").insert({
      user_id: authData.user.id,
      balance: 0,
      returns_balance: 0,
    })

    if (walletError) {
      console.error("[v0] Error creating wallet:", walletError)
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
          referralCode: authData.user.id.substring(0, 8).toUpperCase(),
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
