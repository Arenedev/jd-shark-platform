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

    // Get all pending commissions for the period
    const { data: pendingCommissions, error: fetchError } = await supabase
      .from("commissions")
      .select("*")
      .eq("status", "pending")
      .gte("created_at", `${processingPeriod}-01`)
      .lt("created_at", `${processingPeriod}-32`)

    if (fetchError) {
      console.error("[v0] Fetch commissions error:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch commissions", details: fetchError.message },
        { status: 500 },
      )
    }

    if (!pendingCommissions || pendingCommissions.length === 0) {
      return NextResponse.json({
        success: true,
        period: processingPeriod,
        creditedCount: 0,
        message: `No commissions to process for ${processingPeriod}`,
      })
    }

    let creditedCount = 0

    // Process each commission
    for (const commission of pendingCommissions) {
      // Update commission status
      await supabase
        .from("commissions")
        .update({ status: "approved" })
        .eq("id", commission.id)

      // Credit user's wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", commission.user_id)
        .single()

      if (wallet) {
        await supabase
          .from("wallets")
          .update({ balance: (wallet.balance || 0) + commission.amount })
          .eq("user_id", commission.user_id)
      }

      creditedCount++
    }

    return NextResponse.json({
      success: true,
      period: processingPeriod,
      creditedCount,
      message: `Successfully processed and credited ${creditedCount} commissions for ${processingPeriod}`,
    })
  } catch (error: any) {
    console.error("[v0] Commission processing error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
