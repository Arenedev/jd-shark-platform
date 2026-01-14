import { createClient } from "@/lib/supabase/client"

export interface DepositRequest {
  id: string
  user_id: string
  wallet_id: string
  amount: number
  payment_method: string
  payment_proof_url: string | null
  status: "pending" | "approved" | "rejected"
  admin_note: string | null
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  transaction_reference: string | null
  created_at: string
  updated_at: string
  profiles?: {
    full_name: string
    email: string
    base_structure: string
  }
}

export async function createDepositRequest(
  userId: string,
  walletId: string,
  amount: number,
  paymentMethod: string,
  paymentProofUrl?: string,
): Promise<{ data: DepositRequest | null; error: string | null }> {
  const supabase = createClient()

  const reference = `DEP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

  const { data, error } = await supabase
    .from("deposit_requests")
    .insert({
      user_id: userId,
      wallet_id: walletId,
      amount,
      payment_method: paymentMethod,
      payment_proof_url: paymentProofUrl || null,
      status: "pending",
      transaction_reference: reference,
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function getUserDepositRequests(userId: string): Promise<DepositRequest[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("deposit_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching deposit requests:", error)
    return []
  }

  return data || []
}

export async function getAllDepositRequests(status?: string): Promise<DepositRequest[]> {
  const supabase = createClient()

  let query = supabase
    .from("deposit_requests")
    .select(`
      *,
      profiles:user_id (
        full_name,
        email,
        base_structure
      )
    `)
    .order("created_at", { ascending: false })

  if (status && status !== "all") {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching all deposit requests:", error)
    return []
  }

  return data || []
}
