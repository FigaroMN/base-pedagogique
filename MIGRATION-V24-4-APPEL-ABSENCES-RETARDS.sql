-- =====================================================================
-- FIGAROMN V24.4
-- APPEL MANUEL · ABSENCES · RETARDS · HISTORIQUE CALENDRIER
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
--
-- Cette migration NE SUPPRIME AUCUN ÉLÈVE et NE MODIFIE AUCUNE NOTE.
-- =====================================================================

begin;

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  class_id uuid not null,
  student_id uuid not null,
  student_name text not null default '',
  class_name text not null default '',
  student_level text,
  attendance_date date not null,
  period_label text not null default 'Journée',
  status text not null default 'present',
  late_minutes integer not null default 0,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint attendance_records_status_check
    check (status in ('present','absent','late')),

  constraint attendance_records_late_minutes_check
    check (late_minutes between 0 and 600),

  constraint attendance_records_level_check
    check (
      student_level is null
      or student_level in ('cap','seconde','premiere','terminale')
    ),

  constraint attendance_records_unique_call
    unique (teacher_id, class_id, student_id, attendance_date, period_label)
);

create index if not exists attendance_records_teacher_date_idx
  on public.attendance_records (teacher_id, attendance_date);

create index if not exists attendance_records_class_date_idx
  on public.attendance_records (class_id, attendance_date);

create index if not exists attendance_records_student_date_idx
  on public.attendance_records (student_id, attendance_date);


-- ---------------------------------------------------------------------
-- Mise à jour automatique de updated_at
-- ---------------------------------------------------------------------

create or replace function public.set_attendance_updated_at_v244()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_attendance_updated_at_v244
on public.attendance_records;

create trigger trg_attendance_updated_at_v244
before update
on public.attendance_records
for each row
execute function public.set_attendance_updated_at_v244();


-- ---------------------------------------------------------------------
-- Vérification qu'un enseignant ne peut enregistrer l'appel que pour
-- une de ses classes et un élève réellement rattaché à cette classe.
-- ---------------------------------------------------------------------

create or replace function public.validate_attendance_record_v244()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_name text;
  v_class_level text;
  v_student_name text;
  v_student_level text;
begin
  if new.teacher_id is null or new.class_id is null or new.student_id is null then
    raise exception 'Enseignant, classe et élève requis';
  end if;

  select c.name, c.level
    into v_class_name, v_class_level
  from public.classes c
  where c.id = new.class_id
    and c.teacher_id = new.teacher_id;

  if not found then
    raise exception 'Classe introuvable ou non autorisée pour cet enseignant';
  end if;

  if not exists (
    select 1
    from public.class_members cm
    where cm.class_id = new.class_id
      and cm.student_id = new.student_id
  ) then
    raise exception 'Cet élève n''est pas rattaché à cette classe';
  end if;

  select
    coalesce(nullif(btrim(p.full_name),''), p.email, p.id::text),
    p.level
    into v_student_name, v_student_level
  from public.profiles p
  where p.id = new.student_id
    and p.role = 'student'
    and p.archived_at is null;

  if not found then
    raise exception 'Élève introuvable ou archivé';
  end if;

  if v_student_level is distinct from v_class_level then
    raise exception
      'Niveau élève (%) différent du niveau classe (%)',
      coalesce(v_student_level,'non renseigné'),
      coalesce(v_class_level,'non renseigné');
  end if;

  -- Les libellés sont mémorisés comme instantané afin que l'historique
  -- reste lisible même si un nom de classe est modifié plus tard.
  new.student_name := v_student_name;
  new.class_name := v_class_name;
  new.student_level := v_student_level;

  if new.status <> 'late' then
    new.late_minutes := 0;
  end if;

  new.period_label := coalesce(nullif(btrim(new.period_label),''),'Journée');
  new.note := coalesce(new.note,'');

  return new;
end;
$$;

drop trigger if exists trg_validate_attendance_record_v244
on public.attendance_records;

create trigger trg_validate_attendance_record_v244
before insert or update
on public.attendance_records
for each row
execute function public.validate_attendance_record_v244();


-- ---------------------------------------------------------------------
-- RLS : seuls les enseignants connectés voient et gèrent leurs appels.
-- ---------------------------------------------------------------------

alter table public.attendance_records enable row level security;

grant select, insert, update, delete
on public.attendance_records
to authenticated;

drop policy if exists attendance_teacher_select_v244
on public.attendance_records;

drop policy if exists attendance_teacher_insert_v244
on public.attendance_records;

drop policy if exists attendance_teacher_update_v244
on public.attendance_records;

drop policy if exists attendance_teacher_delete_v244
on public.attendance_records;

create policy attendance_teacher_select_v244
on public.attendance_records
for select
to authenticated
using (
  teacher_id = auth.uid()
);

create policy attendance_teacher_insert_v244
on public.attendance_records
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.classes c
    where c.id = class_id
      and c.teacher_id = auth.uid()
  )
);

create policy attendance_teacher_update_v244
on public.attendance_records
for update
to authenticated
using (
  teacher_id = auth.uid()
)
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.classes c
    where c.id = class_id
      and c.teacher_id = auth.uid()
  )
);

create policy attendance_teacher_delete_v244
on public.attendance_records
for delete
to authenticated
using (
  teacher_id = auth.uid()
);

commit;

select
  '✅ FIGAROMN V24.4 : appel manuel, absences, retards et calendrier activés'
  as resultat;
