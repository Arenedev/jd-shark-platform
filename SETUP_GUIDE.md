# JD SHARK Platform - Setup & Deployment Guide

## Prerequisites

- Node.js 18+ installed
- Supabase account (already configured)
- Paystack account (get from https://paystack.com)
- Email service provider account (Resend, SendGrid, or similar)

## 1. Environment Variables Setup

Add these variables to your Vercel project in the **Vars** section of the in-chat sidebar:

### Required Variables

```
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
SUPABASE_JWT_SECRET=<your-supabase-jwt-secret>
```

### Paystack Variables

```
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=<your-paystack-public-key>
PAYSTACK_SECRET_KEY=<your-paystack-secret-key>
```

### Email Service Variables (Choose one)

**For Resend:**
```
RESEND_API_KEY=<your-resend-api-key>
```

**For SendGrid:**
```
SENDGRID_API_KEY=<your-sendgrid-api-key>
```

## 2. Database Setup

The database schema is already configured in the Supabase integration. The following tables are created:

- `profiles` - User profiles and information
- `wallets` - User wallet data
- `wallet_transactions` - Transaction history
- `portfolios` - Investment portfolios
- `investments` - Individual investments
- `referrals` - MLM referral tracking
- `mlm_earnings` - Earnings from MLM
- `withdrawals` - Withdrawal requests
- `kyc_documents` - KYC verification documents

## 3. Paystack Setup

1. Log in to your Paystack dashboard
2. Go to **Settings > API Keys & Webhooks**
3. Copy your:
   - **Public Key** → Set as `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
   - **Secret Key** → Set as `PAYSTACK_SECRET_KEY`

4. Set up webhook in Paystack:
   - URL: `https://your-domain.com/api/webhooks/paystack`
   - Events: `charge.success`, `charge.failed`

## 4. Email Service Setup

### Using Resend (Recommended)

1. Sign up at https://resend.com
2. Create a domain and get your API key
3. Update `lib/email.ts` to use Resend:

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  return resend.emails.send({
    from: "noreply@yourdomain.com",
    to,
    subject,
    html,
  });
}
```

### Using SendGrid

1. Sign up at https://sendgrid.com
2. Get your API key
3. Update `lib/email.ts` to use SendGrid

## 5. Deployment to Vercel

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Add Paystack integration and withdrawal system"
   git push origin main
   ```

2. **Deploy to Vercel**:
   - Visit https://vercel.com
   - Click "New Project"
   - Select your GitHub repository
   - Vercel will automatically detect Next.js
   - Click "Deploy"

3. **Add Environment Variables** in Vercel:
   - Go to Project Settings > Environment Variables
   - Add all variables from Section 1 above
   - Redeploy the project

4. **Update NEXT_PUBLIC_SITE_URL**:
   - After deployment, get your Vercel URL
   - Update `NEXT_PUBLIC_SITE_URL` to your deployed URL
   - Redeploy again

## 6. Post-Deployment Checklist

- [ ] Test user registration
- [ ] Verify email notifications are being sent
- [ ] Test Paystack wallet funding
- [ ] Test withdrawal request submission
- [ ] Verify MLM referral tracking
- [ ] Test admin dashboard access
- [ ] Check all API routes are working
- [ ] Review Supabase logs for errors
- [ ] Set up monitoring/alerts (Sentry recommended)

## 7. Key Features Ready to Use

### For Users
- Registration and KYC verification
- Wallet funding via Paystack
- Portfolio and investment management
- MLM referral tracking and earnings
- Withdrawal requests
- Transaction history

### For Admins
- User management dashboard
- KYC verification and approval
- Withdrawal approval
- Analytics and reporting
- User suspension/activation

## 8. Payment Flow

1. User clicks "Fund Wallet"
2. Enters amount and clicks "Fund Wallet" button
3. Redirected to Paystack checkout
4. User completes payment
5. Paystack redirects back to app with reference
6. App verifies payment with Paystack API
7. Wallet is credited instantly
8. User receives confirmation email

## 9. Withdrawal Flow

1. User submits withdrawal request with bank details
2. Amount is deducted from wallet (pending)
3. Admin receives notification
4. Admin approves/rejects in admin dashboard
5. User receives email notification
6. Admin processes bank transfer
7. Status updated in user dashboard

## 10. Troubleshooting

### Payment Not Working
- Verify Paystack keys are correct
- Check webhook configuration
- Review Paystack transaction logs

### Emails Not Sending
- Check email service API key
- Verify domain is configured (for Resend)
- Check SPAM folder

### Auth Issues
- Clear browser cookies
- Check Supabase auth settings
- Verify JWT secret matches

## Support

For issues or questions:
1. Check Supabase dashboard for database errors
2. Review Paystack transaction logs
3. Check email service logs
4. View Vercel deployment logs
5. Contact support at vercel.com/help
