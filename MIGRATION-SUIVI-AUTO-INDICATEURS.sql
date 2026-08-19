-- ============================================================
-- FIGAROMN - SUIVI AUTOMATIQUE EXERCICES / INDICATEURS / COMPETENCES
-- Version Cycle Bac Pro v2
--
-- IMPORTANT :
-- - les anciennes tables restent en place ;
-- - les noms techniques "period" sont conservés pour compatibilité,
--   mais l'interface affiche désormais "Séquence" ;
-- - ce script ajoute le suivi détaillé, sans effacer les résultats existants.
-- ============================================================

begin;

create table if not exists public.competency_indicator_catalog (
  competency_code text not null references public.competencies(code) on delete cascade,
  indicator_index integer not null check (indicator_index >= 1),
  label text not null,
  is_required boolean not null default true,
  primary key (competency_code, indicator_index)
);

create table if not exists public.activity_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  activity_type text not null default 'exercise' check (activity_type in ('exercise','evaluation')),
  attempt_no integer not null default 1 check (attempt_no >= 1),
  score numeric not null default 0,
  total numeric not null check (total > 0),
  percent numeric(5,1) not null check (percent >= 0 and percent <= 100),
  details jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now()
);

create table if not exists public.indicator_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.activity_attempts(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  competency_code text not null references public.competencies(code) on delete cascade,
  indicator_index integer not null check (indicator_index >= 1),
  indicator_label text not null,
  correct_count integer not null default 0 check (correct_count >= 0),
  question_count integer not null default 1 check (question_count > 0),
  percent numeric(5,1) not null check (percent >= 0 and percent <= 100),
  completed_at timestamptz not null default now()
);

create table if not exists public.competency_auto_status (
  student_id uuid not null references public.profiles(id) on delete cascade,
  competency_code text not null references public.competencies(code) on delete cascade,
  percent numeric(5,1),
  acquisition_level integer not null default 0 check (acquisition_level between 0 and 4),
  acquisition_label text not null default 'À positionner',
  indicators_positioned integer not null default 0,
  indicators_required integer not null default 0,
  is_complete boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (student_id, competency_code)
);

alter table public.competency_indicator_catalog enable row level security;
alter table public.activity_attempts enable row level security;
alter table public.indicator_results enable row level security;
alter table public.competency_auto_status enable row level security;

create index if not exists idx_activity_attempts_student
  on public.activity_attempts(student_id, completed_at desc);
create index if not exists idx_activity_attempts_session
  on public.activity_attempts(session_id);
create index if not exists idx_indicator_results_student_comp
  on public.indicator_results(student_id, competency_code);
create index if not exists idx_indicator_results_attempt
  on public.indicator_results(attempt_id);
create index if not exists idx_auto_status_student
  on public.competency_auto_status(student_id);

-- Catalogue des indicateurs déjà présents dans les pages Bac Pro de la base.
insert into public.competency_indicator_catalog
(competency_code, indicator_index, label, is_required)
values
('C1', 1, 'Les attentes du client sont clairement identifiées.', true),
('C1', 2, 'Les données d’identification relevées sont adaptées à l’intervention.', true),
('C1', 3, 'Les données techniques collectées sont adaptées à l’intervention.', true),
('C1', 4, 'Les espaces, le matériel et leur disponibilité sont identifiés.', true),
('C1', 5, 'Le planning des activités est établi.', true),
('C2', 1, 'Les différents moyens et supports de communication de l’entreprise sont utilisés correctement.', true),
('C2', 2, 'Le document complété est exploitable.', true),
('C2', 3, 'Le compte rendu est fidèle, précis et complet et peut être interprété et exploité.', true),
('C3', 1, 'Toutes les commandes sont identifiées.', true),
('C3', 2, 'Les conditions d’utilisation sont respectées.', true),
('C3', 3, 'Les procédures d’utilisation de l’embarcation ou de l’équipement sont expliquées oralement.', true),
('C3', 4, 'L’utilisateur est sensibilisé aux risques liés à l’utilisation.', true),
('C3', 5, 'L’utilisateur connaît les différentes fonctionnalités de l’embarcation ou de l’équipement.', true),
('C4', 1, 'Le planning des activités est établi en cohérence avec les interventions.', true),
('C4', 2, 'Les disponibilités des pièces, outillages spécifiques et consommables sont prises en compte.', true),
('C4', 3, 'Le temps d’immobilisation et d’utilisation des moyens est cohérent avec les opérations à réaliser.', true),
('C5', 1, 'L’état du système est identifié.', true),
('C5', 2, 'Les indices sont identifiés et listés avec un minimum d’intervention sur le système.', true),
('C5', 3, 'Les essais sont réalisés en respectant les règles du constructeur et les conditions d’hygiène et de sécurité du travail.', true),
('C5', 4, 'L’intégrité de l’embarcation et de ses équipements est assurée.', true),
('C6', 1, 'Les hypothèses émises sont pertinentes et en relation avec le dysfonctionnement constaté.', true),
('C6', 2, 'Les règles de sécurité sont respectées.', true),
('C6', 3, 'La logique d’utilisation des outils d’aide au diagnostic est maîtrisée.', true),
('C6', 4, 'La hiérarchisation des résultats est pertinente.', true),
('C6', 5, 'La synthèse met en évidence une démarche de diagnostic pertinente et logique.', true),
('C7', 1, 'Le choix des valeurs collectées est pertinent au regard du processus de diagnostic.', true),
('C7', 2, 'Le protocole de mesure respecte les règles de sécurité.', true),
('C7', 3, 'Les choix du matériel de mesure et des grandeurs relevées sont judicieux.', true),
('C7', 4, 'L’utilisation des outils d’aide au diagnostic est maîtrisée.', true),
('C7', 5, 'Les résultats, relevés ou observations sont correctement interprétés.', true),
('C7', 6, 'La réflexion et le discernement permettent d’expliquer la cause première de la défaillance.', true),
('C7', 7, 'L’intégrité de l’embarcation et de ses équipements est assurée.', true),
('C8', 1, 'Les éléments défectueux sont identifiés à partir des hypothèses.', true),
('C8', 2, 'La nature de l’intervention est identifiée.', true),
('C8', 3, 'Les conséquences sur les autres éléments et sur la maintenance sont identifiées.', true),
('C9', 1, 'L’ensemble des documents et des ressources nécessaires est identifié, recueilli et exploité.', true),
('C9', 2, 'Les différentes étapes sont ordonnées et énoncées.', true),
('C9', 3, 'Les règles QHSE et le tri des déchets sont respectés.', true),
('C9', 4, 'L’intégrité de l’embarcation et de ses équipements est assurée.', true),
('C9', 5, 'Les consignes de sécurité sont appliquées.', true),
('C10', 1, 'Les sous-ensembles ou éléments de l’embarcation sont remis en conformité.', true),
('C10', 2, 'Le barème de temps de réalisation des opérations est respecté.', true),
('C10', 3, 'Les réglages et paramétrages sont conformes aux données constructeur.', true),
('C10', 4, 'Les essais appropriés à l’intervention sont réalisés.', true),
('C10', 5, 'Les indicateurs de maintenance sont réinitialisés.', true),
('C10', 6, 'Tous les documents de suivi sont intégralement renseignés.', true),
('C11', 1, 'Les opérations choisies respectent les préconisations du constructeur.', true),
('C11', 2, 'L’embarcation ou l’équipement est remis en conformité.', true),
('C11', 3, 'Le barème de temps de réalisation des opérations est respecté.', true),
('C11', 4, 'Les essais appropriés à l’intervention sont réalisés.', true),
('C11', 5, 'Les indicateurs de maintenance sont réinitialisés.', true),
('C11', 6, 'Tous les documents de suivi sont intégralement renseignés.', true),
('C12', 1, 'Les opérations réalisées respectent le travail demandé dans le contrat d’intervention.', true),
('C12', 2, 'La qualité de l’intervention est autocontrôlée à chaque étape.', true),
('C12', 3, 'Les essais appropriés à l’intervention sont réalisés.', true),
('C12', 4, 'Tous les documents de suivi sont intégralement renseignés.', true)
on conflict (competency_code, indicator_index)
do update set label=excluded.label, is_required=excluded.is_required;

-- Recalcul serveur après chaque résultat d'indicateur.
create or replace function public.refresh_auto_competency_status(
  target_student uuid,
  target_competency text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  required_count integer := 0;
  positioned_count integer := 0;
  avg_percent numeric := null;
  final_level integer := 0;
  final_label text := 'À positionner';
  complete boolean := false;
begin
  select count(*)
  into required_count
  from public.competency_indicator_catalog c
  where c.competency_code = target_competency
    and c.is_required = true;

  with per_indicator as (
    select
      ir.indicator_index,
      (sum(ir.correct_count)::numeric / nullif(sum(ir.question_count),0)) * 100 as pct
    from public.indicator_results ir
    where ir.student_id = target_student
      and ir.competency_code = target_competency
    group by ir.indicator_index
  )
  select count(*), avg(pct)
  into positioned_count, avg_percent
  from per_indicator;

  complete := required_count > 0 and positioned_count >= required_count;

  if complete then
    if avg_percent >= 85 then
      final_level := 4; final_label := 'Maîtrisé';
    elsif avg_percent >= 70 then
      final_level := 3; final_label := 'Acquis';
    elsif avg_percent >= 50 then
      final_level := 2; final_label := 'En cours d''acquisition';
    else
      final_level := 1; final_label := 'Non acquis';
    end if;
  else
    final_level := 0;
    final_label := 'À positionner';
  end if;

  insert into public.competency_auto_status(
    student_id, competency_code, percent, acquisition_level, acquisition_label,
    indicators_positioned, indicators_required, is_complete, updated_at
  )
  values(
    target_student, target_competency,
    case when positioned_count > 0 then round(avg_percent,1) else null end,
    final_level, final_label, positioned_count, required_count, complete, now()
  )
  on conflict (student_id, competency_code)
  do update set
    percent = excluded.percent,
    acquisition_level = excluded.acquisition_level,
    acquisition_label = excluded.acquisition_label,
    indicators_positioned = excluded.indicators_positioned,
    indicators_required = excluded.indicators_required,
    is_complete = excluded.is_complete,
    updated_at = now();
end;
$$;

create or replace function public.trg_refresh_auto_competency_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_auto_competency_status(new.student_id, new.competency_code);
  return new;
end;
$$;

drop trigger if exists trg_indicator_refresh_auto_status on public.indicator_results;
create trigger trg_indicator_refresh_auto_status
after insert or update on public.indicator_results
for each row execute function public.trg_refresh_auto_competency_status();

-- Policies idempotentes
do $$
declare r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname='public'
      and tablename in (
        'competency_indicator_catalog','activity_attempts',
        'indicator_results','competency_auto_status'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy indicator_catalog_read
on public.competency_indicator_catalog
for select to authenticated
using (true);

create policy indicator_catalog_teacher_manage
on public.competency_indicator_catalog
for all to authenticated
using (public.is_teacher())
with check (public.is_teacher());

create policy attempts_student_read
on public.activity_attempts
for select to authenticated
using (student_id = auth.uid());

create policy attempts_student_insert
on public.activity_attempts
for insert to authenticated
with check (student_id = auth.uid());

create policy attempts_teacher_read
on public.activity_attempts
for select to authenticated
using (public.teacher_can_view_student(student_id));

create policy indicators_student_read
on public.indicator_results
for select to authenticated
using (student_id = auth.uid());

create policy indicators_student_insert
on public.indicator_results
for insert to authenticated
with check (student_id = auth.uid());

create policy indicators_teacher_read
on public.indicator_results
for select to authenticated
using (public.teacher_can_view_student(student_id));

create policy auto_status_student_read
on public.competency_auto_status
for select to authenticated
using (student_id = auth.uid());

create policy auto_status_teacher_read
on public.competency_auto_status
for select to authenticated
using (public.teacher_can_view_student(student_id));

grant select on public.competency_indicator_catalog to authenticated;
grant select, insert on public.activity_attempts to authenticated;
grant select, insert on public.indicator_results to authenticated;
grant select on public.competency_auto_status to authenticated;

-- Permet à l'enseignant de créer et gérer ses classes depuis le tableau de bord.
grant select, insert, update, delete on public.classes to authenticated;

revoke all on function public.refresh_auto_competency_status(uuid,text) from public;
revoke all on function public.refresh_auto_competency_status(uuid,text) from authenticated;
revoke all on function public.trg_refresh_auto_competency_status() from public;
revoke all on function public.trg_refresh_auto_competency_status() from authenticated;

commit;

select 'FigaroMN : suivi automatique indicateurs / compétences activé' as resultat;
