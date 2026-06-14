# PSGC Project Dashboard

Real-time project status dashboard for PS Global Consulting (PSGC), built on Next.js 14, Supabase, and Vercel. Tracks NetSuite implementation projects with auto-sync from ClickUp, Gmail, and Google Drive.

## Features

- Project cards with inline-editable fields (click any value to edit)
- RAG status (Green/Amber/Red) — click to cycle
- Action plan table with drag-to-reorder, bulk status update, CSV export
- Auto-sync every 24h: ClickUp tasks → Gmail threads → Google Drive docs
- AI extraction of action items from emails and documents (Claude API)
- Activity feed with audit trail
- Responsive mobile sidebar

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier)
- A [Vercel](https://vercel.com) account (free tier)
- Google Cloud project with Gmail API + Drive API enabled
- ClickUp workspace with API access
- Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

---

## Step 1 — Supabase Setup

1. Go to [supabase.com](https://supabase.com) → New project
2. Once provisioned, open **SQL Editor**
3. Paste and run the contents of `supabase/schema.sql`
4. Copy your credentials from **Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL` → Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `anon` public key
   - `SUPABASE_SERVICE_ROLE_KEY` → `service_role` key (keep secret)

---

## Step 2 — Google OAuth Setup (Gmail + Drive)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project → **Enable APIs** → enable **Gmail API** and **Google Drive API**
3. **OAuth consent screen** → External → fill in app name
4. **Credentials** → Create OAuth 2.0 Client ID → Desktop app
5. Download the JSON, note `client_id` and `client_secret`
6. Generate a refresh token using the OAuth playground or this script:

```bash
# Install google-auth-library temporarily
npx --yes google-auth-cli \
  --client-id YOUR_CLIENT_ID \
  --client-secret YOUR_CLIENT_SECRET \
  --scope "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/drive.readonly"
```

Or use [OAuth 2.0 Playground](https://developers.google.com/oauthplayground):
- Set your client credentials in the gear icon
- Authorize scopes: `https://www.googleapis.com/auth/gmail.readonly` and `https://www.googleapis.com/auth/drive.readonly`
- Exchange code → copy **Refresh token**

7. Get your Google Drive folder ID from the folder URL:
   `https://drive.google.com/drive/folders/YOUR_FOLDER_ID_HERE`

---

## Step 3 — ClickUp API Setup

1. In ClickUp → **Settings → Apps → API Token** → copy your token
2. Get your Team ID: `curl -H "Authorization: YOUR_TOKEN" https://api.clickup.com/api/v2/team`
   Copy the `id` from the first team in the response.

For Gmail auto-tagging, create a Gmail label called `project-update` and apply it to relevant threads.

---

## Step 4 — Local Development

```bash
cd psgc-dashboard
npm install
cp .env.local .env.local   # Fill in all values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it will redirect to the first project.

---

## Step 5 — Deploy to Vercel

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
vercel

# Follow prompts: link to your Vercel account, set project name
```

**Add all environment variables in Vercel dashboard:**
1. Go to your Vercel project → **Settings → Environment Variables**
2. Add each variable from `.env.local` (copy the key=value pairs)
3. Deploy again: `vercel --prod`

The cron job is configured automatically via `vercel.json` — it runs daily at 1AM Jakarta time (UTC+7 = 18:00 UTC). No extra setup needed on the free plan.

---

## Architecture

```
app/
  page.tsx                    — redirect to first project
  projects/
    page.tsx                  — manage all projects (add/delete)
    [id]/page.tsx             — main dashboard view
  api/
    projects/route.ts         — GET all, POST new
    projects/[id]/route.ts    — GET one, PATCH, DELETE
    action-items/route.ts     — GET (filtered), POST
    action-items/[id]/route.ts — PATCH, DELETE
    audit-log/route.ts        — GET recent changes
    sync/route.ts             — POST (cron trigger), GET sync log

components/
  Sidebar.tsx                 — left nav with project list + sync button
  ProjectCard.tsx             — project header card with all editable fields
  ActionPlanTable.tsx         — drag-sortable action items with inline edit
  EditableField.tsx           — generic click-to-edit field component
  RAGBadge.tsx                — click-to-cycle Green/Amber/Red badge
  TeamMemberList.tsx          — add/remove team members
  SyncProgress.tsx            — sync status modal

lib/
  supabase.ts                 — client + type definitions
  clickup.ts                  — ClickUp REST API calls
  gmail.ts                    — Gmail API (OAuth2)
  gdrive.ts                   — Google Drive API
  aiExtractor.ts              — Claude API call to extract action items
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key |
| `CLICKUP_API_TOKEN` | Optional | ClickUp personal API token |
| `CLICKUP_TEAM_ID` | Optional | ClickUp workspace/team ID |
| `GMAIL_CLIENT_ID` | Optional | Google OAuth client ID |
| `GMAIL_CLIENT_SECRET` | Optional | Google OAuth client secret |
| `GMAIL_REFRESH_TOKEN` | Optional | Google OAuth refresh token |
| `GDRIVE_FOLDER_ID` | Optional | Google Drive folder to monitor |
| `ANTHROPIC_API_KEY` | Optional | Required for AI extraction |
| `ADMIN_SECRET` | ✅ | Protects sync endpoint |
| `CRON_SECRET` | ✅ | Vercel cron auth header |

The app works without any optional variables — manual-only mode.

---

## Manual Sync

Click **Sync Now** in the sidebar or header. You'll be prompted for the `ADMIN_SECRET`. The sync runs ClickUp → Gmail → GDrive in sequence and shows live progress.

## Graceful Degradation

If any API is not configured or fails:
- ClickUp/Gmail/GDrive: sync skips that source, logs error in `sync_log`, shows last success time
- AI extraction fails: action items are not created from that source
- All external APIs missing: dashboard works as a fully manual project tracker

---

## Security Notes

- The admin secret gates all write/sync operations — use a strong random value
- `SUPABASE_SERVICE_ROLE_KEY` is server-only — never expose to the client
- `.env.local` is in `.gitignore` — never commit it
- For production, consider adding Supabase Row Level Security (RLS) policies
