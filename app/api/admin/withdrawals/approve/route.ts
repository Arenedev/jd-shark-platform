import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { withdrawalId, status, adminNote } = body

    if (!withdrawalId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    // Get withdrawal request
    const { data: withdrawal, error: fetchError } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("id", withdrawalId)
      .single()

    if (fetchError || !withdrawal) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 })
    }

    if (withdrawal.status !== "pending") {
      return NextResponse.json({ error: "Withdrawal already processed" }, { status: 400 })
    }

    // Update withdrawal status
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from("withdrawals")
      .update({
        status,
        approved_date: status === "approved" ? now : null,
        completed_date: status === "approved" ? now : null,
        updated_at: now,
      })
      .eq("id", withdrawalId)

    if (updateError) {
      console.error("[v0] Error updating withdrawal:", updateError)
      return NextResponse.json({ error: "Failed to update withdrawal" }, { status: 500 })
    }

    if (status === "approved") {
      // Get wallet balance
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", withdrawal.user_id)
        .single()

      if (wallet && wallet.balance >= withdrawal.amount) {
        // Deduct from wallet balance
        const { error: walletError } = await supabase
          .from("wallets")
          .update({
            balance: wallet.balance - withdrawal.amount,
            total_withdrawn: (wallet.total_withdrawn || 0) + withdrawal.amount,
            updated_at: now,
          })
          .eq("id", wallet.id)

        if (walletError) {
          console.error("[v0] Error updating wallet:", walletError)
        }
      }
    }

    return NextResponse.json({ message: "Withdrawal updated successfully" }, { status: 200 })
  } catch (error) {
    console.error("[v0] Withdrawal approval API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
