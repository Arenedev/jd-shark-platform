import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be less than 5MB" }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Generate unique file name
    const timestamp = Date.now()
    const fileName = `${user.id}/${timestamp}-${file.name}`

    // Upload to Supabase Storage
    const buffer = await file.arrayBuffer()
    const { data, error: uploadError } = await supabase.storage
      .from("proof-of-deposits")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("[v0] Supabase upload error:", uploadError)
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("proof-of-deposits")
      .getPublicUrl(data.path)

    console.log("[v0] File uploaded successfully:", data.path)

    return NextResponse.json({ url: publicUrlData.publicUrl })
  } catch (error: any) {
    console.error("[v0] File upload error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    )
  }
}
