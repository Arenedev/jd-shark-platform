import { NextRequest, NextResponse } from "next/server"

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

    // Convert file to base64
    const buffer = await file.arrayBuffer()
    const base64String = Buffer.from(buffer).toString("base64")
    const dataUrl = `data:${file.type};base64,${base64String}`

    console.log("[v0] File converted to base64, size:", file.size)

    return NextResponse.json({ 
      url: dataUrl,
      fileName: file.name,
      fileSize: file.size
    })
  } catch (error: any) {
    console.error("[v0] File upload error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process file" },
      { status: 500 }
    )
  }
}
