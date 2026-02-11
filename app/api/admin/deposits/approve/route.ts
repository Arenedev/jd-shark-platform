import { createClient as createServiceClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { depositId, adminId, action, note, rejectionReason } = await request.json()

    console.log("[v0] Deposit approval request:", { depositId, adminId, action })

    if (!depositId || !action) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ message: "Server configuration error" }, { status: 500 })
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

    const { data: deposit, error: depositError } = await supabase
      .from("deposits")
      .select("*")
      .eq("id", depositId)
      .maybeSingle()

    console.log("[v0] Deposit found:", deposit)
    console.log("[v0] Deposit error:", depositError)

    if (depositError) {
      console.error("[v0] Database error:", depositError)
      return NextResponse.json({ message: "Database error: " + depositError.message }, { status: 500 })
    }

    if (!deposit) {
      return NextResponse.json({ message: "Deposit request not found" }, { status: 404 })
    }

    if (deposit.status !== "pending") {
      return NextResponse.json({ message: "Deposit request already processed" }, { status: 400 })
    }

    const now = new Date().toISOString()

    if (action === "approve") {
      // Update deposit status to completed
      const { error: updateError } = await supabase
        .from("deposits")
        .update({
          status: "completed",
          updated_at: now,
        })
        .eq("id", depositId)

      if (updateError) {
        console.error("[v0] Update error:", updateError)
        return NextResponse.json({ message: "Failed to approve deposit: " + updateError.message }, { status: 500 })
      }

      // Get current wallet balance
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", deposit.user_id)
        .single()

      if (wallet) {
        await supabase
          .from("wallets")
          .update({
            balance: (wallet.balance || 0) + deposit.amount,
            total_funded: (wallet.total_funded || 0) + deposit.amount,
            updated_at: now,
          })
          .eq("id", wallet.id)
      }

      console.log("[v0] Deposit approved and wallet updated")
      return NextResponse.json({ message: "Deposit approved successfully" })
    } else {
      if (!rejectionReason) {
        return NextResponse.json({ message: "Rejection reason is required" }, { status: 400 })
      }

      const { error: updateError } = await supabase
        .from("deposits")
        .update({
          status: "failed",
          updated_at: now,
        })
        .eq("id", depositId)

      if (updateError) {
        console.error("[v0] Update error:", updateError)
        return NextResponse.json({ message: "Failed to reject deposit: " + updateError.message }, { status: 500 })
      }

      console.log("[v0] Deposit rejected")
      return NextResponse.json({ message: "Deposit rejected" })
    }
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
