-- =====================================================================
-- FIGAROMN V23.3 - SUPPRESSION DEFINITIVE D'UN ELEVE
-- A executer UNE FOIS dans Supabase > SQL Editor.
--
-- But :
-- - permettre au professeur connecté de supprimer définitivement
--   un élève autorisé depuis l'espace professeur FigaroMN ;
-- - supprimer le compte Auth et les données pédagogiques liées.
-- =====================================================================

begin;

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

  -- Supprime d'abord le profil public.
  -- Les données pédagogiques qui référencent profiles(id)
  -- sont supprimées par les clés étrangères ON DELETE CASCADE.
  delete from public.profiles
  where id = target_student
    and role = 'student';

  -- Supprime ensuite le compte d'authentification.
  delete from auth.users
  where id = target_student;
end;
$$;

revoke all on function public.delete_student_permanently(uuid) from public;
grant execute on function public.delete_student_permanently(uuid) to authenticated;

commit;

select 'FigaroMN V23.3 : suppression définitive élève activée' as resultat;
