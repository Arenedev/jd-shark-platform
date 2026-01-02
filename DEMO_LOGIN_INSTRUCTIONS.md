# JD SHARK Platform - Demo Login Instructions

## Step 1: Create Demo User in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication > Users**
3. Click **Create a new user**
4. Fill in the following credentials:
   - **Email**: `demo@jdshark.com`
   - **Password**: `Demo@12345`
5. Click **Create user**
6. Copy the **User ID** that appears

## Step 2: Get the User ID

After creating the user, you'll see a User ID in the format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

Example: `f47ac10b-58cc-4372-a567-0e02b2c3d479`

## Step 3: Update the Seed Script

1. Open the file `scripts/02-seed-demo-data.sql`
2. Find this line near the top:
   ```sql
   demo_user_id UUID := 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid; -- REPLACE WITH ACTUAL USER ID
   ```
3. Replace `f47ac10b-58cc-4372-a567-0e02b2c3d479` with the User ID you copied
4. Save the file

## Step 4: Run the Seed Script

### Option A: Using Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New query**
4. Copy and paste the contents of `scripts/02-seed-demo-data.sql`
5. Click **Run** button
6. You should see: "Demo user data seeded successfully!"

### Option B: Using Command Line (if you have Supabase CLI)
```bash
supabase db push scripts/02-seed-demo-data.sql
```

## Step 5: Login to Dashboard

1. Go to your JD SHARK application
2. Click **Login**
3. Enter the credentials:
   - **Email**: `demo@jdshark.com`
   - **Password**: `Demo@12345`
4. Click **Sign In**

## What You'll See in the Demo

The demo user has been pre-populated with:

### Wallet
- **Balance**: 500,000 NGN
- **Total Funded**: 1,000,000 NGN
- **Total Withdrawn**: 500,000 NGN
- **Recent Transactions**: Deposits, withdrawals, and investments

### Portfolios
1. **My Savings** (Personal)
   - 2 active investments totaling 300,000 NGN
   - Monthly auto-reinvest enabled on one investment
   
2. **College Fund - Sarah** (For Others)
   - 1 investment of 150,000 NGN
   - Auto-reinvest enabled

### Investments
- **Investment 1**: 200,000 NGN - Matures in 9 months (100% ROI)
- **Investment 2**: 100,000 NGN - Matures in 11 months (100% ROI)
- **Investment 3**: 150,000 NGN - Matures in 10 months (100% ROI)

### MLM/Referrals
- **Active Referrals**: 2 Level 1 referrals
- **Total MLM Earnings**: 30,000 NGN from two credited commissions
- **Pending Commissions**: View on MLM Dashboard

### Notifications
- Investment maturity notification
- Referral earnings notification
- Deposit successful notification

## Troubleshooting

### "User not found" error
- Make sure you're using the exact email: `demo@jdshark.com`
- Verify the password hasn't been changed: `Demo@12345`
- Check that the user was created in Supabase

### "Invalid User ID" error in seed script
- Make sure you replaced the placeholder UUID with the actual User ID from Supabase
- The User ID must be in the correct format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Don't use quotes around the UUID in the SQL

### Seed script runs but no data appears
- Verify Row Level Security policies allow the user to see their own data
- Check that the user has correct permissions in Supabase

## Next Steps

After testing with the demo account:

1. **Test Paystack Integration**: Fund wallet with test credit card
   - Use card: `5399 8343 2195 0186`
   - Exp: Any future date
   - CVV: `123`

2. **Test Referral System**: Share referral link and create new accounts

3. **Test Admin Dashboard**: Login as admin to approve KYC and manage platform

4. **Test Withdrawal**: Request a withdrawal and approve it from admin panel

## Reset Demo Data

To start fresh with new demo data:

1. Delete the demo user from Supabase (Auth > Users > Delete)
2. Run the seed script again with a new user ID

Happy testing!
