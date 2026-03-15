# IntentList (Alpha)

This app now supports two data modes:

1. `Supabase mode` (recommended for Vercel / online alpha testing)
2. `Local API mode` (existing Express + SQLite in `server.ts` for local development)

If Supabase env vars are present, the frontend uses Supabase auth + task storage directly.
If they are missing, it falls back to `/api` endpoints from `server.ts`.

## 1) Supabase Setup (required for Vercel alpha)

### Create project + get keys

1. Create a Supabase project.
2. Copy:
   - Project URL
   - Anon public key
3. Set these env vars in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Create tasks table + policies

Run this SQL in Supabase SQL Editor:

```sql
create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  date text not null,
  time text null,
  completed boolean not null default false,
  priority text not null default 'normal',
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "tasks_select_own"
on public.tasks
for select
using (auth.uid() = user_id);

create policy "tasks_insert_own"
on public.tasks
for insert
with check (auth.uid() = user_id);

create policy "tasks_update_own"
on public.tasks
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "tasks_delete_own"
on public.tasks
for delete
using (auth.uid() = user_id);
```

### Auth settings for alpha

For easiest alpha testing, in Supabase Auth settings:

1. Disable email confirmation (`Confirm email`) OR
2. Keep it enabled and tell testers to verify email before first login

## 2) Local Development

Install:

```bash
npm install
```

Run local app with Express + SQLite:

```bash
npm run dev
```

## 3) Vercel Deploy Notes

1. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel Project Settings -> Environment Variables.
2. Redeploy.
3. Test signup/login on deployed URL.

## 4) Quick check before push

```bash
npm run lint
npm run build
```
"# IntentList" 
