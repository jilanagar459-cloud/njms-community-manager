# NJMS Community Manager

A real, deployable version of the NJMS Community Manager app — same UI and
logic as the original, but backed by a real Supabase database instead of
Claude's artifact-only `window.storage`.

## What changed from the original

- `src/storageShim.js` is a drop-in replacement for `window.storage`, backed
  by one Supabase table (`kv_store`). The rest of the app (`App.jsx`) is
  untouched — it still calls `window.storage.get/set` exactly as before.
- Nothing else about the UI, login, signup, or WhatsApp invite logic changed.

---

## 1. Create a Supabase project (free tier)

1. Go to https://supabase.com → sign up → **New Project**.
2. Pick any name/region, set a database password (save it somewhere safe —
   you won't need it for this app, but Supabase requires one).
3. Wait ~2 minutes for the project to finish provisioning.

## 2. Create the database table

1. In your Supabase project, open **SQL Editor** (left sidebar).
2. Paste this and click **Run**:

```sql
create table kv_store (
  key text not null,
  shared boolean not null default true,
  value text,
  updated_at timestamptz default now(),
  primary key (key, shared)
);

-- Allow the app's anon key to read/write. This app's own login screen is
-- the access control — Supabase's row-level security is left open here for
-- simplicity. If you want database-level security too, ask Claude to add a
-- restricted RLS policy instead.
alter table kv_store enable row level security;

create policy "Allow anon read" on kv_store
  for select using (true);

create policy "Allow anon write" on kv_store
  for insert with check (true);

create policy "Allow anon update" on kv_store
  for update using (true);

create policy "Allow anon delete" on kv_store
  for delete using (true);
```

## 3. Get your API keys

1. In Supabase, go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. Create a file called `.env.local` in this project's root folder (copy
   `.env.example` and rename it), and paste in your values:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

`.env.local` is already in `.gitignore` — it will never be pushed to GitHub.

## 4. Run it locally (optional, to test before deploying)

```bash
npm install
npm run dev
```

Open the printed `localhost` URL. The very first time, you'll see the
"Create the super admin account" setup screen — that's expected, since the
database is empty.

---

## 5. Push to GitHub

1. Go to https://github.com/new → create a new repository (e.g.
   `njms-community-manager`). Don't initialize it with a README — this
   project already has one.
2. In this project's folder, run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/njms-community-manager.git
git push -u origin main
```

(Replace `YOUR-USERNAME` with your actual GitHub username.)

## 6. Deploy on Vercel

1. Go to https://vercel.com → sign in with your GitHub account.
2. Click **Add New → Project**.
3. Select your `njms-community-manager` repo → click **Import**.
4. Vercel auto-detects Vite. Leave build settings as default
   (`npm run build`, output directory `dist`).
5. Before clicking Deploy, open **Environment Variables** and add:
   - `VITE_SUPABASE_URL` → your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → your Supabase anon key
6. Click **Deploy**. Wait ~1 minute.
7. You'll get a live URL like `https://njms-community-manager.vercel.app`.

Your join link (shown in the Members panel, and included in WhatsApp
invites) will automatically be `https://your-app.vercel.app/join` — no
manual editing needed.

## 7. Future updates

Any time you want to change the app, edit the code and run:

```bash
git add .
git commit -m "Describe your change"
git push
```

Vercel automatically rebuilds and redeploys within ~1 minute of every push.

---

## Notes on security

- The admin login in this app (name + password) is custom-built and stores
  password hashes in your Supabase table — it works, but it's not as secure
  as a dedicated auth system. Treat admin passwords as sensitive, and don't
  reuse important passwords here.
- The Supabase policies above allow anyone with your anon key (which is
  publicly visible in the deployed site's JS bundle, by design) to read and
  write to `kv_store`. That's normal for small internal tools, but it does
  mean a technically determined person could write directly to your
  database, bypassing the app's UI. If you want this locked down further,
  ask Claude to set up proper row-level security tied to authenticated
  Supabase users.
