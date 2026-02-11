import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { investmentId } = body

    if (!investmentId) {
      return NextResponse.json({ error: "Investment ID required" }, { status: 400 })
    }

    // Get the investment
    const { data: investment, error: fetchError } = await supabase
      .from("lcr_investments")
      .select("*")
      .eq("id", investmentId)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !investment) {
      return NextResponse.json({ error: "Investment not found" }, { status: 404 })
    }

    // Check if already withdrawn
    if (investment.status === "withdrawn") {
      return NextResponse.json({ error: "Investment already withdrawn" }, { status: 400 })
    }

    // Check if matured
    const now = new Date()
    const maturityDate = new Date(investment.maturity_date)
    if (now < maturityDate) {
      return NextResponse.json({ error: "Investment has not matured yet" }, { status: 400 })
    }

    // Update investment status
    const { error: updateError } = await supabase
      .from("lcr_investments")
      .update({ status: "withdrawn" })
      .eq("id", investmentId)

    if (updateError) throw updateError

    // Credit user wallet
    const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", user.id).single()

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    const { error: balanceError } = await supabase
      .from("wallets")
      .update({ balance: (wallet.balance || 0) + investment.final_amount })
      .eq("user_id", user.id)

    if (balanceError) throw balanceError

    // Create transaction record
    await supabase.from("transactions").insert({
      user_id: user.id,
      transaction_type: "lcr_withdrawal",
      amount: investment.final_amount,
      description: `LCR Investment matured (₦${investment.amount.toLocaleString()} + ₦${(investment.final_amount - investment.amount).toLocaleString()} bonus)`,
      status: "completed",
    })

    return NextResponse.json({ success: true, amount: investment.final_amount })
  } catch (error: any) {
    console.error("Error withdrawing LCR investment:", error)
    return NextResponse.json({ error: error.message || "Failed to withdraw LCR investment" }, { status: 500 })
  }
}
