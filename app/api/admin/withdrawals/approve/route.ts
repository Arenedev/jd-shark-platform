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

    if (status === "approved") {
      // Check returns balance is sufficient
      const currentReturnsBalance = withdrawal.wallets.returns_balance || 0

      if (currentReturnsBalance < withdrawal.amount) {
        return NextResponse.json(
          {
            error: "Insufficient returns balance. This should not happen - withdrawal was validated.",
          },
          { status: 400 },
        )
      }

      // Deduct from returns_balance only (PC remains locked)
      const { error: walletError } = await supabase
        .from("wallets")
        .update({
          returns_balance: currentReturnsBalance - withdrawal.amount,
          balance: withdrawal.wallets.balance - withdrawal.amount, // Also deduct from total balance
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
        description: `Withdrawal from returns to ${withdrawal.bank_name} - ${withdrawal.account_number}`,
        reference: `WD-${withdrawalId.substring(0, 8).toUpperCase()}`,
        metadata: {
          source: "returns",
          bank_name: withdrawal.bank_name,
          account_number: withdrawal.account_number,
          account_name: withdrawal.account_name,
        },
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
