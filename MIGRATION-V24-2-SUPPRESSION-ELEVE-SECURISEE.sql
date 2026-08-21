-- =====================================================================
-- FIGAROMN V24.2 - SUPPRESSION D'UN SEUL ELEVE, AVEC GARDE-FOUS
-- URGENT : à exécuter AVANT d'utiliser à nouveau le bouton Supprimer.
--
-- Ce script :
-- 1) désactive l'ancienne RPC V23.3 ;
-- 2) crée une nouvelle RPC qui exige l'UUID + l'e-mail exacts ;
-- 3) compte les profils élèves avant/après ;
-- 4) annule TOUTE la transaction si plus d'un profil disparaît.
-- =====================================================================

begin;

-- Neutralise l'ancienne fonction afin qu'une ancienne page web ne puisse
-- plus lancer une suppression définitive sans les garde-fous V24.2.
create or replace function public.delete_student_permanently(
  target_student uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Suppression V23.3 désactivée. Utiliser la procédure sécurisée V24.2.';
end;
$$;

revoke all on function public.delete_student_permanently(uuid) from public;
grant execute on function public.delete_student_permanently(uuid) to authenticated;


create or replace function public.delete_student_permanently_v242(
  target_student uuid,
  target_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_before integer;
  v_after_profile integer;
  v_after_auth integer;
  v_deleted_profile integer;
  v_deleted_auth integer;
begin
  if not public.is_teacher() then
    raise exception 'Accès enseignant requis';
  end if;

  if target_student is null then
    raise exception 'Identifiant élève manquant';
  end if;

  select p.email
    into v_email
  from public.profiles p
  where p.id = target_student
    and p.role = 'student';

  if not found then
    raise exception 'Élève introuvable';
  end if;

  if lower(coalesce(trim(v_email),'')) <> lower(coalesce(trim(target_email),'')) then
    raise exception 'Sécurité : e-mail de confirmation différent du profil ciblé';
  end if;

  if not public.teacher_can_view_student(target_student) then
    raise exception 'Cet élève ne fait pas partie de vos classes';
  end if;

  select count(*)
    into v_before
  from public.profiles
  where role = 'student';

  if v_before < 1 then
    raise exception 'Sécurité : aucun profil élève à supprimer';
  end if;

  -- Étape 1 : suppression du SEUL profil ciblé.
  delete from public.profiles
  where id = target_student
    and role = 'student';

  get diagnostics v_deleted_profile = row_count;

  if v_deleted_profile <> 1 then
    raise exception 'Sécurité : % profil(s) ciblé(s) au lieu de 1. Transaction annulée.', v_deleted_profile;
  end if;

  select count(*)
    into v_after_profile
  from public.profiles
  where role = 'student';

  if v_after_profile <> v_before - 1 then
    raise exception
      'ALERTE SECURITE : le nombre de profils élèves est passé de % à % au lieu de %. Transaction annulée.',
      v_before, v_after_profile, v_before - 1;
  end if;

  -- Étape 2 : suppression du compte Auth portant exactement le même UUID.
  delete from auth.users
  where id = target_student;

  get diagnostics v_deleted_auth = row_count;

  if v_deleted_auth > 1 then
    raise exception 'ALERTE SECURITE : % comptes Auth supprimés. Transaction annulée.', v_deleted_auth;
  end if;

  -- Contrôle final : aucun autre profil élève ne doit avoir disparu à la
  -- suite d'un trigger ou d'une cascade inattendue.
  select count(*)
    into v_after_auth
  from public.profiles
  where role = 'student';

  if v_after_auth <> v_before - 1 then
    raise exception
      'ALERTE SECURITE APRES AUTH : le nombre de profils élèves est passé de % à %. Transaction annulée.',
      v_before, v_after_auth;
  end if;

  return jsonb_build_object(
    'ok', true,
    'student_id', target_student,
    'student_email', v_email,
    'students_before', v_before,
    'students_after', v_after_auth,
    'auth_account_deleted', (v_deleted_auth = 1)
  );
end;
$$;

revoke all on function public.delete_student_permanently_v242(uuid, text) from public;
grant execute on function public.delete_student_permanently_v242(uuid, text) to authenticated;

commit;

select 'FigaroMN V24.2 : suppression élève sécurisée activée' as resultat;
