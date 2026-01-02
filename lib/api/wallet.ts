import { createClient } from "@/lib/supabase/client"

export interface Wallet {
  id: string
  user_id: string
  balance: number
  total_funded: number
  total_withdrawn: number
  currency: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  wallet_id: string
  type: string
  amount: number
  status: string
  reference: string
  description: string
  metadata?: any
  created_at: string
  updated_at: string
}

export async function fetchUserWallet(userId: string): Promise<Wallet | null> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.from("wallets").select("*").eq("user_id", userId)

    if (error) {
      console.error("[v0] Error fetching wallet:", error)
      return null
    }

    if (!data || data.length === 0) {
      console.log("[v0] No wallet found for user:", userId)
      return null
    }

    return data[0] as Wallet
  } catch (error) {
    console.error("[v0] Wallet fetch error:", error)
    return null
  }
}

export async function fetchUserTransactions(userId: string): Promise<Transaction[]> {
  try {
    const supabase = createClient()

    // First get the user's wallet
    const wallet = await fetchUserWallet(userId)
    if (!wallet) {
      console.log("[v0] No wallet found, no transactions to fetch")
      return []
    }

    // Then fetch transactions for that wallet
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching transactions:", error)
      return []
    }

    return (data as Transaction[]) || []
  } catch (error) {
    console.error("[v0] Transactions fetch error:", error)
    return []
  }
}

export async function updateWalletBalance(
  walletId: string,
  amount: number,
  type: "add" | "subtract",
): Promise<boolean> {
  try {
    const supabase = createClient()

    // Get current wallet
    const { data: wallet, error: fetchError } = await supabase.from("wallets").select("*").eq("id", walletId)

    if (fetchError || !wallet || wallet.length === 0) {
      console.error("[v0] Error fetching wallet:", fetchError)
      return false
    }

    const currentBalance = wallet[0].balance || 0
    const newBalance = type === "add" ? currentBalance + amount : currentBalance - amount

    // Update balance
    const { error: updateError } = await supabase.from("wallets").update({ balance: newBalance }).eq("id", walletId)

    if (updateError) {
      console.error("[v0] Error updating wallet balance:", updateError)
      return false
    }

    return true
  } catch (error) {
    console.error("[v0] Wallet update error:", error)
    return false
  }
}

export async function createTransaction(
  walletId: string,
  type: string,
  amount: number,
  description: string,
  reference: string,
  status = "pending",
  metadata?: any,
): Promise<Transaction | null> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("wallet_transactions")
      .insert([
        {
          wallet_id: walletId,
          type,
          amount,
          description,
          reference,
          status,
          metadata,
        },
      ])
      .select()

    if (error) {
      console.error("[v0] Error creating transaction:", error)
      return null
    }

    return data[0] as Transaction
  } catch (error) {
    console.error("[v0] Transaction creation error:", error)
    return null
  }
}
