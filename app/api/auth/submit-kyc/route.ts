import { createServiceRoleClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const userId = formData.get("userId") as string
    const kycData = JSON.parse(formData.get("kycData") as string)

    if (!file || !userId) {
      return NextResponse.json({ error: "Missing file or userId" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Upload file to storage using service role (bypasses RLS)
    const fileName = `${userId}-${Date.now()}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log("[v0] Uploading KYC document:", fileName)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("kyc-documents")
      .upload(`kyc/${fileName}`, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("[v0] KYC upload error:", uploadError)
      return NextResponse.json({ error: "Upload failed: " + uploadError.message }, { status: 400 })
    }

    console.log("[v0] KYC document uploaded successfully")

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("kyc-documents").getPublicUrl(`kyc/${fileName}`)

    // Update profile with KYC info using service role
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        nin_or_bvn: kycData.nin_or_bvn,
        phone: kycData.phone,
        country: kycData.country,
        bank_name: kycData.bank_name,
        bank_account_number: kycData.bank_account_number,
        bank_account_name: kycData.bank_account_name,
        kyc_document_url: publicUrl,
        kyc_status: "pending",
      })
      .eq("id", userId)

    if (updateError) {
      console.error("[v0] Profile update error:", updateError)
      return NextResponse.json({ error: "Profile update failed: " + updateError.message }, { status: 400 })
    }

    console.log("[v0] KYC submission completed for user:", userId)

    return NextResponse.json({
      success: true,
      message: "KYC submitted successfully",
    })
  } catch (error) {
    console.error("[v0] KYC submission error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
