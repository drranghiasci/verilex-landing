# VeriLex Deploy Runbook

## Required Environment Variables (MyClient)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

## Migrations
- Naming convention: `YYYYMMDDHHMMSS_description.sql`
- Do not reuse the same date prefix. Each migration must have a unique timestamp.

### Apply Migrations
1) Ensure the Supabase CLI is installed and configured.
2) From repo root, run:
   `supabase db push`

## Deploy Notes
- Landing app: set Vercel Root Directory to `apps/landing`
- MyClient app: set Vercel Root Directory to `apps/myclient`
- Verify MyClient env vars are set in Vercel before deploy

