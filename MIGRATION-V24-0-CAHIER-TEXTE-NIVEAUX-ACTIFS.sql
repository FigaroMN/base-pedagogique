-- =====================================================================
-- FIGAROMN V24.0
-- CAHIER DE TEXTE : NIVEAUX ACTIFS + ELEVES NON RATTACHES
--
-- A exécuter UNE FOIS dans Supabase > SQL Editor.
-- Cette migration complète V23.5.
-- =====================================================================

begin;

-- Les élèves peuvent être encore "Non rattaché" à une classe.
-- Le cahier de texte doit donc pouvoir enregistrer une entrée par niveau
-- même lorsque class_id n'existe pas encore.
alter table public.logbook_entries
  alter column class_id drop not null;

alter table public.logbook_entries
  add column if not exists class_name text;

-- Conserver le nom de classe pour les anciennes entrées.
update public.logbook_entries l
set class_name = c.name
from public.classes c
where l.class_id = c.id
  and (l.class_name is null or btrim(l.class_name) = '');

-- Refaire les policies d'écriture pour accepter :
-- 1) une vraie classe appartenant au professeur ;
-- 2) un groupe "Sans classe" (class_id = null).
drop policy if exists logbook_teacher_insert on public.logbook_entries;
drop policy if exists logbook_teacher_update on public.logbook_entries;

create policy logbook_teacher_insert
on public.logbook_entries
for insert to authenticated
with check (
  teacher_id = auth.uid()
  and public.is_teacher()
  and (
    class_id is null
    or public.teacher_owns_class(class_id)
  )
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
  and (
    class_id is null
    or public.teacher_owns_class(class_id)
  )
);

grant select, insert, update, delete
on public.logbook_entries
to authenticated;

commit;

select 'FigaroMN V24.0 : cahier de texte niveaux actifs activé' as resultat;
