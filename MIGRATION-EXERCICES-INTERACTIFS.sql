-- ============================================================
-- FIGAROMN - RESULTATS DES EXERCICES INTERACTIFS
-- À exécuter une fois dans Supabase SQL Editor.
-- ============================================================

create table if not exists public.interactive_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  score integer not null check (score >= 0),
  total integer not null check (total > 0),
  completed_at timestamptz not null default now()
);

alter table public.interactive_results enable row level security;

drop policy if exists "student_read_own_interactive" on public.interactive_results;
create policy "student_read_own_interactive"
on public.interactive_results for select to authenticated
using (student_id = auth.uid());

drop policy if exists "student_insert_own_interactive" on public.interactive_results;
create policy "student_insert_own_interactive"
on public.interactive_results for insert to authenticated
with check (student_id = auth.uid());

drop policy if exists "teacher_read_interactive" on public.interactive_results;
create policy "teacher_read_interactive"
on public.interactive_results for select to authenticated
using (public.teacher_can_view_student(student_id));

grant select, insert on public.interactive_results to authenticated;

select 'FigaroMN : exercices interactifs activés' as resultat;
