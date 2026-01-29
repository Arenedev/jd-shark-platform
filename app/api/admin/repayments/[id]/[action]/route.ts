import { NextResponse, type NextRequest } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; action: string } },
) {
  try {
    const supabase = createServiceRoleClient()

    const { id, action } = params
    const body = await request.json()

    if (action === "approve") {
      // Update repayment request status to approved
      const { data: repayment, error: updateError } = await supabase
        .from("loan_repayment_requests")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()

      if (updateError) throw updateError

      // Update the loan status to repaid and update repaid_amount
      if (repayment?.loan_id) {
        const { error: loanError } = await supabase
          .from("organization_loans")
          .update({
            status: "repaid",
            repaid_amount: repayment.total_repayment_amount,
          })
          .eq("id", repayment.loan_id)

        if (loanError) throw loanError
      }

      console.log("[v0] Repayment approved:", id)
      return NextResponse.json({ repayment, success: true, message: "Repayment approved successfully" })
    } else if (action === "reject") {
      // Set status to rejected
      const { data: repayment, error } = await supabase
        .from("loan_repayment_requests")
        .update({
          status: "rejected",
        })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      console.log("[v0] Repayment rejected:", id)
      return NextResponse.json({ repayment, success: true, message: "Repayment rejected successfully" })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("[v0] Repayment action error:", error.message)
    return NextResponse.json({ error: error.message || "Failed to process repayment" }, { status: 500 })
  }
}
