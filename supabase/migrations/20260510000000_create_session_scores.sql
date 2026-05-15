-- Store per-user session scores for the growth chart in SessionSummaryModal

create table if not exists public.session_scores (
  id             uuid        default gen_random_uuid() primary key,
  user_id        uuid        references auth.users on delete cascade not null,
  logical_density   smallint not null check (logical_density   between 1 and 10),
  sentence_flow_score smallint not null check (sentence_flow_score between 1 and 10),
  created_at     timestamptz default now() not null
);

alter table public.session_scores enable row level security;

create policy "session_scores_select_own" on public.session_scores
  for select to authenticated
  using (auth.uid() = user_id);

create policy "session_scores_insert_own" on public.session_scores
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Efficient per-user history queries (ordered by recency)
create index if not exists session_scores_user_created_idx
  on public.session_scores (user_id, created_at desc);
