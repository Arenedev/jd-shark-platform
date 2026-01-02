import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: "Email and OTP code are required" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Ignored
          }
        },
      },
    })

    // Get the OTP record
    const { data: otpRecords, error: queryError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())

    if (queryError || !otpRecords || otpRecords.length === 0) {
      console.error("[v0] OTP verification error:", queryError)
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 })
    }

    const otpRecord = otpRecords[0]

    // Mark OTP as used
    const { error: updateError } = await supabase.from("otp_codes").update({ used: true }).eq("id", otpRecord.id)

    if (updateError) {
      console.error("[v0] OTP update error:", updateError)
      return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 })
    }

    // Get the user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()

    if (listError || !users) {
      console.error("[v0] Error listing users:", listError)
      return NextResponse.json({ error: "Could not verify user" }, { status: 500 })
    }

    const user = users.users.find((u) => u.email === email)

    if (!user) {
      console.error("[v0] User not found:", email)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Confirm the user's email
    const { error: confirmError } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirmed_at: new Date().toISOString(),
    })

    if (confirmError) {
      console.error("[v0] Email confirmation error:", confirmError)
      return NextResponse.json({ error: confirmError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "OTP verified successfully" })
  } catch (err) {
    console.error("[v0] API error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
