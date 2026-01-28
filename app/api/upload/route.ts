import { put } from "@vercel/blob"
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

    const buffer = await file.arrayBuffer()
    const blob = new Uint8Array(buffer)

    const { url } = await put(file.name, blob, {
      access: "public",
      addRandomSuffix: true,
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error("[v0] File upload error:", error)
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
  }
}
