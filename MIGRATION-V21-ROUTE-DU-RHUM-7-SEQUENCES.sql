-- ============================================================
-- FIGAROMN V21 - ROUTE DU RHUM + 7 SEQUENCES BAC PRO
-- A EXECUTER UNE SEULE FOIS DANS SUPABASE > SQL EDITOR
--
-- Objectif :
-- 1. Décaler les anciennes séquences 1..6 vers 2..7.
-- 2. CONSERVER les mêmes UUID de sessions : le travail déjà enregistré
--    dans session_progress, activity_attempts, evaluation_results, etc.
--    reste lié aux mêmes sessions.
-- 3. Ajouter la nouvelle Séquence 1 Route du Rhum (6 séances)
--    pour Seconde, Première et Terminale.
--
-- Le bloc est idempotent : si la séquence Route du Rhum existe déjà
-- en période 1, il ne redécale pas les données.
-- ============================================================

begin;

do $$
declare
  already_v21 boolean;
begin
  select exists(
    select 1
    from public.sessions
    where level='seconde'
      and period=1
      and session_no=1
      and lower(title) like '%route du rhum%'
  ) into already_v21;

  if not already_v21 then
    -- Décalage temporaire hors plage pour éviter les collisions
    -- avec une éventuelle contrainte unique (level, period, session_no).
    update public.sessions
    set period = period + 100
    where level in ('seconde','premiere','terminale')
      and period between 1 and 6;

    -- 1..6 deviennent 2..7, sans changer les UUID.
    update public.sessions
    set period = period - 99
    where level in ('seconde','premiere','terminale')
      and period between 101 and 106;

    -- Nouvelle Séquence 1 : Seconde
    insert into public.sessions(level,period,session_no,title,session_type,is_published)
    values
    ('seconde',1,1,'Découvrir la Route du Rhum 2026','Cours + activité',true),
    ('seconde',1,2,'Identifier les bateaux et les équipements visibles','Cours + observation',true),
    ('seconde',1,3,'Collecter les informations d’une embarcation','Étude de dossier',true),
    ('seconde',1,4,'Présenter une embarcation à un visiteur','Communication',true),
    ('seconde',1,5,'Préparer une prise en charge simple','Activité guidée',true),
    ('seconde',1,6,'Bilan professionnel Route du Rhum','Synthèse + évaluation formative',true);

    -- Nouvelle Séquence 1 : Première
    insert into public.sessions(level,period,session_no,title,session_type,is_published)
    values
    ('premiere',1,1,'Route du Rhum : contexte technique et contraintes d’exploitation','Cours + analyse',true),
    ('premiere',1,2,'Exploiter un dossier bateau et ses documents techniques','Étude de dossier',true),
    ('premiere',1,3,'Préparer des contrôles sur les systèmes embarqués','Préparation d’intervention',true),
    ('premiere',1,4,'Constater un dysfonctionnement en contexte course','Étude de cas',true),
    ('premiere',1,5,'Rédiger et présenter un compte rendu technique','Communication FR/EN',true),
    ('premiere',1,6,'Organiser l’intervention avant restitution','Synthèse professionnelle',true);

    -- Nouvelle Séquence 1 : Terminale
    insert into public.sessions(level,period,session_no,title,session_type,is_published)
    values
    ('terminale',1,1,'Prise en charge experte d’un voilier de course','Étude professionnelle',true),
    ('terminale',1,2,'Analyser le dossier technique et planifier l’intervention','Organisation',true),
    ('terminale',1,3,'Construire les hypothèses de diagnostic','Diagnostic',true),
    ('terminale',1,4,'Valider les hypothèses par des contrôles ciblés','Diagnostic + mesures',true),
    ('terminale',1,5,'Préparer la remise en conformité et les essais','Préparation + intervention',true),
    ('terminale',1,6,'Restituer l’embarcation et rendre compte','Synthèse professionnelle',true);
  end if;
end $$;

commit;

-- Contrôle attendu : 42 sessions par niveau.
select level, count(*) as nombre_sessions, min(period) as sequence_min, max(period) as sequence_max
from public.sessions
where level in ('seconde','premiere','terminale')
group by level
order by level;

select 'FigaroMN V21 : Route du Rhum + 7 séquences installées' as resultat;
