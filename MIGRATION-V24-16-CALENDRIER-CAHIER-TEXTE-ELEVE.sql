-- =====================================================================
-- FIGAROMN V24.16
-- CAHIER DE TEXTE ELEVE : LECTURE DE L'HISTORIQUE DE SA CLASSE
--
-- A exécuter UNE FOIS dans Supabase > SQL Editor.
-- Cette migration NE modifie PAS les données existantes.
-- Elle autorise uniquement un élève authentifié à lire les entrées
-- du cahier de texte de la/les classe(s) auxquelles il est rattaché.
-- =====================================================================

begin;

alter table public.logbook_entries enable row level security;

drop policy if exists logbook_student_select_own_class on public.logbook_entries;

create policy logbook_student_select_own_class
on public.logbook_entries
for select
to authenticated
using (
  class_id is not null
  and public.student_in_class(class_id)
);

grant select on public.logbook_entries to authenticated;
grant execute on function public.student_in_class(uuid) to authenticated;

commit;

select 'FigaroMN V24.16 : calendrier / cahier de texte élève activé' as resultat;
