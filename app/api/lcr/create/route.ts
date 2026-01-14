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
    const { amount, lockPeriodDays } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    if (!lockPeriodDays || lockPeriodDays < 30) {
      return NextResponse.json({ error: "Minimum lock period is 30 days" }, { status: 400 })
    }

    // Check wallet balance
    const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", user.id).single()

    if (!wallet || wallet.balance < amount) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
    }

    // Calculate bonus interest
    let bonusInterestRate = 0
    if (lockPeriodDays >= 365) {
      bonusInterestRate = 10
    } else if (lockPeriodDays >= 180) {
      bonusInterestRate = 5
    } else if (lockPeriodDays >= 90) {
      bonusInterestRate = 2
    }

    const startDate = new Date()
    const maturityDate = new Date(startDate)
    maturityDate.setDate(maturityDate.getDate() + lockPeriodDays)

    const finalAmount = amount * (1 + bonusInterestRate / 100)

    // Create LCR investment
    const { data: investment, error: investmentError } = await supabase
      .from("lcr_investments")
      .insert({
        user_id: user.id,
        amount,
        lock_period_days: lockPeriodDays,
        bonus_interest_rate: bonusInterestRate,
        start_date: startDate.toISOString(),
        maturity_date: maturityDate.toISOString(),
        status: "active",
        final_amount: finalAmount,
      })
      .select()
      .single()

    if (investmentError) throw investmentError

    // Deduct from wallet
    const { error: walletError } = await supabase
      .from("wallets")
      .update({ balance: wallet.balance - amount })
      .eq("user_id", user.id)

    if (walletError) throw walletError

    // Create transaction record
    await supabase.from("wallet_transactions").insert({
      user_id: user.id,
      type: "debit",
      amount,
      description: `LCR Investment (${lockPeriodDays} days, ${bonusInterestRate}% bonus)`,
      status: "completed",
    })

    return NextResponse.json({ success: true, investment })
  } catch (error: any) {
    console.error("Error creating LCR investment:", error)
    return NextResponse.json({ error: error.message || "Failed to create LCR investment" }, { status: 500 })
  }
}
