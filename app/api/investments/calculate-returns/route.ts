import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// This endpoint processes monthly returns for all active investments
// It should be called via cron job on the 1st of each month
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()

    // Optional: Add API key verification for cron job security
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1 // 1-12
    const currentYear = currentDate.getFullYear()

    console.log(`[v0] Processing returns for ${currentYear}-${currentMonth}`)

    // Get all active investments where returns_start_at is in the past
    const { data: investments, error: investmentsError } = await supabase
      .from("investments")
      .select("*")
      .eq("status", "active")
      .lte("returns_start_at", currentDate.toISOString())

    if (investmentsError) {
      console.error("[v0] Error fetching investments:", investmentsError)
      return NextResponse.json({ error: "Failed to fetch investments" }, { status: 500 })
    }

    if (!investments || investments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No investments ready for returns calculation",
        processed: 0,
      })
    }

    let processedCount = 0
    const errors = []

    for (const investment of investments) {
      try {
        // Check if return already calculated for this period
        const { data: existingReturn } = await supabase
          .from("monthly_returns")
          .select("id")
          .eq("investment_id", investment.id)
          .eq("return_period_month", currentMonth)
          .eq("return_period_year", currentYear)
          .single()

        if (existingReturn) {
          console.log(`[v0] Return already calculated for investment ${investment.id}`)
          continue
        }

        // Calculate return amount
        const returnAmount = (investment.principal * investment.effective_roi) / 100

        // Create monthly return record
        const { error: returnError } = await supabase.from("monthly_returns").insert({
          investment_id: investment.id,
          user_id: investment.user_id,
          return_period_month: currentMonth,
          return_period_year: currentYear,
          principal_amount: investment.principal,
          roi_rate: investment.effective_roi,
          return_amount: returnAmount,
          credited_to_wallet: false,
          calculation_details: {
            base_roi: investment.base_roi,
            lcr_bonus: investment.lcr_bonus,
            lock_type: investment.lock_type,
          },
        })

        if (returnError) {
          console.error(`[v0] Error creating return for investment ${investment.id}:`, returnError)
          errors.push({ investmentId: investment.id, error: returnError.message })
          continue
        }

        // Update investment totals
        const newTotalReturns = Number(investment.total_returns || 0) + returnAmount
        const nextMonth = new Date(currentDate)
        nextMonth.setMonth(nextMonth.getMonth() + 1)

        await supabase
          .from("investments")
          .update({
            total_returns: newTotalReturns,
            last_return_date: currentDate.toISOString().split("T")[0],
            next_return_date: nextMonth.toISOString().split("T")[0],
            updated_at: new Date().toISOString(),
          })
          .eq("id", investment.id)

        processedCount++
      } catch (error) {
        console.error(`[v0] Error processing investment ${investment.id}:`, error)
        errors.push({ investmentId: investment.id, error: String(error) })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} investments`,
      processed: processedCount,
      total: investments.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("[v0] Returns calculation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
