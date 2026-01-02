# JD SHARK - Deployment Checklist

## Before Deployment

- [ ] All environment variables are set in Vercel
- [ ] Database schema is migrated in Supabase
- [ ] Paystack account is activated and keys are ready
- [ ] Email service is configured (Resend/SendGrid)
- [ ] GitHub repository is connected to Vercel
- [ ] Domain is configured (if using custom domain)

## During Deployment

- [ ] Build completes without errors
- [ ] All environment variables are properly set
- [ ] Static pages load correctly
- [ ] No 404 errors for API routes

## After Deployment

### User Features
- [ ] Homepage loads correctly
- [ ] Registration page is accessible
- [ ] Email verification works
- [ ] Login is functional
- [ ] Dashboard displays correctly
- [ ] Wallet funding via Paystack works
- [ ] Withdrawal requests can be submitted
- [ ] Portfolio creation works
- [ ] Investment creation works
- [ ] Referral link generation works

### Admin Features
- [ ] Admin dashboard is accessible (admin users only)
- [ ] User management works
- [ ] KYC approval system works
- [ ] Withdrawal approval system works
- [ ] Analytics display correctly

### API Routes
- [ ] `/api/payments/initialize` - Payment initialization
- [ ] `/api/payments/verify` - Payment verification
- [ ] `/api/withdrawals/request` - Withdrawal submission
- [ ] `/api/withdrawals/approve` - Withdrawal approval
- [ ] `/api/auth/...` - Auth endpoints

### Email System
- [ ] Registration confirmation emails are sent
- [ ] Withdrawal notification emails are sent
- [ ] Investment maturity emails are sent
- [ ] Password reset emails are sent

### Database
- [ ] Supabase connection is working
- [ ] RLS policies are enforced
- [ ] User data is isolated correctly
- [ ] Transactions are logged

## Security Checks

- [ ] No sensitive keys are exposed in client code
- [ ] All API routes require authentication
- [ ] Supabase RLS policies are enforced
- [ ] Paystack webhook is validated
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] SQL injection is prevented

## Performance

- [ ] Page load time is < 3 seconds
- [ ] Dashboard loads quickly
- [ ] No N+1 database queries
- [ ] Images are optimized
- [ ] API responses are cached where appropriate

## Monitoring

- [ ] Set up error tracking (Sentry)
- [ ] Set up performance monitoring
- [ ] Set up uptime monitoring
- [ ] Enable Vercel analytics
