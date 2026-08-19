-- ============================================================
-- FIGAROMN V9 - SUIVI PROFESSEUR DETAILLE CAP
-- À exécuter UNE SEULE FOIS dans Supabase > SQL Editor.
-- Cette migration est additive : elle ne supprime aucun compte
-- ni aucun résultat existant.
-- ============================================================

begin;

create table if not exists public.cap_activity_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  source_key text not null,
  sequence_no integer not null check (sequence_no between 1 and 7),
  activity_no integer not null check (activity_no between 1 and 6),
  activity_index integer not null check (activity_index >= 0),
  activity_type text not null check (activity_type in ('exercise','evaluation')),
  title text not null default '',
  attempt_no integer not null default 1 check (attempt_no >= 1),
  score numeric not null default 0,
  total numeric not null check (total > 0),
  note20 numeric(5,1) not null check (note20 >= 0 and note20 <= 20),
  percent numeric(5,1) not null check (percent >= 0 and percent <= 100),
  competency_data jsonb not null default '{}'::jsonb,
  indicator_data jsonb not null default '{}'::jsonb,
  details jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  unique(student_id, source_key)
);

alter table public.cap_activity_attempts enable row level security;

create index if not exists idx_cap_attempts_student_date
  on public.cap_activity_attempts(student_id, completed_at desc);

create index if not exists idx_cap_attempts_student_type
  on public.cap_activity_attempts(student_id, activity_type);

drop policy if exists cap_attempts_student_read on public.cap_activity_attempts;
create policy cap_attempts_student_read
on public.cap_activity_attempts
for select to authenticated
using (student_id = auth.uid());

drop policy if exists cap_attempts_student_insert on public.cap_activity_attempts;
create policy cap_attempts_student_insert
on public.cap_activity_attempts
for insert to authenticated
with check (student_id = auth.uid());

drop policy if exists cap_attempts_teacher_read on public.cap_activity_attempts;
create policy cap_attempts_teacher_read
on public.cap_activity_attempts
for select to authenticated
using (public.is_teacher());

grant select, insert on public.cap_activity_attempts to authenticated;

commit;

select 'FigaroMN V9 : suivi détaillé CAP activé' as resultat;
