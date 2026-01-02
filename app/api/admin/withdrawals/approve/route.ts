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

    // TODO: Add admin role check
    // For now, any authenticated user can approve (should be restricted to admins)

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
      .from("withdrawal_requests")
      .select("*, wallets(*)")
      .eq("id", withdrawalId)
      .single()

    if (fetchError || !withdrawal) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 })
    }

    if (withdrawal.status !== "pending") {
      return NextResponse.json({ error: "Withdrawal already processed" }, { status: 400 })
    }

    // Update withdrawal status
    const { error: updateError } = await supabase
      .from("withdrawal_requests")
      .update({
        status,
        admin_note: adminNote,
        approved_by: session.user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", withdrawalId)

    if (updateError) {
      console.error("[v0] Error updating withdrawal:", updateError)
      return NextResponse.json({ error: "Failed to update withdrawal" }, { status: 500 })
    }

    // If approved, deduct from wallet and create transaction
    if (status === "approved") {
      // Deduct from wallet
      const { error: walletError } = await supabase
        .from("wallets")
        .update({
          balance: withdrawal.wallets.balance - withdrawal.amount,
          total_withdrawn: (withdrawal.wallets.total_withdrawn || 0) + withdrawal.amount,
        })
        .eq("id", withdrawal.wallet_id)

      if (walletError) {
        console.error("[v0] Error updating wallet:", walletError)
        return NextResponse.json({ error: "Failed to update wallet" }, { status: 500 })
      }

      // Create transaction record
      const { error: transactionError } = await supabase.from("wallet_transactions").insert({
        wallet_id: withdrawal.wallet_id,
        type: "withdrawal",
        amount: withdrawal.amount,
        status: "completed",
        description: `Withdrawal to ${withdrawal.bank_name} - ${withdrawal.account_number}`,
        reference: `WD-${withdrawalId.substring(0, 8).toUpperCase()}`,
      })

      if (transactionError) {
        console.error("[v0] Error creating transaction:", transactionError)
      }
    }

    return NextResponse.json({ message: "Withdrawal updated successfully" }, { status: 200 })
  } catch (error) {
    console.error("[v0] Withdrawal approval API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
