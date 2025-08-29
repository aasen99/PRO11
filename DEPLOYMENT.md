# PRO11 Deployment Guide

## 🚀 Getting PRO11 Live with Database

This guide will walk you through deploying PRO11 to production with a real database, payment processing, and email functionality.

## 📋 Prerequisites

- Node.js 18+ installed
- Git repository set up
- Domain name (pro11.no) ready
- Credit card for services

## 🔧 Step 1: Set Up Supabase Database

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login and create new project
3. Choose a region close to Norway (e.g., West Europe)
4. Note down your project URL and anon key

### 1.2 Set Up Database Schema
1. Go to SQL Editor in Supabase dashboard
2. Copy and paste the contents of `supabase-schema.sql`
3. Run the SQL to create all tables and sample data

### 1.3 Configure Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to tournaments
CREATE POLICY "Public read access to tournaments" ON tournaments
  FOR SELECT USING (true);

-- Create policies for team registration
CREATE POLICY "Allow team registration" ON teams
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow team updates by captain" ON teams
  FOR UPDATE USING (captain_email = current_user);
```

## 💳 Step 2: Set Up Stripe Payments

### 2.1 Create Stripe Account
1. Go to [stripe.com](https://stripe.com)
2. Create account and complete verification
3. Get your publishable and secret keys from dashboard

### 2.2 Configure Webhooks
1. In Stripe dashboard, go to Webhooks
2. Add endpoint: `https://pro11.no/api/webhooks/stripe`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy webhook secret

## 📧 Step 3: Set Up Email Service

### 3.1 Gmail App Password
1. Go to Google Account settings
2. Enable 2-factor authentication
3. Generate app password for Gmail
4. Use this password in environment variables

## 🌐 Step 4: Deploy to Vercel

### 4.1 Prepare for Deployment
1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file with your credentials:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here

# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here

# Next.js Configuration
NEXTAUTH_URL=https://pro11.no
NEXTAUTH_SECRET=your_generated_secret_here

# Production URLs
NEXT_PUBLIC_SITE_URL=https://pro11.no
```

### 4.2 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your Git repository
3. Configure environment variables in Vercel dashboard
4. Deploy

### 4.3 Custom Domain Setup
1. In Vercel dashboard, go to Domains
2. Add `pro11.no` as custom domain
3. Update DNS records as instructed by Vercel

## 🔒 Step 5: Security & SSL

### 5.1 SSL Certificate
- Vercel automatically provides SSL certificates
- Ensure HTTPS is enforced

### 5.2 Environment Variables
- Never commit `.env.local` to Git
- Use Vercel's environment variable system
- Rotate secrets regularly

## 📊 Step 6: Monitoring & Analytics

### 6.1 Set Up Monitoring
1. Enable Vercel Analytics
2. Set up error tracking (Sentry recommended)
3. Monitor database performance in Supabase

### 6.2 Backup Strategy
1. Enable automatic backups in Supabase
2. Set up database snapshots
3. Test restore procedures

## 🧪 Step 7: Testing

### 7.1 Test Payment Flow
1. Use Stripe test cards for testing
2. Test webhook endpoints
3. Verify email delivery

### 7.2 Load Testing
1. Test with multiple concurrent users
2. Monitor database performance
3. Optimize queries if needed

## 🚀 Step 8: Go Live Checklist

- [ ] Database schema deployed and tested
- [ ] Stripe payments working in production
- [ ] Email notifications working
- [ ] SSL certificate active
- [ ] Custom domain configured
- [ ] Environment variables set
- [ ] Error monitoring active
- [ ] Backup system configured
- [ ] Admin access tested
- [ ] Payment flow tested end-to-end

## 🔧 Maintenance

### Regular Tasks
- Monitor database performance
- Update dependencies monthly
- Review security logs
- Backup verification
- SSL certificate renewal

### Emergency Procedures
- Database restore process
- Payment system fallback
- Contact information for support

## 📞 Support

For technical support:
- Discord: [https://discord.gg/Es8UAkax8H](https://discord.gg/Es8UAkax8H)
- Email: [kontakt@pro11.no](mailto:kontakt@pro11.no)

## 💰 Estimated Costs

- **Vercel**: Free tier (up to 100GB bandwidth)
- **Supabase**: Free tier (up to 500MB database)
- **Stripe**: 2.9% + 30¢ per transaction
- **Domain**: ~$10-15/year
- **Email**: Free with Gmail

Total estimated monthly cost: $0-50 depending on usage. 