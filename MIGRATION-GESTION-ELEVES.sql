-- ============================================================
-- FIGAROMN - GESTION DES ELEVES
-- Archive / restauration / suppression définitive
-- À exécuter une fois dans Supabase SQL Editor.
-- ============================================================

alter table public.profiles
add column if not exists archived_at timestamptz;

-- Archive ou restaure un élève.
-- Seul l'enseignant d'une classe à laquelle appartient l'élève peut agir.
create or replace function public.set_student_archived(
  target_student uuid,
  make_archived boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_teacher() then
    raise exception 'Accès enseignant requis';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = target_student
      and role = 'student'
  ) then
    raise exception 'Élève introuvable';
  end if;

  if not public.teacher_can_view_student(target_student) then
    raise exception 'Cet élève ne fait pas partie de vos classes';
  end if;

  update public.profiles
  set archived_at =
    case when make_archived then now() else null end
  where id = target_student;
end;
$$;

revoke all on function public.set_student_archived(uuid, boolean) from public;
grant execute on function public.set_student_archived(uuid, boolean) to authenticated;


-- Suppression définitive.
-- La suppression de auth.users entraîne la suppression du profil public,
-- puis des données élèves liées par les clés étrangères ON DELETE CASCADE.
create or replace function public.delete_student_permanently(
  target_student uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_teacher() then
    raise exception 'Accès enseignant requis';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = target_student
      and role = 'student'
  ) then
    raise exception 'Élève introuvable';
  end if;

  if not public.teacher_can_view_student(target_student) then
    raise exception 'Cet élève ne fait pas partie de vos classes';
  end if;

  delete from auth.users
  where id = target_student;
end;
$$;

revoke all on function public.delete_student_permanently(uuid) from public;
grant execute on function public.delete_student_permanently(uuid) to authenticated;


-- Retirer un élève d'une classe sans supprimer son compte.
create or replace function public.remove_student_from_class(
  target_student uuid,
  target_class uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_teacher() then
    raise exception 'Accès enseignant requis';
  end if;

  if not exists (
    select 1
    from public.classes
    where id = target_class
      and teacher_id = auth.uid()
  ) then
    raise exception 'Classe non autorisée';
  end if;

  delete from public.class_members
  where class_id = target_class
    and student_id = target_student;
end;
$$;

revoke all on function public.remove_student_from_class(uuid, uuid) from public;
grant execute on function public.remove_student_from_class(uuid, uuid) to authenticated;

select 'FigaroMN : gestion élèves activée' as resultat;
