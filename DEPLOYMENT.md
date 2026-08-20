# Deployment Guide - Dental Clinic Booking System

## Prerequisites

- Vercel account (or any Node.js hosting)
- PostgreSQL database (Neon, Supabase, Railway, or self-hosted)
- SMTP provider for emails (SendGrid, Mailgun, Postmark, etc.)

## Quick Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Production ready"
   git push origin main
   ```

2. **Import in Vercel**
   - Go to vercel.com/new
   - Import your GitHub repo
   - Add environment variables (see below)

3. **Configure Environment Variables**
   Copy from `.env.production.example`:
   ```
   DATABASE_URL=postgresql://...
   AUTH_SECRET=your-32-char-secret
   AUTH_URL=https://your-app.vercel.app
   NEXTAUTH_URL=https://your-app.vercel.app
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=your-api-key
   EMAIL_FROM=noreply@yourdomain.com
   ```

4. **Deploy**
   Click Deploy - Vercel handles the rest

## Database Setup

### Option 1: Neon (Free Tier)
1. Create project at neon.tech
2. Copy connection string
3. Run migrations: `pnpm prisma migrate deploy`

### Option 2: Supabase
1. Create project at supabase.com
2. Enable PostgreSQL
3. Copy connection string

### Option 3: Self-hosted
```bash
# Run migrations
pnpm prisma migrate deploy

# Seed data (optional)
pnpm tsx prisma/seed.ts
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| AUTH_SECRET | Yes | 32+ char random string |
| AUTH_URL | Yes | Your production URL |
| NEXTAUTH_URL | Yes | Same as AUTH_URL |
| SMTP_HOST | Yes | SMTP server hostname |
| SMTP_PORT | Yes | SMTP port (587/465) |
| SMTP_USER | Yes | SMTP username |
| SMTP_PASSWORD | Yes | SMTP password |
| EMAIL_FROM | Yes | From email address |

## Docker Deployment

```bash
# Build
docker build -t dental-clinic .

# Run
docker run -d \
  --name dental-clinic \
  -p 3000:3000 \
  --env-file .env.production \
  dental-clinic
```

## Health Checks

- `GET /api/health` - Returns database connectivity status
- `GET /api/health` - Use for load balancer health checks

## Backup Strategy

```bash
# Manual backup
./scripts/backup.sh

# Automated via cron (daily at 2 AM)
0 2 * * * /app/scripts/backup.sh >> /var/log/backup.log 2>&1
```

## Monitoring

1. **Vercel Analytics** - Built-in, enable in project settings
2. **Sentry** (optional):
   - Add `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`
   - Install `@sentry/nextjs` if needed

## Post-Deployment Checklist

- [ ] Health check returns 200
- [ ] Login works for all roles
- [ ] Patient can book appointment
- [ ] Receptionist can confirm/check-in
- [ ] Dentist can start/complete
- [ ] Admin can manage services/dentists
- [ ] Email notifications send
- [ ] Waitlist notifications work
- [ ] Backup script runs successfully
- [ ] SSL certificate valid
- [ ] Custom domain configured

## Rollback

```bash
# Vercel: Use dashboard to promote previous deployment
# Docker: docker tag dental-clinic:previous dental-clinic:latest && docker restart dental-clinic
```