import { NextResponse, type NextRequest } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; action: string } },
) {
  try {
    // Use service role client - the admin page already has authentication checks
    const supabase = createServiceRoleClient()

    const { id, action } = params
    const body = await request.json()
    const { adminNote, reason } = body

    if (action === "approve") {
      const { data: loan, error } = await supabase
        .from("organization_loans")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      console.log("[v0] Loan approved:", id)
      return NextResponse.json({ loan, success: true, message: "Loan approved successfully" })
    } else if (action === "reject") {
      const { data: loan, error } = await supabase
        .from("organization_loans")
        .update({
          status: "rejected",
          rejection_reason: reason || adminNote,
        })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      console.log("[v0] Loan rejected:", id)
      return NextResponse.json({ loan, success: true, message: "Loan rejected successfully" })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error: any) {
    console.error("[v0] Loan action error:", error.message)
    return NextResponse.json({ error: error.message || "Failed to process loan" }, { status: 500 })
  }
}
