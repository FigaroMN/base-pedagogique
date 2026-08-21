-- =====================================================================
-- FIGAROMN V23.5 - HISTORIQUE DU CAHIER DE TEXTE
-- A executer UNE FOIS dans Supabase > SQL Editor.
-- =====================================================================

begin;

create table if not exists public.logbook_entries (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  level text not null check (level in ('seconde','premiere','terminale','cap')),
  sequence_no integer not null check (sequence_no between 1 and 20),
  session_no integer not null check (session_no between 1 and 20),
  entry_date date not null default current_date,
  duration text,
  title text not null default '',
  content text not null default '',
  homework text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_logbook_teacher_date
on public.logbook_entries(teacher_id, entry_date desc);

create index if not exists idx_logbook_class_date
on public.logbook_entries(class_id, entry_date desc);

alter table public.logbook_entries enable row level security;

drop policy if exists logbook_teacher_select on public.logbook_entries;
drop policy if exists logbook_teacher_insert on public.logbook_entries;
drop policy if exists logbook_teacher_update on public.logbook_entries;
drop policy if exists logbook_teacher_delete on public.logbook_entries;

create policy logbook_teacher_select
on public.logbook_entries
for select to authenticated
using (
  teacher_id = auth.uid()
);

create policy logbook_teacher_insert
on public.logbook_entries
for insert to authenticated
with check (
  teacher_id = auth.uid()
  and public.is_teacher()
  and public.teacher_owns_class(class_id)
);

create policy logbook_teacher_update
on public.logbook_entries
for update to authenticated
using (
  teacher_id = auth.uid()
)
with check (
  teacher_id = auth.uid()
  and public.is_teacher()
  and public.teacher_owns_class(class_id)
);

create policy logbook_teacher_delete
on public.logbook_entries
for delete to authenticated
using (
  teacher_id = auth.uid()
);

grant select, insert, update, delete
on public.logbook_entries
to authenticated;

commit;

select 'FigaroMN V23.5 : historique cahier de texte activé' as resultat;
