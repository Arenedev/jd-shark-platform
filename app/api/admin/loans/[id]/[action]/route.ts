import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; action: string } },
) {
  try {
    const supabase = createClient()

    // Verify admin session
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminProfile } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!adminProfile) {
      return NextResponse.json({ error: "Not an admin" }, { status: 403 })
    }

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
    console.error("[v0] Loan action error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
