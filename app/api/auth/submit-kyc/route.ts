import { createServiceRoleClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const userId = formData.get("userId") as string
    const kycDataStr = formData.get("kycData") as string

    console.log("[v0] KYC API: Received request for user:", userId)

    if (!file || !userId) {
      return NextResponse.json({ error: "Missing file or userId" }, { status: 400 })
    }

    let kycData
    try {
      kycData = JSON.parse(kycDataStr)
    } catch {
      return NextResponse.json({ error: "Invalid KYC data format" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Upload file to storage using service role (bypasses RLS)
    const fileName = `${userId}-${Date.now()}`
    
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      console.log("[v0] KYC API: Uploading document:", fileName, "Size:", buffer.length)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("kyc-documents")
        .upload(`kyc/${fileName}`, buffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        console.error("[v0] KYC API: Upload error:", uploadError)
        return NextResponse.json(
          { error: `Upload failed: ${uploadError.message}` },
          { status: 400 }
        )
      }

      console.log("[v0] KYC API: Document uploaded successfully")
    } catch (uploadErr) {
      console.error("[v0] KYC API: Upload exception:", uploadErr)
      return NextResponse.json(
        { error: uploadErr instanceof Error ? uploadErr.message : "Upload failed" },
        { status: 500 }
      )
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("kyc-documents").getPublicUrl(`kyc/${fileName}`)

    console.log("[v0] KYC API: Public URL:", publicUrl)

    // Update profile with KYC info using service role
    const { error: updateError, data: updateData } = await supabase
      .from("profiles")
      .update({
        nin_or_bvn: kycData.nin_or_bvn || null,
        phone: kycData.phone || null,
        country: kycData.country || null,
        bank_name: kycData.bank_name || null,
        bank_account_number: kycData.bank_account_number || null,
        bank_account_name: kycData.bank_account_name || null,
        kyc_document_url: publicUrl,
        kyc_status: "pending",
      })
      .eq("id", userId)

    if (updateError) {
      console.error("[v0] KYC API: Profile update error:", updateError)
      return NextResponse.json(
        { error: `Profile update failed: ${updateError.message}` },
        { status: 400 }
      )
    }

    console.log("[v0] KYC API: Profile updated successfully")

    return NextResponse.json({
      success: true,
      message: "KYC submitted successfully",
      publicUrl,
    })
  } catch (error) {
    console.error("[v0] KYC API: Catch-all error:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
