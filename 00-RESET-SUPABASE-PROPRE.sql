
-- =====================================================================
-- FIGAROMN - REMISE A PLAT PROPRE SUPABASE
-- Version stable : Auth + RLS sans récursion
--
-- Ce script CONSERVE les comptes et les données existantes.
-- Il remplace uniquement les anciennes policies/fonctions de sécurité
-- de l'application FigaroMN et complète les colonnes/tables nécessaires.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- A. STRUCTURE MINIMALE
-- ---------------------------------------------------------------------

alter table public.profiles
  add column if not exists email text;

alter table public.profiles
  add column if not exists archived_at timestamptz;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and (p.email is distinct from u.email);

create table if not exists public.interactive_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  score integer not null check (score >= 0),
  total integer not null check (total > 0),
  completed_at timestamptz not null default now()
);

alter table public.interactive_results enable row level security;

create index if not exists idx_class_members_student
  on public.class_members(student_id);

create index if not exists idx_classes_teacher
  on public.classes(teacher_id);

create index if not exists idx_progress_student
  on public.session_progress(student_id);

create index if not exists idx_evaluation_student
  on public.evaluation_results(student_id);

create index if not exists idx_observation_student
  on public.competency_observations(student_id);

create index if not exists idx_interactive_student
  on public.interactive_results(student_id);

-- ---------------------------------------------------------------------
-- B. PROFIL CRÉÉ AUTOMATIQUEMENT À L'INSCRIPTION
-- Le niveau choisi sur FigaroMN est enregistré s'il est valide.
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_level text;
begin
  requested_level := new.raw_user_meta_data ->> 'level';

  if requested_level not in ('seconde','premiere','terminale') then
    requested_level := null;
  end if;

  insert into public.profiles (
    id, full_name, email, role, level
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    'student',
    requested_level
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = case
        when coalesce(public.profiles.full_name,'') = '' then excluded.full_name
        else public.profiles.full_name
      end,
      level = coalesce(public.profiles.level, excluded.level);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- C. FONCTIONS DE SÉCURITÉ
-- IMPORTANT : SECURITY DEFINER évite que les policies se rappellent
-- mutuellement et provoquent "infinite recursion".
-- ---------------------------------------------------------------------

create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'teacher'
      and p.archived_at is null
  );
$$;

create or replace function public.teacher_owns_class(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.classes c
    where c.id = target_class
      and c.teacher_id = auth.uid()
  );
$$;

create or replace function public.student_in_class(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.class_members cm
    where cm.class_id = target_class
      and cm.student_id = auth.uid()
  );
$$;

create or replace function public.teacher_can_view_student(target_student uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_teacher()
  and (
    exists (
      select 1
      from public.classes c
      join public.class_members cm on cm.class_id = c.id
      where c.teacher_id = auth.uid()
        and cm.student_id = target_student
    )
    or not exists (
      select 1
      from public.class_members cm2
      where cm2.student_id = target_student
    )
  );
$$;

-- ---------------------------------------------------------------------
-- D. SUPPRIMER TOUTES LES ANCIENNES POLICIES FIGAROMN
-- Cela supprime la source de la récursion.
-- ---------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles','classes','class_members','sessions',
        'session_progress','evaluation_results','competencies',
        'competency_observations','agenda_entries','interactive_results'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      r.policyname, r.schemaname, r.tablename
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- E. NOUVELLES POLICIES SIMPLES ET NON RÉCURSIVES
-- ---------------------------------------------------------------------

-- PROFILES
create policy profiles_select_own_or_teacher
on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.teacher_can_view_student(id)
);

create policy profiles_teacher_update_student
on public.profiles
for update to authenticated
using (
  public.teacher_can_view_student(id)
)
with check (
  public.teacher_can_view_student(id)
);

-- CLASSES
create policy classes_teacher_manage
on public.classes
for all to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());

create policy classes_student_read
on public.classes
for select to authenticated
using (public.student_in_class(id));

-- CLASS MEMBERS : aucune policy ne requête directement classes/class_members
-- sans passer par une fonction SECURITY DEFINER.
create policy class_members_student_read_own
on public.class_members
for select to authenticated
using (student_id = auth.uid());

create policy class_members_teacher_read
on public.class_members
for select to authenticated
using (public.teacher_owns_class(class_id));

create policy class_members_teacher_insert
on public.class_members
for insert to authenticated
with check (public.teacher_owns_class(class_id));

create policy class_members_teacher_delete
on public.class_members
for delete to authenticated
using (public.teacher_owns_class(class_id));

-- SESSIONS
create policy sessions_authenticated_read
on public.sessions
for select to authenticated
using (is_published = true or public.is_teacher());

create policy sessions_teacher_manage
on public.sessions
for all to authenticated
using (public.is_teacher())
with check (public.is_teacher());

-- PROGRESSION
create policy progress_student_all
on public.session_progress
for all to authenticated
using (student_id = auth.uid())
with check (student_id = auth.uid());

create policy progress_teacher_read
on public.session_progress
for select to authenticated
using (public.teacher_can_view_student(student_id));

-- EVALUATIONS
create policy evaluations_student_select
on public.evaluation_results
for select to authenticated
using (student_id = auth.uid());

create policy evaluations_student_insert
on public.evaluation_results
for insert to authenticated
with check (student_id = auth.uid());

create policy evaluations_teacher_read
on public.evaluation_results
for select to authenticated
using (public.teacher_can_view_student(student_id));

-- COMPETENCES : catalogue
create policy competencies_authenticated_read
on public.competencies
for select to authenticated
using (true);

create policy competencies_teacher_manage
on public.competencies
for all to authenticated
using (public.is_teacher())
with check (public.is_teacher());

-- OBSERVATIONS DE COMPETENCES
create policy observations_student_read
on public.competency_observations
for select to authenticated
using (student_id = auth.uid());

create policy observations_teacher_select
on public.competency_observations
for select to authenticated
using (public.teacher_can_view_student(student_id));

create policy observations_teacher_insert
on public.competency_observations
for insert to authenticated
with check (
  teacher_id = auth.uid()
  and public.teacher_can_view_student(student_id)
);

create policy observations_teacher_update
on public.competency_observations
for update to authenticated
using (
  teacher_id = auth.uid()
  and public.teacher_can_view_student(student_id)
)
with check (
  teacher_id = auth.uid()
  and public.teacher_can_view_student(student_id)
);

create policy observations_teacher_delete
on public.competency_observations
for delete to authenticated
using (
  teacher_id = auth.uid()
  and public.teacher_can_view_student(student_id)
);

-- AGENDA
create policy agenda_student_read
on public.agenda_entries
for select to authenticated
using (public.student_in_class(class_id));

create policy agenda_teacher_manage
on public.agenda_entries
for all to authenticated
using (
  teacher_id = auth.uid()
  and public.teacher_owns_class(class_id)
)
with check (
  teacher_id = auth.uid()
  and public.teacher_owns_class(class_id)
);

-- EXERCICES INTERACTIFS
create policy interactive_student_select
on public.interactive_results
for select to authenticated
using (student_id = auth.uid());

create policy interactive_student_insert
on public.interactive_results
for insert to authenticated
with check (student_id = auth.uid());

create policy interactive_teacher_read
on public.interactive_results
for select to authenticated
using (public.teacher_can_view_student(student_id));

-- ---------------------------------------------------------------------
-- F. DROITS SQL
-- ---------------------------------------------------------------------

grant usage on schema public to authenticated;

grant select on public.profiles to authenticated;
grant update(level, full_name, archived_at) on public.profiles to authenticated;

grant select on public.classes to authenticated;
grant select, insert, delete on public.class_members to authenticated;

grant select on public.sessions to authenticated;
grant select, insert, update on public.session_progress to authenticated;

grant select, insert on public.evaluation_results to authenticated;
grant select on public.competencies to authenticated;
grant select, insert, update, delete on public.competency_observations to authenticated;
grant select, insert, update, delete on public.agenda_entries to authenticated;
grant select, insert on public.interactive_results to authenticated;

grant execute on function public.is_teacher() to authenticated;
grant execute on function public.teacher_owns_class(uuid) to authenticated;
grant execute on function public.student_in_class(uuid) to authenticated;
grant execute on function public.teacher_can_view_student(uuid) to authenticated;

commit;

select
  'FigaroMN : base propre, RLS sans récursion' as resultat;
