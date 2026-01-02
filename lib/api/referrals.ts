import { createBrowserClient } from "@/lib/supabase/client"

export async function getUserReferrals(userId: string) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("referrals")
    .select(`
      *,
      referred:profiles!referrals_referred_id_fkey(id, full_name, email)
    `)
    .eq("referrer_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching referrals:", error)
    throw error
  }

  return data || []
}

export async function getUserMLMEarnings(userId: string) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("mlm_earnings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching MLM earnings:", error)
    throw error
  }

  return data || []
}

export async function getReferralStats(userId: string) {
  const supabase = createBrowserClient()

  // Get all referrals
  const { data: referrals, error: refError } = await supabase
    .from("referrals")
    .select("level")
    .eq("referrer_id", userId)

  if (refError) {
    console.error("[v0] Error fetching referral stats:", refError)
    throw refError
  }

  // Get all earnings
  const { data: earnings, error: earningsError } = await supabase
    .from("mlm_earnings")
    .select("amount, status")
    .eq("user_id", userId)

  if (earningsError) {
    console.error("[v0] Error fetching earnings stats:", earningsError)
    throw earningsError
  }

  const totalEarnings = earnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
  const creditedEarnings =
    earnings?.filter((e) => e.status === "credited").reduce((sum, e) => sum + Number(e.amount), 0) || 0
  const pendingEarnings =
    earnings?.filter((e) => e.status === "pending").reduce((sum, e) => sum + Number(e.amount), 0) || 0

  const referralsByLevel = {
    1: referrals?.filter((r) => r.level === 1).length || 0,
    2: referrals?.filter((r) => r.level === 2).length || 0,
    3: referrals?.filter((r) => r.level === 3).length || 0,
    4: referrals?.filter((r) => r.level === 4).length || 0,
    5: referrals?.filter((r) => r.level === 5).length || 0,
  }

  return {
    totalEarnings,
    creditedEarnings,
    pendingEarnings,
    referralsByLevel,
    totalReferrals: referrals?.length || 0,
  }
}

export async function verifyReferralCode(code: string) {
  const supabase = createBrowserClient()

  console.log("[v0] Verifying referral code:", code)

  // Fetch all profiles and filter client-side since Supabase doesn't support ::text casting in queries
  const { data, error } = await supabase.from("profiles").select("id, full_name, username")

  if (error) {
    console.error("[v0] Referral code verification error:", error)
    return null
  }

  if (!data || data.length === 0) {
    console.log("[v0] No profiles found")
    return null
  }

  // Filter client-side by checking if the profile ID starts with the referral code
  const uppercaseCode = code.toUpperCase()
  const matchedProfile = data.find((profile) => profile.id.toUpperCase().startsWith(uppercaseCode))

  if (!matchedProfile) {
    console.log("[v0] No profile found with referral code:", code)
    return null
  }

  console.log("[v0] Referral code verified:", matchedProfile.full_name)
  return matchedProfile
}

export async function createReferral(referrerId: string, referredId: string) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("referrals")
    .insert([
      {
        referrer_id: referrerId,
        referred_id: referredId,
        level: 1,
        commission_rate: 10,
      },
    ])
    .select()

  if (error) {
    console.error("[v0] Error creating referral:", error)
    throw error
  }

  return data?.[0] || null
}

export async function updateUserReferrer(userId: string, referralCode: string) {
  const supabase = createBrowserClient()

  // Verify the referral code first
  const referrer = await verifyReferralCode(referralCode)

  if (!referrer) {
    throw new Error("Invalid referral code")
  }

  if (referrer.id === userId) {
    throw new Error("You cannot refer yourself")
  }

  // Check if user already has a referrer
  const { data: existingRef } = await supabase.from("referrals").select("*").eq("referred_id", userId).single()

  if (existingRef) {
    throw new Error("You already have a referrer")
  }

  // Create the referral relationship
  await createReferral(referrer.id, userId)

  return referrer
}
