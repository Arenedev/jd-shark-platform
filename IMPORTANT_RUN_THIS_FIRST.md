# ⚠️ CRITICAL: Database Setup Required

## The Problem
You're seeing the error: `Could not find the table 'public.deposit_requests'` because the Phase 1-5 database tables haven't been created yet.

## The Solution (Choose One)

### Option 1: Run via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the **ENTIRE** contents of `scripts/10-consolidated-setup-all-phases.sql`
5. Paste it into the SQL editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Wait for "Success" message

### Option 2: Run via v0 Scripts Panel
1. In the v0 interface, look for the **Scripts** panel/tab
2. Find `scripts/10-consolidated-setup-all-phases.sql`
3. Click the **Run** or **Execute** button next to it
4. Wait for completion

### Option 3: Use Supabase CLI (If installed)
```bash
supabase db push
```

## What This Script Does
✅ Creates `deposit_requests` table for admin-approved deposits
✅ Creates `monthly_returns` table for tracking investment returns
✅ Creates `ranks` table with all 30 ranks (Investor/Organization/Associate)
✅ Creates `network_genealogy` for multi-level tracking
✅ Creates `commissions` table for network earnings
✅ Creates `organization_loans` table
✅ Creates bonus and incentive tracking tables
✅ Sets up all RLS policies for security
✅ Creates optimized indexes for performance

## After Running the Script
1. Refresh your v0 preview
2. The deposit functionality will work
3. All Phase 1-5 features will be enabled

## Verification
After running, you should have these NEW tables:
- deposit_requests
- monthly_returns  
- ranks
- network_genealogy
- rank_history
- commissions
- commission_runs
- organization_loans
- welcome_bonuses
- incentives
- system_config

## Still Having Issues?
Check the Supabase logs for any error messages. The most common issues are:
- Conflicts if some tables already exist (script handles this with `IF NOT EXISTS`)
- RLS policy conflicts (script creates policies with `CREATE POLICY`)
