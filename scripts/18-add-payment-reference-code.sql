-- Add payment_reference_code column to existing loan_repayment_requests table
-- This migration adds the new column and removes old columns if they exist

ALTER TABLE public.loan_repayment_requests
ADD COLUMN IF NOT EXISTS payment_reference_code TEXT UNIQUE;

-- Drop old column if it exists
ALTER TABLE public.loan_repayment_requests
DROP COLUMN IF EXISTS payment_proof_url;

-- Drop old payment_reference column if it exists (legacy name)
ALTER TABLE public.loan_repayment_requests
DROP COLUMN IF EXISTS payment_reference;

-- Add constraint to payment_reference_code if not already present
ALTER TABLE public.loan_repayment_requests
ALTER COLUMN payment_reference_code SET NOT NULL;
