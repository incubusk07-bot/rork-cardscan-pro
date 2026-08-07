-- ============================================================
-- Verex — Supabase schema (run in SQL Editor of your project:
-- https://supabase.com/dashboard/project/uplwlwumsptrbxvoazzi)
-- Serverless backend: Postgres + Auth + Storage on the free tier.
--
-- EMAIL (Resend SMTP): Dashboard → Project Settings → Auth →
--   SMTP Settings → enable Custom SMTP:
--     Host: smtp.resend.com, Port: 465, User: resend,
--     Pass: <RESEND_API_KEY>, Sender: verified domain address.
--
-- GOOGLE SIGN-IN (OAuth): Dashboard → Auth → Providers → Google.
--   A 500 "unexpected_failure" page during sign-in means the provider is
--   enabled but its Client ID/Secret are missing or wrong. Fix:
--   1. Google Cloud Console → APIs & Services → Credentials →
--      Create OAuth client ID → type "Web application".
--   2. Authorized redirect URI (exactly):
--        https://uplwlwumsptrbxvoazzi.supabase.co/auth/v1/callback
--   3. Paste that Client ID + Secret into Supabase → Auth → Providers →
--      Google and save. (The Android SHA-1 fields below are only needed
--      for native one-tap sign-in, not for this browser OAuth flow.)
--   Android package name: com.cardscanner.app
--   SHA-1 (debug):   REPLACE_WITH_DEBUG_SHA1_FINGERPRINT
--   SHA-1 (release): REPLACE_WITH_RELEASE_SHA1_FINGERPRINT
--   SHA-256 pair:    REPLACE_WITH_DEBUG_SHA256 / REPLACE_WITH_RELEASE_SHA256
--   Get debug: keytool -list -v -keystore ~/.android/debug.keystore \
--     -alias androiddebugkey -storepass android -keypass android
--   Get release: Play Console → Setup → App signing.
--
-- REDIRECT URLS (required): Dashboard → Auth → URL Configuration →
--   Redirect URLs — add BOTH:
--     com.cardscanner.app://        (standalone Android APK)
--     exp://*                       (Expo Go / Rork preview; or paste the
--                                    exact exp:// URI printed in the app
--                                    log line "[auth] google redirect uri")
--   The app calls supabase.auth.signInWithOAuth({ provider: 'google',
--   options: { redirectTo: 'com.cardscanner.app://' } }) on device builds.
-- ============================================================

-- Profiles (auto-created on signup)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  review_credits int not null default 3,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reference cards cache (for pHash / ORB matching done by Edge Functions later)
create table if not exists public.cards_reference (
  id text primary key,
  game text not null check (game in ('pokemon','yugioh','onepiece','mtg','nba')),
  name text not null,
  set_name text,
  number text,
  rarity text,
  image_url text,
  reference_text text,
  phash text,
  created_at timestamptz not null default now()
);

alter table public.cards_reference enable row level security;
create policy "cards_reference_read_all" on public.cards_reference
  for select using (true);

-- Grading records (scan + verdict + score)
create table if not exists public.grading_records (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  game text,
  card_id text,
  card_name text,
  set_name text,
  card_number text,
  image_path text,
  verdict text not null check (verdict in ('likely_original','likely_counterfeit','inconclusive')),
  condition_score numeric(3,1),
  match_confidence int,
  pillars jsonb not null default '{}'::jsonb,
  signals jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  market_price numeric(12,2),
  price_source text
);

alter table public.grading_records enable row level security;
create policy "grading_records_all_own" on public.grading_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Collection items (portfolio)
create table if not exists public.collection_items (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  game text,
  card_id text,
  card_name text,
  set_name text,
  card_number text,
  rarity text,
  image_url text,
  condition_score numeric(3,1),
  verdict text,
  market_price numeric(12,2),
  manual_price numeric(12,2),
  price_source text,
  price_history jsonb not null default '[]'::jsonb
);

alter table public.collection_items enable row level security;
create policy "collection_items_all_own" on public.collection_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Watchlist
create table if not exists public.watchlist_items (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  game text,
  card_id text,
  card_name text,
  set_name text,
  image_url text,
  market_price numeric(12,2)
);

alter table public.watchlist_items enable row level security;
create policy "watchlist_items_all_own" on public.watchlist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Expert review queue (credits deducted only on explicit submit)
create table if not exists public.review_queue (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  card_name text,
  game text,
  image_path text,
  status text not null default 'pending' check (status in ('pending','in_review','completed')),
  probe_answers jsonb not null default '[]'::jsonb,
  auto_verdict text,
  auto_condition_score numeric(3,1),
  reviewer_verdict text,
  reviewer_notes text
);

alter table public.review_queue enable row level security;
create policy "review_queue_insert_own" on public.review_queue
  for insert with check (auth.uid() = user_id);
create policy "review_queue_select_own" on public.review_queue
  for select using (auth.uid() = user_id);

-- Labeled training archive (free dataset for periodic TFLite retrains)
create table if not exists public.labeled_training_scans (
  id text primary key,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  label text not null check (label in ('confirmed_original','confirmed_fake')),
  game text,
  card_name text,
  image_path text,
  traits jsonb not null default '{}'::jsonb
);

alter table public.labeled_training_scans enable row level security;
create policy "labeled_scans_insert_auth" on public.labeled_training_scans
  for insert with check (auth.uid() = user_id);
create policy "labeled_scans_select_own" on public.labeled_training_scans
  for select using (auth.uid() = user_id);

-- Storage bucket for validated scan photos
insert into storage.buckets (id, name, public)
values ('scans', 'scans', false)
on conflict (id) do nothing;

create policy "scans_upload_own" on storage.objects
  for insert with check (
    bucket_id = 'scans' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "scans_read_own" on storage.objects
  for select using (
    bucket_id = 'scans' and auth.uid()::text = (storage.foldername(name))[1]
  );
