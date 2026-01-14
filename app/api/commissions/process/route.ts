import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Verify admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Get period from request or use current month
    const { period } = await request.json()
    const processingPeriod = period || new Date().toISOString().slice(0, 7) // YYYY-MM

    // Call the database function to process commissions
    const { data: runId, error: processError } = await supabase.rpc("process_monthly_commissions", {
      p_period: processingPeriod,
    })

    if (processError) {
      console.error("[v0] Commission processing error:", processError)
      return NextResponse.json(
        { error: "Failed to process commissions", details: processError.message },
        { status: 500 },
      )
    }

    // Credit the pending commissions
    const { data: creditedCount, error: creditError } = await supabase.rpc("credit_pending_commissions", {
      p_period: processingPeriod,
    })

    if (creditError) {
      console.error("[v0] Commission crediting error:", creditError)
      return NextResponse.json({ error: "Failed to credit commissions", details: creditError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      runId,
      period: processingPeriod,
      creditedCount,
      message: `Successfully processed and credited ${creditedCount} commissions for ${processingPeriod}`,
    })
  } catch (error: any) {
    console.error("[v0] Commission processing error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
