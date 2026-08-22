-- =====================================================================
-- FIGAROMN V24.8
-- SUPPRESSION SÉCURISÉE D'UNE ABSENCE OU D'UN RETARD
-- À exécuter dans Supabase > SQL Editor.
--
-- Cette migration NE SUPPRIME AUCUN ÉLÈVE.
-- Elle autorise uniquement le professeur connecté à supprimer
-- UNE ligne d'absence ou de retard qui lui appartient.
-- =====================================================================

begin;

-- Droit SQL nécessaire pour DELETE.
grant select, delete
on public.attendance_records
to authenticated;

-- Politique RLS : un enseignant ne peut supprimer que ses propres appels.
drop policy if exists attendance_teacher_delete_v244
on public.attendance_records;

drop policy if exists attendance_teacher_delete_v248
on public.attendance_records;

create policy attendance_teacher_delete_v248
on public.attendance_records
for delete
to authenticated
using (
  teacher_id = auth.uid()
);

-- Fonction serveur à cible unique : elle refuse les lignes "present"
-- et vérifie que l'appel appartient au professeur connecté.
create or replace function public.delete_attendance_record_v248(
  target_record uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.attendance_records%rowtype;
  v_deleted integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;

  if target_record is null then
    raise exception 'Identifiant de l''appel manquant';
  end if;

  select *
    into v_row
  from public.attendance_records ar
  where ar.id = target_record
    and ar.teacher_id = auth.uid()
  for update;

  if not found then
    raise exception 'Appel introuvable ou non autorisé';
  end if;

  if v_row.status not in ('absent','late') then
    raise exception 'Seules une absence ou un retard peuvent être supprimés';
  end if;

  delete from public.attendance_records ar
  where ar.id = target_record
    and ar.teacher_id = auth.uid()
    and ar.status = v_row.status;

  get diagnostics v_deleted = row_count;

  if v_deleted <> 1 then
    raise exception
      'Sécurité : % ligne(s) supprimée(s) au lieu de 1. Transaction annulée.',
      v_deleted;
  end if;

  return jsonb_build_object(
    'ok', true,
    'record_id', target_record,
    'student_id', v_row.student_id,
    'status_deleted', v_row.status,
    'attendance_date', v_row.attendance_date,
    'period_label', v_row.period_label
  );
end;
$$;

revoke all on function public.delete_attendance_record_v248(uuid) from public;
grant execute on function public.delete_attendance_record_v248(uuid) to authenticated;

commit;

select
  '✅ FIGAROMN V24.8 : bouton Supprimer absence / retard activé'
  as resultat;
