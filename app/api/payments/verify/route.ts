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

    const body = await request.json()
    const { reference } = body

    if (!reference) {
      return NextResponse.json({ error: "Missing payment reference" }, { status: 400 })
    }

    // Verify payment with Paystack
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY

    if (!paystackSecretKey) {
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 })
    }

    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
      },
    })

    const paystackData = await paystackResponse.json()

    if (!paystackResponse.ok || !paystackData.status || paystackData.data.status !== "success") {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 })
    }

    const amount = paystackData.data.amount / 100 // Convert from kobo to naira

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("id, balance, total_funded")
      .eq("user_id", session.user.id)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 })
    }

    // Update wallet balance
    const { error: updateError } = await supabase
      .from("wallets")
      .update({
        balance: wallet.balance + amount,
        total_funded: (wallet.total_funded || 0) + amount,
      })
      .eq("id", wallet.id)

    if (updateError) {
      console.error("[v0] Error updating wallet:", updateError)
      return NextResponse.json({ error: "Failed to update wallet" }, { status: 500 })
    }

    // Create transaction record
    const { error: transactionError } = await supabase.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      type: "deposit",
      amount,
      status: "completed",
      description: "Wallet funding via Paystack",
      reference,
    })

    if (transactionError) {
      console.error("[v0] Error creating transaction:", transactionError)
    }

    return NextResponse.json({ message: "Payment verified successfully", amount }, { status: 200 })
  } catch (error) {
    console.error("[v0] Payment verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
