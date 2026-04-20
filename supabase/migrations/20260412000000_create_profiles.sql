-- Create profiles table to store public user information (username)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text not null unique,
  created_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(username) between 3 and 20),
  constraint profiles_username_format check (username ~ '^[a-zA-Z0-9_]+$')
);

alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (auth.uid() = id);

-- Users can insert their own profile (via trigger only, but policy needed)
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

-- Index for username lookups (used in RLS and auth flow)
create index if not exists profiles_username_idx on public.profiles (lower(username));

-- Trigger function: auto-create profile row on new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
