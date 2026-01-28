-- Create organization_loans table with correct schema
CREATE TABLE IF NOT EXISTS organization_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  principal_amount DECIMAL(18, 2) NOT NULL,
  monthly_interest_rate DECIMAL(5, 2) DEFAULT 0.5,
  total_due DECIMAL(18, 2) NOT NULL,
  amount_paid DECIMAL(18, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paid', 'defaulted')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create loan_payments table
CREATE TABLE IF NOT EXISTS loan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES organization_loans(id) ON DELETE CASCADE,
  amount DECIMAL(18, 2) NOT NULL,
  interest_portion DECIMAL(18, 2),
  principal_portion DECIMAL(18, 2),
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_loans_org ON organization_loans(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id);

-- Enable RLS
ALTER TABLE organization_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS users_view_own_loans ON organization_loans;
CREATE POLICY users_view_own_loans ON organization_loans
  FOR SELECT
  USING (auth.uid() = organization_id);

DROP POLICY IF EXISTS users_view_own_loan_payments ON loan_payments;
CREATE POLICY users_view_own_loan_payments ON loan_payments
  FOR SELECT
  USING (loan_id IN (SELECT id FROM organization_loans WHERE organization_id = auth.uid()));

DROP POLICY IF EXISTS admin_manage_loans ON organization_loans;
CREATE POLICY admin_manage_loans ON organization_loans
  FOR ALL
  USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS users_insert_loans ON organization_loans;
CREATE POLICY users_insert_loans ON organization_loans
  FOR INSERT
  WITH CHECK (auth.uid() = organization_id);
