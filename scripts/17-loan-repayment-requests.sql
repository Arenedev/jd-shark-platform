-- Loan Repayment Requests Table
-- Tracks when users request to repay their loans

CREATE TABLE IF NOT EXISTS public.loan_repayment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.organization_loans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  principal_amount DECIMAL(15,2) NOT NULL,
  interest_accrued DECIMAL(15,2) NOT NULL,
  total_repayment_amount DECIMAL(15,2) NOT NULL,
  payment_proof_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for loan repayment requests
ALTER TABLE public.loan_repayment_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own repayment requests" ON public.loan_repayment_requests;
DROP POLICY IF EXISTS "Users can create own repayment requests" ON public.loan_repayment_requests;

-- Users can view their own repayment requests
CREATE POLICY "Users can view own repayment requests"
  ON public.loan_repayment_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create repayment requests for their own loans
CREATE POLICY "Users can create own repayment requests"
  ON public.loan_repayment_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_loan_repayment_requests_loan_id ON public.loan_repayment_requests(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayment_requests_user_id ON public.loan_repayment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayment_requests_status ON public.loan_repayment_requests(status);
