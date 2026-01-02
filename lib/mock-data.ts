// Mock user and dashboard data for frontend development
export const mockUser = {
  id: "demo-user-123",
  email: "demo@jdshark.com",
  full_name: "Demo User",
  phone: "+2347012345678",
  kyc_verified: true,
}

export const mockWallet = {
  id: "wallet-123",
  balance: 500000,
  currency: "NGN",
  total_funded: 1000000,
  total_withdrawn: 0,
}

export const mockPortfolios = [
  {
    id: "portfolio-1",
    name: "Personal Investment",
    portfolio_type: "Personal",
    purpose: "Building my personal wealth through JD SHARK",
    total_balance: 2500000,
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  },
  {
    id: "portfolio-2",
    name: "For My Family",
    portfolio_type: "For Others",
    purpose: "Securing financial future for my loved ones",
    total_balance: 1500000,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
  },
  {
    id: "portfolio-3",
    name: "Education Fund",
    portfolio_type: "For Purpose",
    purpose: "Supporting education initiatives in my community",
    total_balance: 750000,
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
  },
]

export const mockTransactions = [
  {
    id: "txn-1",
    type: "deposit",
    amount: 100000,
    reference: "PAY-123456",
    status: "completed",
    description: "Wallet funded via Paystack",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "txn-2",
    type: "investment",
    amount: 250000,
    reference: "INV-789012",
    status: "completed",
    description: "Investment in Personal Portfolio",
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
  {
    id: "txn-3",
    type: "earnings",
    amount: 45000,
    reference: "EARN-345678",
    status: "completed",
    description: "Referral earnings credited",
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  },
  {
    id: "txn-4",
    type: "investment",
    amount: 150000,
    reference: "INV-456789",
    status: "completed",
    description: "Investment in Family Portfolio",
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  },
  {
    id: "txn-5",
    type: "withdrawal",
    amount: 50000,
    reference: "WD-567890",
    status: "completed",
    description: "Withdrawal to bank account",
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
  },
]

export const mockInvestments = [
  {
    id: "inv-1",
    portfolio_id: "portfolio-1",
    amount: 500000,
    start_date: "2024-10-01",
    maturity_date: "2025-10-01",
    roi_percentage: 100,
    status: "active",
    auto_reinvest: true,
  },
  {
    id: "inv-2",
    portfolio_id: "portfolio-1",
    amount: 750000,
    start_date: "2024-11-15",
    maturity_date: "2025-11-15",
    roi_percentage: 100,
    status: "active",
    auto_reinvest: false,
  },
  {
    id: "inv-3",
    portfolio_id: "portfolio-2",
    amount: 300000,
    start_date: "2024-12-01",
    maturity_date: "2025-12-01",
    roi_percentage: 100,
    status: "active",
    auto_reinvest: true,
  },
]

export const mockReferrals = [
  {
    id: "ref-1",
    referred_name: "Amara Okonkwo",
    referred_email: "amara@example.com",
    level: 1,
    commission_rate: 10,
    earnings: 50000,
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: "ref-2",
    referred_name: "Tunde Ibrahim",
    referred_email: "tunde@example.com",
    level: 2,
    commission_rate: 5,
    earnings: 25000,
    date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
  },
]

export const mockMLMEarnings = [
  {
    id: "earn-1",
    user_id: "demo-user-123",
    investment_id: "inv-1",
    referrer_id: "ref-1",
    level: 1,
    amount: 50000,
    status: "credited",
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: "earn-2",
    user_id: "demo-user-123",
    investment_id: "inv-2",
    referrer_id: "ref-2",
    level: 2,
    amount: 25000,
    status: "pending",
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  },
  {
    id: "earn-3",
    user_id: "demo-user-123",
    investment_id: "inv-3",
    referrer_id: "ref-1",
    level: 1,
    amount: 35000,
    status: "credited",
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  },
]

export const mockUsers = [
  {
    id: "demo-user-123",
    email: "demo@jdshark.com",
    full_name: "Demo User",
    phone: "+2347012345678",
    kyc_status: "approved",
    kyc_verified: true,
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  },
  {
    id: "user-456",
    email: "chioma@example.com",
    full_name: "Chioma Okafor",
    phone: "+2348012345678",
    kyc_status: "approved",
    kyc_verified: true,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
  },
  {
    id: "user-789",
    email: "ahmed@example.com",
    full_name: "Ahmed Hassan",
    phone: "+2349012345678",
    kyc_status: "pending",
    kyc_verified: false,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: "user-012",
    email: "victoria@example.com",
    full_name: "Victoria Okonkwo",
    phone: "+2347012345679",
    kyc_status: "approved",
    kyc_verified: true,
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
  },
  {
    id: "user-345",
    email: "tunde@example.com",
    full_name: "Tunde Ibrahim",
    phone: "+2348012345679",
    kyc_status: "pending",
    kyc_verified: false,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  },
]
