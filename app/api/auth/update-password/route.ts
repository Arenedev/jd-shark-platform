import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key instead of anon key
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      },
    )

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.user?.id) {
      console.log("[v0] No session found:", sessionError)
      return NextResponse.json({ error: "Unauthorized - no session" }, { status: 401 })
    }

    const userId = session.user.id

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    })

    if (updateError) {
      console.error("[v0] Password update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    console.log("[v0] Password updated successfully for user:", userId)
    return NextResponse.json({ success: true, message: "Password updated successfully" })
  } catch (error) {
    console.error("[v0] Password update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
