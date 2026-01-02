import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
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

    // First, get the user by email to get their UUID
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()

    if (listError || !users) {
      console.error("[v0] Error listing users:", listError)
      return NextResponse.json({ error: "Could not find user" }, { status: 500 })
    }

    const user = users.users.find((u) => u.email === email)

    if (!user) {
      console.error("[v0] User not found:", email)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Now update the user by their UUID with email_confirm
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirmed_at: new Date().toISOString(),
    })

    if (error) {
      console.error("[v0] Email verification error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[v0] API error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
