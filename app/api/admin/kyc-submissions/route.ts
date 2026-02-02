import { createServiceRoleClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    console.log("[v0] Admin: Fetching KYC submissions")

    // Fetch all KYC submissions with pending status
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, nin_or_bvn, bank_name, bank_account_number, bank_account_name, kyc_document_url, kyc_status")
      .eq("kyc_status", "pending")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Admin: Error fetching KYC submissions:", error)
      return NextResponse.json(
        { error: `Failed to fetch submissions: ${error.message}` },
        { status: 400 }
      )
    }

    console.log("[v0] Admin: Found", data?.length || 0, "pending KYC submissions")

    return NextResponse.json({
      success: true,
      submissions: data || [],
    })
  } catch (error) {
    console.error("[v0] Admin: Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
