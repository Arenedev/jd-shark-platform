import { createClient as createServiceClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { depositId, adminId, action, note, rejectionReason } = await request.json()

    console.log("[v0] Deposit approval request:", { depositId, adminId, action })

    if (!depositId || !action) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ message: "Server configuration error" }, { status: 500 })
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

    const { data: deposit, error: depositError } = await supabase
      .from("deposit_requests")
      .select("*, profiles:user_id(base_structure, current_rank)")
      .eq("id", depositId)
      .maybeSingle()

    console.log("[v0] Deposit found:", deposit)
    console.log("[v0] Deposit error:", depositError)

    if (depositError) {
      console.error("[v0] Database error:", depositError)
      return NextResponse.json({ message: "Database error: " + depositError.message }, { status: 500 })
    }

    if (!deposit) {
      return NextResponse.json({ message: "Deposit request not found" }, { status: 404 })
    }

    if (deposit.status !== "pending") {
      return NextResponse.json({ message: "Deposit request already processed" }, { status: 400 })
    }

    const now = new Date().toISOString()

    if (action === "approve") {
      const { data: roiConfig } = await supabase
        .from("system_config")
        .select("config_value")
        .eq("config_key", "base_monthly_roi")
        .maybeSingle()

      // Default to 1.0% if not configured
      const baseROI = roiConfig?.config_value ? Number.parseFloat(roiConfig.config_value) : 1.0

      const { error: updateError } = await supabase
        .from("deposit_requests")
        .update({
          status: "approved",
          approved_by: null, // Set to null since adminId is not a valid UUID
          approved_at: now,
          admin_notes: note || null,
          updated_at: now,
        })
        .eq("id", depositId)

      if (updateError) {
        console.error("[v0] Update error:", updateError)
        return NextResponse.json({ message: "Failed to approve deposit: " + updateError.message }, { status: 500 })
      }

      // Credit the user's wallet (Personal Capital)
      const { error: walletError } = await supabase.rpc("credit_wallet_on_deposit", {
        p_wallet_id: deposit.wallet_id,
        p_amount: deposit.amount,
      })

      // Fallback if RPC doesn't exist - do manual update
      if (walletError) {
        console.log("[v0] RPC failed, using fallback wallet update:", walletError)
        
        // Get current wallet balance
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance, total_funded")
          .eq("id", deposit.wallet_id)
          .single()

        if (wallet) {
          await supabase
            .from("wallets")
            .update({
              balance: (wallet.balance || 0) + deposit.amount,
              total_funded: (wallet.total_funded || 0) + deposit.amount,
              updated_at: now,
            })
            .eq("id", deposit.wallet_id)
        }
      }

      // Update user's personal capital
      const { data: profile } = await supabase
        .from("profiles")
        .select("personal_capital")
        .eq("id", deposit.user_id)
        .single()

      if (profile) {
        await supabase
          .from("profiles")
          .update({
            personal_capital: (profile.personal_capital || 0) + deposit.amount,
            updated_at: now,
          })
          .eq("id", deposit.user_id)
      }

      // Calculate returns start date (4 months after approval)
      const approvedDate = new Date(now)
      const returnsStartDate = new Date(approvedDate)
      returnsStartDate.setMonth(returnsStartDate.getMonth() + 4)

      // Determine lock type from deposit metadata or default to none
      const lockType = deposit.metadata?.lock_type || "none"
      let lcrBonus = 0

      if (lockType === "1_year") {
        lcrBonus = 5.0
      } else if (lockType === "10_year") {
        lcrBonus = 10.0
      }

      const effectiveROI = baseROI + lcrBonus

      // Calculate maturity date based on lock type
      const maturityDate = new Date(approvedDate)
      if (lockType === "1_year") {
        maturityDate.setFullYear(maturityDate.getFullYear() + 1)
      } else if (lockType === "10_year") {
        maturityDate.setFullYear(maturityDate.getFullYear() + 10)
      } else {
        // No lock - maturity is flexible, set to 1 year by default
        maturityDate.setFullYear(maturityDate.getFullYear() + 1)
      }

      // Create next return date (1 month after returns start)
      const nextReturnDate = new Date(returnsStartDate)
      nextReturnDate.setMonth(nextReturnDate.getMonth() + 1)

      await supabase.from("investments").insert({
        user_id: deposit.user_id,
        deposit_request_id: depositId,
        amount: deposit.amount,
        principal: deposit.amount,
        approved_at: now,
        returns_start_at: returnsStartDate.toISOString(),
        start_date: approvedDate.toISOString().split("T")[0],
        maturity_date: maturityDate.toISOString().split("T")[0],
        next_return_date: nextReturnDate.toISOString().split("T")[0],
        lock_type: lockType,
        base_roi: baseROI,
        lcr_bonus: lcrBonus,
        effective_roi: effectiveROI,
        roi_percentage: effectiveROI,
        status: "active",
        total_returns: 0,
      })

      // Create wallet transaction
      await supabase.from("wallet_transactions").insert({
        wallet_id: deposit.wallet_id,
        type: "deposit",
        amount: deposit.amount,
        status: "completed",
        reference: deposit.transaction_reference,
        description: `Deposit approved - ${deposit.payment_method} - Investment created with ${effectiveROI}% monthly ROI`,
        metadata: {
          deposit_request_id: depositId,
          approved_by: adminId,
          lock_type: lockType,
          returns_start_at: returnsStartDate.toISOString(),
        },
      })

      // Create notification
      await supabase.from("notifications").insert({
        user_id: deposit.user_id,
        type: "deposit_approved",
        title: "Deposit Approved & Investment Created",
        message: `Your deposit of ₦${deposit.amount.toLocaleString()} has been approved. Investment created with ${effectiveROI}% monthly ROI. Returns will start on ${returnsStartDate.toLocaleDateString()}.`,
        data: {
          amount: deposit.amount,
          reference: deposit.transaction_reference,
          effectiveROI,
          returnsStartDate: returnsStartDate.toISOString(),
        },
      })

      await supabase.from("admin_audit_log").insert({
        admin_id: null,
        action_type: "deposit_approved",
        target_table: "deposit_requests",
        target_id: depositId,
        target_user_id: deposit.user_id,
        new_values: { status: "approved", amount: deposit.amount, investment_created: true },
        notes: note || `Approved by: ${adminId}`,
      })

      return NextResponse.json({ message: "Deposit approved and investment created successfully" })
    } else {
      if (!rejectionReason) {
        return NextResponse.json({ message: "Rejection reason is required" }, { status: 400 })
      }

      const { error: updateError } = await supabase
        .from("deposit_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          admin_notes: note || null,
          updated_at: now,
        })
        .eq("id", depositId)

      if (updateError) {
        console.error("[v0] Update error:", updateError)
        return NextResponse.json({ message: "Failed to reject deposit: " + updateError.message }, { status: 500 })
      }

      // Create notification
      await supabase.from("notifications").insert({
        user_id: deposit.user_id,
        type: "deposit_rejected",
        title: "Deposit Rejected",
        message: `Your deposit request of ₦${deposit.amount.toLocaleString()} has been rejected. Reason: ${rejectionReason}`,
        data: { amount: deposit.amount, reason: rejectionReason },
      })

      await supabase.from("admin_audit_log").insert({
        admin_id: null,
        action_type: "deposit_rejected",
        target_table: "deposit_requests",
        target_id: depositId,
        target_user_id: deposit.user_id,
        new_values: { status: "rejected", rejection_reason: rejectionReason },
        notes: note || `Rejected by: ${adminId}`,
      })

      return NextResponse.json({ message: "Deposit rejected" })
    }
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
