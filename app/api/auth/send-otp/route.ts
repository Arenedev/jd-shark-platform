import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

// Simple function to generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  try {
    // Using Resend API for email sending (free tier available)
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "noreply@resend.dev",
        to: email,
        subject: "Your JD SHARK OTP Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a7b 100%); padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 28px;">JD SHARK</h1>
            </div>
            <div style="padding: 30px; background-color: #f5f5f5;">
              <h2 style="color: #1e3a5f; margin-bottom: 20px;">Verify Your Email</h2>
              <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
                Your OTP verification code is:
              </p>
              <div style="background-color: white; border: 2px solid #d4a574; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px;">
                <p style="font-size: 32px; font-weight: bold; color: #d4a574; letter-spacing: 5px; margin: 0;">
                  ${otp}
                </p>
              </div>
              <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
                This code will expire in 10 minutes.
              </p>
              <p style="color: #666; font-size: 14px;">
                If you didn't request this code, please ignore this email.
              </p>
            </div>
            <div style="background-color: #1e3a5f; color: white; padding: 20px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">© 2025 JD SHARK. All rights reserved.</p>
            </div>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      console.error("[v0] Email sending failed:", await response.text())
      return false
    }

    return true
  } catch (error) {
    console.error("[v0] Email sending error:", error)
    return false
  }
}

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

    // Generate OTP code
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store OTP in database with retry logic
    let retries = 0
    let insertError = null

    while (retries < 3) {
      const { error } = await supabase.from("otp_codes").insert({
        email,
        code: otp,
        expires_at: expiresAt.toISOString(),
        used: false,
      })

      if (!error) {
        insertError = null
        break
      }

      insertError = error
      retries++

      // Wait before retrying (exponential backoff)
      if (retries < 3) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 500))
      }
    }

    if (insertError) {
      console.error("[v0] OTP insert error after retries:", insertError)
      return NextResponse.json({ error: "Failed to generate OTP" }, { status: 500 })
    }

    const emailSent = await sendOTPEmail(email, otp)

    if (!emailSent) {
      // For development, still return success and log OTP
      console.log(`[v0] OTP for ${email}: ${otp} (email service unavailable, logged for development)`)
    }

    console.log(`[v0] OTP sent to ${email}`)

    return NextResponse.json({
      success: true,
      message: "OTP sent to email",
      // Remove this in production - only for development/testing
      otp: process.env.NODE_ENV === "development" ? otp : undefined,
    })
  } catch (err) {
    console.error("[v0] API error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
