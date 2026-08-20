-- ============================================================
-- FIGAROMN V21.2 - MIGRATION CORRIGEE
-- ROUTE DU RHUM + 7 SEQUENCES BAC PRO
--
-- CORRECTION :
-- La contrainte sessions_period_check autorisait seulement 1..6.
-- Cette migration l'élargit d'abord à 1..7, puis décale les
-- anciennes séquences de 1..6 vers 2..7.
--
-- IMPORTANT :
-- - Les UUID des sessions existantes ne changent pas.
-- - Les progressions et tentatives liées aux UUID sont conservées.
-- - La migration est protégée contre une double exécution.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. ELARGIR LA CONTRAINTE DE PERIODE A 1..7
-- ------------------------------------------------------------

alter table public.sessions
  drop constraint if exists sessions_period_check;

alter table public.sessions
  add constraint sessions_period_check
  check (period between 1 and 7);

-- ------------------------------------------------------------
-- 2. DECALAGE + AJOUT ROUTE DU RHUM
-- ------------------------------------------------------------

do $$
declare
  route_markers integer;
  period7_count integer;
begin

  -- Détection sûre d'une installation V21 déjà réalisée.
  select count(*)
  into route_markers
  from public.sessions
  where period = 1
    and session_no = 1
    and (
      (level = 'seconde'
       and title = 'Découvrir la Route du Rhum 2026')
      or
      (level = 'premiere'
       and title = 'Route du Rhum : contexte technique et contraintes d’exploitation')
      or
      (level = 'terminale'
       and title = 'Prise en charge experte d’un voilier de course')
    );

  if route_markers = 3 then
    raise notice 'FigaroMN V21 déjà installée : aucun nouveau décalage effectué.';

  elsif route_markers between 1 and 2 then
    raise exception
      'Migration arrêtée : installation V21 partielle détectée (% marqueur(s) sur 3). Ne pas poursuivre sans contrôle.',
      route_markers;

  else

    -- --------------------------------------------------------
    -- 3. VERIFIER QUE LA PERIODE 7 EST LIBRE
    -- --------------------------------------------------------
    select count(*)
    into period7_count
    from public.sessions
    where level in ('seconde','premiere','terminale')
      and period = 7;

    if period7_count > 0 then
      raise exception
        'Migration arrêtée : % session(s) existent déjà en période 7. Vérifier la base avant de continuer.',
        period7_count;
    end if;

    -- --------------------------------------------------------
    -- 4. DECALER LES ANCIENNES SEQUENCES
    -- Ordre descendant pour éviter les collisions.
    -- UUID inchangés.
    -- --------------------------------------------------------

    update public.sessions
    set period = 7
    where level in ('seconde','premiere','terminale')
      and period = 6;

    update public.sessions
    set period = 6
    where level in ('seconde','premiere','terminale')
      and period = 5;

    update public.sessions
    set period = 5
    where level in ('seconde','premiere','terminale')
      and period = 4;

    update public.sessions
    set period = 4
    where level in ('seconde','premiere','terminale')
      and period = 3;

    update public.sessions
    set period = 3
    where level in ('seconde','premiere','terminale')
      and period = 2;

    update public.sessions
    set period = 2
    where level in ('seconde','premiere','terminale')
      and period = 1;

    -- --------------------------------------------------------
    -- 5. AJOUTER LA NOUVELLE SEQUENCE 1 : ROUTE DU RHUM
    -- --------------------------------------------------------

    -- SECONDE
    insert into public.sessions
      (level, period, session_no, title, session_type, is_published)
    values
      ('seconde',1,1,'Découvrir la Route du Rhum 2026','Cours + activité',true),
      ('seconde',1,2,'Identifier les bateaux et les équipements visibles','Cours + observation',true),
      ('seconde',1,3,'Collecter les informations d’une embarcation','Étude de dossier',true),
      ('seconde',1,4,'Présenter une embarcation à un visiteur','Communication',true),
      ('seconde',1,5,'Préparer une prise en charge simple','Activité guidée',true),
      ('seconde',1,6,'Bilan professionnel Route du Rhum','Synthèse + évaluation formative',true);

    -- PREMIERE
    insert into public.sessions
      (level, period, session_no, title, session_type, is_published)
    values
      ('premiere',1,1,'Route du Rhum : contexte technique et contraintes d’exploitation','Cours + analyse',true),
      ('premiere',1,2,'Exploiter un dossier bateau et ses documents techniques','Étude de dossier',true),
      ('premiere',1,3,'Préparer des contrôles sur les systèmes embarqués','Préparation d’intervention',true),
      ('premiere',1,4,'Constater un dysfonctionnement en contexte course','Étude de cas',true),
      ('premiere',1,5,'Rédiger et présenter un compte rendu technique','Communication FR/EN',true),
      ('premiere',1,6,'Organiser l’intervention avant restitution','Synthèse professionnelle',true);

    -- TERMINALE
    insert into public.sessions
      (level, period, session_no, title, session_type, is_published)
    values
      ('terminale',1,1,'Prise en charge experte d’un voilier de course','Étude professionnelle',true),
      ('terminale',1,2,'Analyser le dossier technique et planifier l’intervention','Organisation',true),
      ('terminale',1,3,'Construire les hypothèses de diagnostic','Diagnostic',true),
      ('terminale',1,4,'Valider les hypothèses par des contrôles ciblés','Diagnostic + mesures',true),
      ('terminale',1,5,'Préparer la remise en conformité et les essais','Préparation + intervention',true),
      ('terminale',1,6,'Restituer l’embarcation et rendre compte','Synthèse professionnelle',true);

    raise notice 'FigaroMN V21.2 : 7 séquences installées et Route du Rhum ajoutée.';
  end if;
end $$;

commit;

-- ============================================================
-- CONTROLES AUTOMATIQUES APRES MIGRATION
-- ============================================================

-- 42 séances attendues par niveau.
select
  level,
  count(*) as nombre_sessions,
  min(period) as sequence_min,
  max(period) as sequence_max
from public.sessions
where level in ('seconde','premiere','terminale')
group by level
order by level;

-- 6 séances attendues pour chacune des 7 séquences.
select
  level,
  period,
  count(*) as nombre_seances
from public.sessions
where level in ('seconde','premiere','terminale')
group by level, period
order by level, period;

-- Vérification de la contrainte installée.
select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.sessions'::regclass
  and conname = 'sessions_period_check';

-- Vue détaillée.
select
  level,
  period,
  session_no,
  title
from public.sessions
where level in ('seconde','premiere','terminale')
order by level, period, session_no;

select 'FigaroMN V21.2 : migration terminée' as resultat;
