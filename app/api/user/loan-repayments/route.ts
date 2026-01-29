import { NextResponse, type NextRequest } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { put } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const loanId = formData.get("loanId") as string
    const userId = formData.get("userId") as string
    const amount = formData.get("amount") as string
    const principalAmount = formData.get("principalAmount") as string
    const interestAccrued = formData.get("interestAccrued") as string

    if (!file || !loanId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] Processing repayment for loan:", loanId)

    // Upload file to Blob storage
    let proofUrl = ""
    try {
      const buffer = await file.arrayBuffer()
      const blob = await put(`loan-repayments/${loanId}/${Date.now()}-${file.name}`, buffer, {
        access: "public",
      })
      proofUrl = blob.url
      console.log("[v0] Payment proof uploaded:", proofUrl)
    } catch (uploadError) {
      console.error("[v0] File upload error:", uploadError)
      return NextResponse.json({ error: "Failed to upload payment proof" }, { status: 500 })
    }

    // Create repayment request record using service role client
    const supabase = createServiceRoleClient()

    const { data: repayment, error: repaymentError } = await supabase
      .from("loan_repayment_requests")
      .insert({
        loan_id: loanId,
        user_id: userId,
        principal_amount: Number.parseFloat(principalAmount),
        interest_accrued: Number.parseFloat(interestAccrued),
        total_repayment_amount: Number.parseFloat(amount),
        payment_proof_url: proofUrl,
        status: "pending",
        requested_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (repaymentError) {
      console.error("[v0] Repayment creation error:", repaymentError.message)
      throw new Error("Failed to create repayment request")
    }

    console.log("[v0] Repayment request created:", repayment?.id)

    return NextResponse.json({
      success: true,
      repayment,
      message: "Repayment request submitted successfully",
    })
  } catch (error: any) {
    console.error("[v0] User repayment API error:", error.message || error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
