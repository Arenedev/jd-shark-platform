import { type NextRequest, NextResponse } from "next/server"
import { processMonthlyEarnings } from "@/lib/earnings/rank-engine"

// This endpoint should be called by a cron job monthly
export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization (in production, use proper auth)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const result = await processMonthlyEarnings()

    return NextResponse.json({
      message: "Earnings processed successfully",
      processed: result.processed,
      totalEarnings: result.totalEarnings,
      errors: result.errors,
    })
  } catch (error) {
    console.error("Error processing earnings:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
