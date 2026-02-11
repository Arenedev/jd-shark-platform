import { createServiceRoleClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { userId, status } = await request.json()

    if (!userId || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Missing userId or invalid status" },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    console.log(`[v0] Admin: ${status === "approved" ? "Approving" : "Rejecting"} KYC for user:`, userId)

    // Update profile with KYC status - mark profile as complete
    const { data, error } = await supabase
      .from("profiles")
      .update({
        profile_complete: status === "approved",
      })
      .eq("id", userId)
      .select()

    if (error) {
      console.error("[v0] Admin: KYC update error:", error)
      return NextResponse.json(
        { error: `Failed to update KYC status: ${error.message}` },
        { status: 400 }
      )
    }

    console.log(`[v0] Admin: KYC ${status} for user:`, userId)

    return NextResponse.json({
      success: true,
      message: `KYC ${status} successfully`,
      data,
    })
  } catch (error) {
    console.error("[v0] Admin: KYC approval error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
