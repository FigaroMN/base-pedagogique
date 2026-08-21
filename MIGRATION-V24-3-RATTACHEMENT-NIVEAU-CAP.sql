-- =====================================================================
-- FIGAROMN V24.3
-- RATTACHEMENT ELEVE / CLASSE PAR NIVEAU + CAP
-- A exécuter UNE FOIS dans Supabase > SQL Editor.
--
-- Objectifs :
-- 1) empêcher tout rattachement CAP -> Bac Pro ou Bac Pro -> mauvais niveau ;
-- 2) autoriser le rattachement via une fonction serveur sécurisée ;
-- 3) conserver le niveau du profil élève (il n'est plus modifié par la classe) ;
-- 4) retirer automatiquement, lors d'un nouveau rattachement, les anciens
--    rattachements du même enseignant qui ne correspondent plus au niveau.
--
-- Cette migration NE SUPPRIME AUCUN COMPTE ELEVE.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Garde-fou base de données : le niveau de l'élève doit correspondre
--    au niveau de la classe, même si une ancienne page web est encore
--    présente dans le cache du navigateur.
-- ---------------------------------------------------------------------

create or replace function public.enforce_class_member_level_v243()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_level text;
  v_class_level text;
begin
  select p.level
    into v_student_level
  from public.profiles p
  where p.id = new.student_id
    and p.role = 'student'
    and p.archived_at is null;

  if not found then
    raise exception 'Élève introuvable ou archivé';
  end if;

  select c.level
    into v_class_level
  from public.classes c
  where c.id = new.class_id;

  if not found then
    raise exception 'Classe introuvable';
  end if;

  if v_student_level is null then
    raise exception 'Le niveau de l''élève n''est pas renseigné';
  end if;

  if v_class_level is null then
    raise exception 'Le niveau de la classe n''est pas renseigné';
  end if;

  if v_student_level <> v_class_level then
    raise exception
      'Rattachement refusé : niveau élève (%) différent du niveau classe (%)',
      v_student_level, v_class_level;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_class_member_level_v243
on public.class_members;

create trigger trg_class_member_level_v243
before insert or update
on public.class_members
for each row
execute function public.enforce_class_member_level_v243();


-- ---------------------------------------------------------------------
-- 2. Fonction utilisée par l'espace enseignant V24.3.
-- ---------------------------------------------------------------------

create or replace function public.assign_student_to_class_v243(
  target_student uuid,
  target_class uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_level text;
  v_student_name text;
  v_class_level text;
  v_class_name text;
  v_removed integer := 0;
begin
  if not public.is_teacher() then
    raise exception 'Accès enseignant requis';
  end if;

  if target_student is null or target_class is null then
    raise exception 'Élève et classe requis';
  end if;

  select p.level, coalesce(nullif(btrim(p.full_name),''), p.email, p.id::text)
    into v_student_level, v_student_name
  from public.profiles p
  where p.id = target_student
    and p.role = 'student'
    and p.archived_at is null;

  if not found then
    raise exception 'Élève introuvable ou archivé';
  end if;

  select c.level, c.name
    into v_class_level, v_class_name
  from public.classes c
  where c.id = target_class
    and c.teacher_id = auth.uid();

  if not found then
    raise exception 'Classe introuvable ou non autorisée';
  end if;

  if v_student_level is null then
    raise exception 'Le niveau de l''élève n''est pas renseigné';
  end if;

  if v_student_level <> v_class_level then
    raise exception
      'Rattachement refusé : % est en %, la classe % est en %',
      v_student_name, v_student_level, v_class_name, v_class_level;
  end if;

  -- Nettoyage uniquement des rattachements incohérents de CE même élève,
  -- dans les classes appartenant au professeur connecté.
  delete from public.class_members cm
  using public.classes old_c
  where cm.class_id = old_c.id
    and cm.student_id = target_student
    and old_c.teacher_id = auth.uid()
    and old_c.level is distinct from v_student_level;

  get diagnostics v_removed = row_count;

  insert into public.class_members(class_id, student_id)
  values (target_class, target_student)
  on conflict do nothing;

  return jsonb_build_object(
    'ok', true,
    'student_id', target_student,
    'student_level', v_student_level,
    'class_id', target_class,
    'class_name', v_class_name,
    'class_level', v_class_level,
    'old_mismatched_memberships_removed', v_removed
  );
end;
$$;

revoke all on function public.assign_student_to_class_v243(uuid, uuid) from public;
grant execute on function public.assign_student_to_class_v243(uuid, uuid) to authenticated;

-- Lecture nécessaire pour l'affichage enseignant.
grant select on public.class_members to authenticated;

commit;

select '✅ FIGAROMN V24.3 : rattachement CAP / classes par niveau sécurisé' as resultat;
