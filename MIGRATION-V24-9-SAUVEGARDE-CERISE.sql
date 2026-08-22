
-- =====================================================================
-- FIGAROMN V24.9 - SAUVEGARDE DES EXPORTS CERISE PRO
-- A exécuter une fois dans Supabase > SQL Editor.
-- Ne supprime aucune donnée existante.
-- =====================================================================

begin;

create table if not exists public.cerise_exports (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  level text not null check (level in ('cap','seconde','premiere','terminale')),
  sequence_no integer not null check (sequence_no between 1 and 99),
  session_no integer not null check (session_no between 1 and 99),
  cap_year text not null default '',
  title text not null,
  filename text not null,
  file_path text,
  scpro_data text,
  exported_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pour les anciennes installations qui auraient déjà créé la table.
alter table public.cerise_exports add column if not exists cap_year text not null default '';
update public.cerise_exports set cap_year='' where cap_year is null;
alter table public.cerise_exports alter column cap_year set default '';
alter table public.cerise_exports alter column cap_year set not null;
alter table public.cerise_exports add column if not exists file_path text;
alter table public.cerise_exports add column if not exists scpro_data text;
alter table public.cerise_exports add column if not exists updated_at timestamptz not null default now();

-- Une sauvegarde par enseignant / niveau / séquence / séance / année CAP.
drop index if exists public.cerise_exports_teacher_session_uq;
create unique index cerise_exports_teacher_session_uq
on public.cerise_exports (
  teacher_id,
  level,
  sequence_no,
  session_no,
  cap_year
);

alter table public.cerise_exports enable row level security;

drop policy if exists cerise_exports_teacher_select on public.cerise_exports;
drop policy if exists cerise_exports_teacher_insert on public.cerise_exports;
drop policy if exists cerise_exports_teacher_update on public.cerise_exports;
drop policy if exists cerise_exports_teacher_delete on public.cerise_exports;

create policy cerise_exports_teacher_select
on public.cerise_exports
for select to authenticated
using (
  teacher_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'teacher'
  )
);

create policy cerise_exports_teacher_insert
on public.cerise_exports
for insert to authenticated
with check (
  teacher_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'teacher'
  )
);

create policy cerise_exports_teacher_update
on public.cerise_exports
for update to authenticated
using (
  teacher_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'teacher'
  )
)
with check (
  teacher_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'teacher'
  )
);

create policy cerise_exports_teacher_delete
on public.cerise_exports
for delete to authenticated
using (
  teacher_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'teacher'
  )
);

grant select, insert, update, delete on public.cerise_exports to authenticated;

commit;

select '✅ FIGAROMN V24.9 : sauvegarde CERISE Pro activée' as resultat;
