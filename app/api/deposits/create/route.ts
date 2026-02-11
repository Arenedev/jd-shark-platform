import { createClient as createServiceClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { userId, amount, paymentMethod, paymentProofUrl } = await request.json()

    if (!userId || !amount || !paymentMethod) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    if (amount < 1000) {
      return NextResponse.json({ message: "Minimum deposit is ₦1,000" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ message: "Server configuration error" }, { status: 500 })
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", userId)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json({ message: "Wallet not found" }, { status: 404 })
    }

    const reference = `DEP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Create deposit request using the deposits table
    const { data: depositRequest, error: depositError } = await supabase
      .from("deposits")
      .insert({
        user_id: userId,
        amount,
        payment_method: paymentMethod,
        transaction_reference: reference,
        status: "pending",
      })
      .select()
      .single()

    if (depositError) {
      console.error("Deposit request error:", depositError)
      return NextResponse.json({ message: "Failed to create deposit request" }, { status: 500 })
    }

    // Deposit requests table already tracks pending deposits

    return NextResponse.json({
      message: "Deposit request created successfully",
      data: depositRequest,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
