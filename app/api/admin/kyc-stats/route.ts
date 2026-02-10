import { createServiceRoleClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    console.log("[v0] Fetching all KYC records for stats...")

    // Fetch all KYC records (not just pending) to get counts
    const { data, error } = await supabase
      .from("profiles")
      .select("id, kyc_status, created_at")
      .not("kyc_status", "is", null)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching KYC stats:", error)
      return NextResponse.json(
        { error: `Failed to fetch stats: ${error.message}` },
        { status: 400 }
      )
    }

    // Calculate counts by status
    const stats = {
      approved: 0,
      pending: 0,
      rejected: 0,
      total: data?.length || 0,
    }

    data?.forEach((record: any) => {
      if (record.kyc_status === "approved") stats.approved++
      else if (record.kyc_status === "pending") stats.pending++
      else if (record.kyc_status === "rejected") stats.rejected++
    })

    console.log("[v0] KYC stats calculated:", stats)

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error("[v0] KYC stats error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
