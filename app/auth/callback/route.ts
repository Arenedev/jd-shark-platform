import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

  console.log("[v0] Auth callback received")
  console.log("[v0] Code:", code ? "present" : "missing")
  console.log("[v0] Origin:", origin)
  console.log("[v0] Full URL:", request.url)

  if (code) {
    try {
      const supabase = await createClient()

      console.log("[v0] Exchanging code for session...")
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("[v0] Error exchanging code:", error)
        return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`)
      }

      console.log("[v0] Session exchange successful")
      console.log("[v0] User:", data?.user?.email)

      // Redirect to dashboard after successful callback
      return NextResponse.redirect(`${origin}/dashboard`)
    } catch (error) {
      console.error("[v0] Callback error:", error)
      return NextResponse.redirect(`${origin}/auth/login?error=unexpected_error`)
    }
  }

  // If no code, redirect to login
  console.log("[v0] No code provided, redirecting to login")
  return NextResponse.redirect(`${origin}/auth/login`)
}
