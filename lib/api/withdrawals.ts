import { createBrowserClient } from "@/lib/supabase/client"

export interface WithdrawalRequest {
  id: string
  user_id: string
  wallet_id: string
  amount: number
  bank_name: string
  account_number: string
  account_name: string
  status: "pending" | "approved" | "rejected" | "processing"
  admin_note?: string
  transaction_reference?: string
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

export async function getUserWithdrawals(userId: string): Promise<WithdrawalRequest[]> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("withdrawal_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching withdrawals:", error)
    throw error
  }

  return data || []
}

export async function createWithdrawalRequest(request: {
  userId: string
  walletId: string
  amount: number
  bankName: string
  accountNumber: string
  accountName: string
}): Promise<WithdrawalRequest> {
  const supabase = createBrowserClient()

  // Check wallet balance
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("balance")
    .eq("id", request.walletId)
    .single()

  if (walletError || !wallet) {
    throw new Error("Wallet not found")
  }

  if (wallet.balance < request.amount) {
    throw new Error("Insufficient balance")
  }

  const { data, error } = await supabase
    .from("withdrawal_requests")
    .insert({
      user_id: request.userId,
      wallet_id: request.walletId,
      amount: request.amount,
      bank_name: request.bankName,
      account_number: request.accountNumber,
      account_name: request.accountName,
      status: "pending",
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating withdrawal:", error)
    throw error
  }

  return data
}

export async function getAllWithdrawals(): Promise<WithdrawalRequest[]> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("withdrawal_requests")
    .select(`
      *,
      profiles:user_id (
        full_name,
        email
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching all withdrawals:", error)
    throw error
  }

  return data || []
}
