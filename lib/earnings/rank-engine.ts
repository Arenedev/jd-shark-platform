// Rank & Earnings Engine for JD SHARK LTD
// This engine handles rank calculations and earnings distribution

import { createClient as createServiceClient } from "@supabase/supabase-js"

export interface RankConfig {
  rank_name: string
  rank_order: number
  pc_requirement: number
  nc_requirement: number
  pc_earning_rate: number
  network_earning_rate: number
  grand_network_rate: number
  vnc_rate: number
  rank_bonus: number
}

export interface UserRankData {
  userId: string
  baseStructure: string
  currentRank: string
  personalCapital: number
  networkCapital: number
  grandNetworkCapital: number
}

const RANK_ORDER = [
  "fin_starter",
  "investor",
  "capital_investor",
  "core_investor",
  "alpha_investor",
  "grand_alpha",
  "apex_alpha",
  "grand_star_investor",
]

// Get Supabase admin client
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase configuration")
  }

  return createServiceClient(supabaseUrl, supabaseServiceKey)
}

// Fetch rank configurations from database
export async function getRankConfigurations(): Promise<RankConfig[]> {
  const supabase = getAdminClient()

  const { data, error } = await supabase
    .from("rank_configurations")
    .select("*")
    .order("rank_order", { ascending: true })

  if (error) {
    console.error("Error fetching rank configs:", error)
    return []
  }

  return data || []
}

// Calculate user's network capital (sum of direct referrals' PC)
export async function calculateNetworkCapital(userId: string): Promise<number> {
  const supabase = getAdminClient()

  // Get direct referrals (level 1)
  const { data: directReferrals, error } = await supabase
    .from("referrals")
    .select("referred_id")
    .eq("referrer_id", userId)
    .eq("level", 1)

  if (error || !directReferrals) return 0

  // Sum their personal capital
  let totalNC = 0
  for (const ref of directReferrals) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("personal_capital")
      .eq("id", ref.referred_id)
      .single()

    if (profile) {
      totalNC += profile.personal_capital || 0
    }
  }

  return totalNC
}

// Calculate grand network capital (sum of gen 2+ referrals' PC)
export async function calculateGrandNetworkCapital(userId: string): Promise<number> {
  const supabase = getAdminClient()

  // Get gen 2+ referrals
  const { data: genReferrals, error } = await supabase
    .from("referrals")
    .select("referred_id")
    .eq("referrer_id", userId)
    .gte("level", 2)

  if (error || !genReferrals) return 0

  let totalGNC = 0
  for (const ref of genReferrals) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("personal_capital")
      .eq("id", ref.referred_id)
      .single()

    if (profile) {
      totalGNC += profile.personal_capital || 0
    }
  }

  return totalGNC
}

// Determine eligible rank based on PC and NC
export function determineRank(pc: number, nc: number, rankConfigs: RankConfig[]): string {
  let eligibleRank = "fin_starter"

  for (const config of rankConfigs) {
    if (pc >= config.pc_requirement || nc >= config.nc_requirement) {
      eligibleRank = config.rank_name
    } else {
      break
    }
  }

  return eligibleRank
}

// Check and update user's rank
export async function checkAndUpdateRank(userId: string): Promise<{
  previousRank: string
  newRank: string
  rankChanged: boolean
  bonusAwarded: number
}> {
  const supabase = getAdminClient()

  // Get user's current data
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("current_rank, personal_capital, network_capital, base_structure")
    .eq("id", userId)
    .single()

  if (profileError || !profile) {
    return { previousRank: "", newRank: "", rankChanged: false, bonusAwarded: 0 }
  }

  // Only associates have ranks
  if (profile.base_structure !== "associate") {
    return { previousRank: "", newRank: "", rankChanged: false, bonusAwarded: 0 }
  }

  const previousRank = profile.current_rank || "fin_starter"

  // Calculate current NC
  const nc = await calculateNetworkCapital(userId)

  // Update NC in profile
  await supabase
    .from("profiles")
    .update({
      network_capital: nc,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  // Get rank configurations
  const rankConfigs = await getRankConfigurations()

  // Determine new rank
  const newRank = determineRank(profile.personal_capital || 0, nc, rankConfigs)

  // Check if rank changed
  const previousRankOrder = RANK_ORDER.indexOf(previousRank)
  const newRankOrder = RANK_ORDER.indexOf(newRank)

  if (newRankOrder > previousRankOrder) {
    // Rank upgraded!
    const newRankConfig = rankConfigs.find((r) => r.rank_name === newRank)
    const bonusAmount = newRankConfig?.rank_bonus || 0

    // Update profile with new rank
    await supabase
      .from("profiles")
      .update({
        current_rank: newRank,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    // Record rank change history
    await supabase.from("rank_history").insert({
      user_id: userId,
      old_rank: previousRank,
      new_rank: newRank,
      personal_capital: profile.personal_capital,
      network_capital: nc,
      changed_at: new Date().toISOString(),
    })

    // Credit rank bonus if applicable
    if (bonusAmount > 0) {
      // Add to mlm_earnings (not earnings table)
      await supabase.from("mlm_earnings").insert({
        user_id: userId,
        amount: bonusAmount,
        status: "credited",
        credited_at: new Date().toISOString(),
      })

      // Update wallet balance directly (don't use supabase.sql syntax)
      const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", userId).single()

      if (wallet) {
        await supabase
          .from("wallets")
          .update({
            balance: (wallet.balance || 0) + bonusAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
      }

      // Create notification
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "rank_upgrade",
        title: "Rank Upgrade!",
        message: `Congratulations! You've been promoted to ${newRank.replace(/_/g, " ").toUpperCase()}. A bonus of ₦${bonusAmount.toLocaleString()} has been credited to your wallet.`,
        data: { new_rank: newRank, bonus: bonusAmount },
      })
    }

    return { previousRank, newRank, rankChanged: true, bonusAwarded: bonusAmount }
  }

  return { previousRank, newRank: previousRank, rankChanged: false, bonusAwarded: 0 }
}

// Calculate PC earnings for a user
export async function calculatePCEarnings(
  userId: string,
  investmentId: string,
  principalAmount: number,
  periodStart: Date,
  periodEnd: Date,
): Promise<number> {
  const supabase = getAdminClient()

  // Get user's profile and rank
  const { data: profile } = await supabase.from("profiles").select("current_rank, base_structure").eq("id", userId).single()

  if (!profile) return 0

  // Get rank config
  const rankConfigs = await getRankConfigurations()
  let earningRate = 5 // Default for fin_starter

  if (profile.base_structure === "investor") {
    // Investors get 7% or 8% based on tier
    earningRate = principalAmount >= 51000000 ? 8 : 7
  } else if (profile.base_structure === "organization") {
    // Organizations get 8% or 9% based on tier
    earningRate = principalAmount >= 100000000 ? 9 : 8
  } else if (profile.base_structure === "associate") {
    const rankConfig = rankConfigs.find((r) => r.rank_name === profile.current_rank)
    earningRate = rankConfig?.pc_earning_rate || 5
  }

  // Calculate monthly interest (annual rate / 12)
  const monthlyRate = earningRate / 12 / 100
  const monthsInPeriod = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24 * 30) // Approximate months

  const earnings = principalAmount * monthlyRate * monthsInPeriod

  return Math.round(earnings * 100) / 100
}

// Calculate network earnings from a downline's returns
export async function calculateNetworkEarnings(
  referrerId: string,
  sourceUserId: string,
  sourceInvestmentId: string,
  returnsAmount: number,
  generationLevel: number,
): Promise<number> {
  const supabase = getAdminClient()

  // Get referrer's profile
  const { data: referrerProfile } = await supabase
    .from("profiles")
    .select("rank, base_structure")
    .eq("id", referrerId)
    .single()

  if (!referrerProfile || referrerProfile.base_structure !== "associate") {
    return 0
  }

  // Check equal-rank stop rule
  const { data: sourceProfile } = await supabase.from("profiles").select("rank").eq("id", sourceUserId).single()

  if (sourceProfile) {
    const referrerRankOrder = RANK_ORDER.indexOf(referrerProfile.rank || "fin_starter")
    const sourceRankOrder = RANK_ORDER.indexOf(sourceProfile.rank || "fin_starter")

    // If downline has same or higher rank, upline only earns on their PC, not network
    if (sourceRankOrder >= referrerRankOrder && generationLevel > 1) {
      return 0
    }
  }

  // Get rank config
  const rankConfigs = await getRankConfigurations()
  const rankConfig = rankConfigs.find((r) => r.rank_name === referrerProfile.rank)

  if (!rankConfig) return 0

  let earningRate = 0

  if (generationLevel === 1 || generationLevel === 2) {
    earningRate = rankConfig.network_earning_rate
  } else if (generationLevel > 2) {
    // Grand network earnings only for higher ranks
    earningRate = rankConfig.grand_network_rate
  }

  if (earningRate === 0) return 0

  // Calculate earnings from RETURNS, not principal
  const earnings = returnsAmount * (earningRate / 100)

  return Math.round(earnings * 100) / 100
}

// Process monthly earnings for all active investments
export async function processMonthlyEarnings(): Promise<{
  processed: number
  totalEarnings: number
  errors: string[]
}> {
  const supabase = getAdminClient()
  const errors: string[] = []
  let processed = 0
  let totalEarnings = 0

  const now = new Date()
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1) // First of current month
  const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 1, 1) // First of previous month

  // Get all active LCR investments that have passed unlock date
  const { data: activeInvestments, error: investError } = await supabase
    .from("lcr_investments")
    .select("*, profiles:user_id(id, rank, base_structure, referrer_id)")
    .in("status", ["active", "earning"])
    .lte("unlock_date", now.toISOString().split("T")[0])

  if (investError || !activeInvestments) {
    return { processed: 0, totalEarnings: 0, errors: [investError?.message || "Failed to fetch investments"] }
  }

  for (const investment of activeInvestments) {
    try {
      const userProfile = investment.profiles as any

      // Calculate PC earnings
      const pcEarnings = await calculatePCEarnings(
        investment.user_id,
        investment.id,
        investment.principal_amount,
        periodStart,
        periodEnd,
      )

      if (pcEarnings > 0) {
        // Record earnings to mlm_earnings
        await supabase.from("mlm_earnings").insert({
          user_id: investment.user_id,
          amount: pcEarnings,
          status: "credited",
          credited_at: now.toISOString(),
        })

        // Credit to wallet balance
        const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", investment.user_id).single()

        if (wallet) {
          await supabase
            .from("wallets")
            .update({
              balance: (wallet.balance || 0) + pcEarnings,
              updated_at: now.toISOString(),
            })
            .eq("user_id", investment.user_id)
        }

        totalEarnings += pcEarnings
        processed++

        // Now calculate network earnings for uplines
        if (userProfile?.base_structure === "associate") {
          // Get all upline referrers
          const { data: uplineReferrals } = await supabase
            .from("referrals")
            .select("referrer_id, level")
            .eq("referred_id", investment.user_id)
            .order("level", { ascending: true })

          if (uplineReferrals) {
            for (const upline of uplineReferrals) {
              const networkEarnings = await calculateNetworkEarnings(
                upline.referrer_id,
                investment.user_id,
                investment.id,
                pcEarnings, // Network earnings are from RETURNS
                upline.level,
              )

              if (networkEarnings > 0) {
                // Record network earnings to mlm_earnings
                await supabase.from("mlm_earnings").insert({
                  user_id: upline.referrer_id,
                  amount: networkEarnings,
                  status: "credited",
                  credited_at: now.toISOString(),
                })

                // Credit to wallet
                const { data: uplineWallet } = await supabase
                  .from("wallets")
                  .select("balance")
                  .eq("user_id", upline.referrer_id)
                  .single()

                if (uplineWallet) {
                  await supabase
                    .from("wallets")
                    .update({
                      balance: (uplineWallet.balance || 0) + networkEarnings,
                      updated_at: now.toISOString(),
                    })
                    .eq("user_id", upline.referrer_id)
                }

                totalEarnings += networkEarnings
              }
            }
          }
        }
      }
    } catch (err) {
      errors.push(`Error processing investment ${investment.id}: ${err}`)
    }
  }

  // Check and update ranks for all associates
  const { data: associates } = await supabase.from("profiles").select("id").eq("base_structure", "associate")

  if (associates) {
    for (const associate of associates) {
      await checkAndUpdateRank(associate.id)
    }
  }

  return { processed, totalEarnings, errors }
}

// Organization referral commission (1% of approved deposits)
export async function processOrganizationReferralCommission(
  referrerId: string,
  depositAmount: number,
  referredUserId: string,
): Promise<number> {
  const supabase = getAdminClient()

  // Verify referrer is an organization
  const { data: referrerProfile } = await supabase
    .from("profiles")
    .select("base_structure")
    .eq("id", referrerId)
    .single()

  if (!referrerProfile || referrerProfile.base_structure !== "organization") {
    return 0
  }

  // Verify referred user is also an organization
  const { data: referredProfile } = await supabase
    .from("profiles")
    .select("base_structure")
    .eq("id", referredUserId)
    .single()

  if (!referredProfile || referredProfile.base_structure !== "organization") {
    return 0
  }

  // Calculate 1% commission
  const commission = depositAmount * 0.01

  // Record earnings to mlm_earnings
  await supabase.from("mlm_earnings").insert({
    user_id: referrerId,
    amount: commission,
    status: "credited",
    credited_at: new Date().toISOString(),
  })

  // Credit to wallet balance
  const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", referrerId).single()

  if (wallet) {
    await supabase
      .from("wallets")
      .update({
        balance: (wallet.balance || 0) + commission,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", referrerId)
  }

  // Notification
  await supabase.from("notifications").insert({
    user_id: referrerId,
    type: "commission_earned",
    title: "Referral Commission Earned",
    message: `You earned ₦${commission.toLocaleString()} commission from a referred organization's deposit.`,
    data: { amount: commission },
  })

  return commission
}
