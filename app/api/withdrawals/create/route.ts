import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { canWithdraw } from "@/lib/api/balances"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { amount, bankName, accountNumber, accountName } = body

    if (!amount || !bankName || !accountNumber || !accountName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (amount < 1000) {
      return NextResponse.json({ error: "Minimum withdrawal is ₦1,000" }, { status: 400 })
    }

    const withdrawalCheck = await canWithdraw(session.user.id, amount)

    if (!withdrawalCheck.canWithdraw) {
      return NextResponse.json({ error: withdrawalCheck.reason || "Cannot withdraw" }, { status: 400 })
    }

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("user_id", session.user.id)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    // Create withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from("withdrawals")
      .insert({
        user_id: session.user.id,
        amount,
        bank_name: bankName,
        bank_account_number: accountNumber,
        account_holder_name: accountName,
        status: "pending",
        request_date: new Date().toISOString(),
      })
      .select()
      .single()

    if (withdrawalError) {
      console.error("[v0] Withdrawal creation error:", withdrawalError)
      return NextResponse.json({ error: "Failed to create withdrawal request" }, { status: 500 })
    }

    return NextResponse.json({ data: withdrawal }, { status: 201 })
  } catch (error) {
    console.error("[v0] Withdrawal API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
