-- ============================================================
-- FIGAROMN V11 - BAC PRO : ACQUISITION AUTOMATIQUE PAR INDICATEURS
-- À exécuter UNE SEULE FOIS dans Supabase > SQL Editor.
-- Source critères : Référentiel Bac Pro Maintenance Nautique,
-- pages 24 à 35.
-- ============================================================

begin;

create table if not exists public.competency_indicator_catalog (
  competency_code text not null references public.competencies(code) on delete cascade,
  indicator_index integer not null check (indicator_index >= 1),
  label text not null,
  is_required boolean not null default true,
  primary key (competency_code, indicator_index)
);

create index if not exists idx_activity_attempts_engine
  on public.activity_attempts ((details->>'engine'));

insert into public.competency_indicator_catalog
(competency_code, indicator_index, label, is_required)
values
('C1', 1, 'Les attentes du client sont clairement identifiées.', true),
('C1', 2, 'Les données d’identification relevées sont adaptées à l’intervention (numéro de série, nombres d’heures…).', true),
('C1', 3, 'Les données techniques (configuration et paramètres du système) collectées sont adaptées à l’intervention.', true),
('C1', 4, 'Les espaces, le matériel et leur disponibilité sont identifiés.', true),
('C1', 5, 'Le planning des activités est établi.', true),
('C2', 1, 'Les différents moyens et supports de communication de l’entreprise sont utilisés correctement.', true),
('C2', 2, 'Le document complété est exploitable.', true),
('C2', 3, 'L’utilisateur peut retranscrire les procédures de contrôle, les consignes de démarrage et d’utilisation de l’embarcation ou de l’équipement.', true),
('C2', 4, 'Le compte rendu est fidèle précis et complet, l’interlocuteur, client ou service de l’entreprise, peut l’interpréter et l’exploiter.', true),
('C3', 1, 'Toutes les commandes sont identifiées.', true),
('C3', 2, 'Les conditions d’utilisation sont respectées.', true),
('C3', 3, 'Les procédures d’utilisation de l’embarcation ou de l’équipement sont expliquées oralement.', true),
('C3', 4, 'L’utilisateur est sensibilisé aux risques liés à l’utilisation de l’embarcation ou de l’équipement et connait les moyens de protection.', true),
('C3', 5, 'L’utilisateur connait les différentes fonctionnalités de l’embarcation ou de l’équipement.', true),
('C4', 1, 'Le planning des activités est établi en cohérence avec les interventions.', true),
('C4', 2, 'Les disponibilités des pièces détachées neuves ou d’occasion, outillages spécifiques, consommables sont pris en compte.', true),
('C4', 3, 'Le temps d’immobilisation et d’utilisation des moyens est cohérent avec les opérations à réaliser.', true),
('C5', 1, 'L’état du système est identifié.', true),
('C5', 2, 'Les indices sont identifiés et listés avec un minimum d’intervention sur le système.', true),
('C5', 3, 'Les essais ont été réalisés en respectant les règles du constructeur et les conditions d’hygiènes et sécurité du travail.', true),
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
('C7', 5, 'Les résultats, les relevés obtenus ou les observations sont correctement interprétés.', true),
('C7', 6, 'La réflexion, le discernement permettent d’expliquer la cause première de la défaillance.', true),
('C7', 7, 'L’intégrité de l’embarcation et de ses équipements est assurée.', true),
('C8', 1, 'Les éléments défectueux sont identifiés à partir des hypothèses.', true),
('C8', 2, 'La nature de l’intervention (changement de pièces, sous-ensemble, réglages, paramétrage etc.) est identifiée.', true),
('C8', 3, 'Les conséquences sur les autres éléments et sur la maintenance sont identifiées.', true),
('C9', 1, 'L’ensemble des documents et des ressources nécessaires est identifié, recueilli et exploité.', true),
('C9', 2, 'Les différentes étapes sont ordonnées et énoncées.', true),
('C9', 3, 'Les règles QHSE et tri des déchets sont respectés.', true),
('C9', 4, 'L’intégrité de l’embarcation et de ses équipements est assurée.', true),
('C9', 5, 'Les consignes de sécurité sont appliquées.', true),
('C10', 1, 'Les sous-ensembles ou éléments de l''embarcation sont remis en conformité.', true),
('C10', 2, 'Le barème de temps de réalisation des opérations est respecté.', true),
('C10', 3, 'Les réglages et les paramétrages sont conformes aux données constructeur.', true),
('C10', 4, 'Les essais appropriés à l’intervention sont réalisés.', true),
('C10', 5, 'Les indicateurs de maintenance sont réinitialisés.', true),
('C10', 6, 'Tous les documents de suivi sont intégralement renseignés.', true),
('C11', 1, 'Les opérations choisies respectent les préconisations du constructeur.', true),
('C11', 2, 'L''embarcation ou l’équipement est remis en conformité.', true),
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

-- Recalcul : uniquement les tentatives du nouveau moteur V11.
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
    join public.activity_attempts aa on aa.id = ir.attempt_id
    where ir.student_id = target_student
      and ir.competency_code = target_competency
      and coalesce(aa.details->>'engine','') = 'bacpro_auto_v11'
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
    percent=excluded.percent,
    acquisition_level=excluded.acquisition_level,
    acquisition_label=excluded.acquisition_label,
    indicators_positioned=excluded.indicators_positioned,
    indicators_required=excluded.indicators_required,
    is_complete=excluded.is_complete,
    updated_at=now();
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

-- Remise à zéro uniquement du résultat DÉRIVÉ des élèves Bac Pro.
-- Les tentatives, notes, réponses et historiques existants ne sont pas supprimés.
update public.competency_auto_status s
set percent=null,
    acquisition_level=0,
    acquisition_label='À positionner',
    indicators_positioned=0,
    indicators_required=(select count(*) from public.competency_indicator_catalog c where c.competency_code=s.competency_code and c.is_required),
    is_complete=false,
    updated_at=now()
where exists (
  select 1 from public.profiles p
  where p.id=s.student_id
    and p.level in ('seconde','premiere','terminale')
);

commit;

select 'FigaroMN V11 : moteur Bac Pro automatique indicateurs -> compétences activé' as resultat;
