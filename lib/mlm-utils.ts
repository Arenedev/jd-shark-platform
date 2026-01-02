import { createClient } from "@/lib/supabase/server"

// Commission rates for each level (percentage)
export const COMMISSION_RATES = {
  1: 10,
  2: 5,
  3: 2,
  4: 1,
  5: 0.5,
}

/**
 * Process MLM earnings when an investment is created
 * Distributes 10% of the investment amount across the referral tree
 */
export async function processMLMEarnings(investmentAmount: number, userId: string) {
  const supabase = await createClient()

  try {
    // Find the user who owns this investment's portfolio
    const { data: portfolio } = await supabase.from("portfolios").select("owner_id").eq("id", userId).single()

    if (!portfolio) return

    const referrerId = portfolio.owner_id

    // Walk up the referral tree (max 5 levels)
    let currentReferrer = referrerId
    const earnings = []

    for (let level = 1; level <= 5; level++) {
      // Find the referrer at this level
      const { data: referral } = await supabase
        .from("referrals")
        .select("referrer_id")
        .eq("referred_id", currentReferrer)
        .eq("level", 1)
        .single()

      if (!referral) break

      const parentReferrer = referral.referrer_id
      const commissionRate = COMMISSION_RATES[level as keyof typeof COMMISSION_RATES]
      const earningAmount = (investmentAmount * 10 * commissionRate) / 100 / 100 // 10% of investment distributed

      // Create earning record
      earnings.push({
        user_id: parentReferrer,
        investment_id: userId,
        referrer_id: currentReferrer,
        level,
        amount: earningAmount,
        status: "pending",
      })

      currentReferrer = parentReferrer
    }

    if (earnings.length > 0) {
      const { error } = await supabase.from("mlm_earnings").insert(earnings)
      if (error) throw error
    }

    return earnings
  } catch (error) {
    console.error("Error processing MLM earnings:", error)
    throw error
  }
}

/**
 * Build referral tree and get all descendants at each level
 */
export async function getReferralTree(userId: string) {
  const supabase = await createClient()

  const tree = {
    direct: [] as any[],
    level2: [] as any[],
    level3: [] as any[],
    level4: [] as any[],
    level5: [] as any[],
  }

  try {
    // Get direct referrals (level 1)
    const { data: level1 } = await supabase.from("referrals").select("*").eq("referrer_id", userId).eq("level", 1)

    tree.direct = level1 || []

    // Get deeper levels by querying each referral's referrals
    if (level1) {
      const level1Ids = level1.map((r: any) => r.referred_id)

      const { data: level2 } = await supabase.from("referrals").select("*").in("referrer_id", level1Ids).eq("level", 1)

      tree.level2 = level2 || []

      if (level2) {
        const level2Ids = level2.map((r: any) => r.referred_id)

        const { data: level3 } = await supabase
          .from("referrals")
          .select("*")
          .in("referrer_id", level2Ids)
          .eq("level", 1)

        tree.level3 = level3 || []

        if (level3) {
          const level3Ids = level3.map((r: any) => r.referred_id)

          const { data: level4 } = await supabase
            .from("referrals")
            .select("*")
            .in("referrer_id", level3Ids)
            .eq("level", 1)

          tree.level4 = level4 || []

          if (level4) {
            const level4Ids = level4.map((r: any) => r.referred_id)

            const { data: level5 } = await supabase
              .from("referrals")
              .select("*")
              .in("referrer_id", level4Ids)
              .eq("level", 1)

            tree.level5 = level5 || []
          }
        }
      }
    }

    return tree
  } catch (error) {
    console.error("Error building referral tree:", error)
    throw error
  }
}
