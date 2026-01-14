# JD SHARK Platform - Database Setup Instructions

## Quick Setup

Run the consolidated setup script in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of `scripts/10-consolidated-setup-all-phases.sql`
5. Click "Run"

## What This Script Does

The consolidated script sets up ALL database tables and configurations for the entire JD Shark platform:

### Phase 1: Investment & Returns Foundation
- ✅ System configuration table with base ROI
- ✅ Enhanced investments table with lock types and ROI tracking
- ✅ Monthly returns tracking
- ✅ Deposit requests table

### Phase 2: Personal Capital & Withdrawals
- ✅ Returns balance tracking in profiles
- ✅ Personal capital tracking in wallets
- ✅ User balances view for easy querying

### Phase 3: Rank System & Network Structure
- ✅ Ranks table with ALL 30 ranks (10 Investor, 10 Organization, 10 Associate)
- ✅ Network genealogy for multi-level tracking
- ✅ Rank history for progression tracking

### Phase 4: Network Commissions
- ✅ Commissions tracking table
- ✅ Commission runs for monthly processing
- ✅ Equal-rank stop rule support

### Phase 5: Special Features
- ✅ Organization loans (0.5% monthly interest)
- ✅ Welcome bonuses
- ✅ Incentives tracking (cars, vacations, titles)

## Verification

After running the script, verify these tables exist:
- `system_config`
- `deposit_requests`
- `monthly_returns`
- `ranks`
- `network_genealogy`
- `rank_history`
- `commissions`
- `commission_runs`
- `organization_loans`
- `welcome_bonuses`
- `incentives`

## All Ranks Included

### Investor Ranks (10)
1. Fin Starter
2. Core Investor
3. Prime Investor
4. Elite Investor
5. Alpha 1
6. Alpha 2
7. Alpha 3
8. Star 1
9. Star 2
10. Star 3

### Organization Ranks (10)
1. Organization Starter
2. Organization Core
3. Organization Prime
4. Organization Elite
5. Organization Alpha 1
6. Organization Alpha 2
7. Organization Alpha 3
8. Organization Star 1
9. Organization Star 2
10. Organization Star 3

### Associate Ranks (10)
1. Associate Starter
2. Associate Core
3. Associate Prime
4. Associate Elite
5. Associate Alpha 1
6. Associate Alpha 2
7. Associate Alpha 3
8. Associate Star 1
9. Associate Star 2
10. Associate Star 3

## Support

If you encounter any issues, check that:
1. You have proper permissions in Supabase
2. The script ran without errors
3. All RLS policies are enabled
