-- FigaroMN connecté - migration idempotente
-- À exécuter UNE FOIS dans Supabase SQL Editor.

alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and (p.email is null or p.email <> u.email);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    'student'
  )
  on conflict (id) do update set email=excluded.email;
  return new;
end;
$$;

grant update on public.profiles to authenticated;

insert into public.sessions(level,period,session_no,title,session_type,is_published)
values
('seconde',1,1,'Grandeurs électriques 12/24 V','Cours',true),
('seconde',1,2,'Architecture d’un circuit embarqué','Cours + widget',true),
('seconde',1,3,'Le multimètre : fonctions et sécurité','Cours + exercices',true),
('seconde',1,4,'Mesure de tension au multimètre','TP',true),
('seconde',1,5,'Continuité et résistance','TP',true),
('seconde',1,6,'Bilan multimètre et sécurité','Évaluation',true),
('seconde',2,1,'Fonction et architecture des feux','Cours',true),
('seconde',2,2,'Lecture de schémas et symboles','Exercices + widget',true),
('seconde',2,3,'Préparation d’une installation','Cours',true),
('seconde',2,4,'Installation de feux sur voilier','TP',true),
('seconde',2,5,'Installation de feux sur bateau à moteur','TP',true),
('seconde',2,6,'Évaluation installation feux','Évaluation',true),
('seconde',3,1,'Fonctionnement et risques','Cours',true),
('seconde',3,2,'Commande manuelle et automatique','Cours + widget',true),
('seconde',3,3,'Lecture du schéma pompe de cale','Exercices',true),
('seconde',3,4,'Pompe de cale manuelle','TP',true),
('seconde',3,5,'Pompe de cale automatique','TP',true),
('seconde',3,6,'Évaluation pompe de cale','Évaluation',true),
('seconde',4,1,'Constitution et rôle d’un relais','Cours',true),
('seconde',4,2,'Bornes, symboles et états','Widget + exercices',true),
('seconde',4,3,'Commande d’un récepteur par relais','Cours',true),
('seconde',4,4,'Contrôle d’un relais au multimètre','TP',true),
('seconde',4,5,'Montage relais + récepteur','TP',true),
('seconde',4,6,'Évaluation relais','Évaluation',true),
('seconde',5,1,'Fonction globale du guindeau','Cours',true),
('seconde',5,2,'Risques spécifiques au guindeau','Cours + sécurité',true),
('seconde',5,3,'Commande et puissance','Exercices + widget',true),
('seconde',5,4,'Contrôle visuel d’une installation','TP',true),
('seconde',5,5,'Commande de guindeau sur maquette','TP',true),
('seconde',5,6,'Évaluation guindeau','Évaluation',true),
('seconde',6,1,'Méthode d’intervention complète','Cours',true),
('seconde',6,2,'Choisir les contrôles pertinents','Étude de cas',true),
('seconde',6,3,'Diagnostic simple sur éclairage','TP',true),
('seconde',6,4,'Diagnostic simple sur pompe de cale','TP',true),
('seconde',6,5,'Remise en conformité et essais','Atelier',true),
('seconde',6,6,'Bilan annuel Seconde','Évaluation',true),
('premiere',1,1,'Qualité de mesure au multimètre','Cours',true),
('premiere',1,2,'Analyse de schéma et points de contrôle','Exercices + widget',true),
('premiere',1,3,'Contrôle d’alimentation d’un récepteur','TP',true),
('premiere',1,4,'Recherche de coupure','TP',true),
('premiere',1,5,'Synthèse de diagnostic','Étude de cas',true),
('premiere',1,6,'Mesures et diagnostic','Évaluation',true),
('premiere',2,1,'Fonctionnement normal et dégradé','Cours',true),
('premiere',2,2,'Hiérarchiser les hypothèses','Étude de cas',true),
('premiere',2,3,'Panne d’un seul feu','TP',true),
('premiere',2,4,'Panne de plusieurs feux','TP',true),
('premiere',2,5,'Remise en conformité et essais','Atelier',true),
('premiere',2,6,'Diagnostic feux de navigation','Évaluation',true),
('premiere',3,1,'Chaîne fonctionnelle','Cours',true),
('premiere',3,2,'Symptômes et hypothèses','Widget + exercices',true),
('premiere',3,3,'Pompe inopérante en manuel','TP',true),
('premiere',3,4,'Manuel OK / automatique HS','TP',true),
('premiere',3,5,'Remplacement d’un élément identifié','Atelier',true),
('premiere',3,6,'Diagnostic pompe de cale','Évaluation',true),
('premiere',4,1,'Architecture fonctionnelle du guindeau','Cours',true),
('premiere',4,2,'Relais/contacteurs de puissance','Cours + widget',true),
('premiere',4,3,'Contrôle circuit de commande','TP',true),
('premiere',4,4,'Diagnostic montée/descente','TP',true),
('premiere',4,5,'Remise en conformité','Atelier',true),
('premiere',4,6,'Évaluation guindeau','Évaluation',true),
('premiere',5,1,'Relais et inversion de polarité','Cours',true),
('premiere',5,2,'Lecture du circuit trim','Exercices + widget',true),
('premiere',5,3,'Contrôle d’un relais de trim','TP',true),
('premiere',5,4,'Trim descend mais ne monte pas','TP',true),
('premiere',5,5,'Remplacement et essais','Atelier',true),
('premiere',5,6,'Évaluation relais/trim','Évaluation',true),
('premiere',6,1,'Maintenance programmée et corrective','Cours',true),
('premiere',6,2,'Préparer une intervention','Étude de cas',true),
('premiere',6,3,'Entretien périodique','TP',true),
('premiere',6,4,'Réparation simple après diagnostic','TP',true),
('premiere',6,5,'Restitution au client','Jeu de rôle',true),
('premiere',6,6,'Bilan annuel Première','Évaluation',true),
('terminale',1,1,'Démarche complète de diagnostic','Cours',true),
('terminale',1,2,'Plan de contrôles','Étude de cas',true),
('terminale',1,3,'Diagnostic multi-pannes','TP',true),
('terminale',1,4,'Documentation partielle','TP',true),
('terminale',1,5,'Compte rendu hiérarchie/client','Atelier',true),
('terminale',1,6,'Diagnostic avancé','Évaluation',true),
('terminale',2,1,'Chaîne d’énergie à bord','Cours',true),
('terminale',2,2,'Schémas de distribution','Exercices + widget',true),
('terminale',2,3,'Circuit de charge pédagogique','TP',true),
('terminale',2,4,'Alimentation insuffisante','TP',true),
('terminale',2,5,'Remise en conformité d’une liaison','Atelier',true),
('terminale',2,6,'Évaluation chaîne d’énergie','Évaluation',true),
('terminale',3,1,'Architecture d’un actionneur réversible','Cours',true),
('terminale',3,2,'Symptôme montée/descente','Étude de cas',true),
('terminale',3,3,'Diagnostic relais de trim','TP',true),
('terminale',3,4,'Commande ou puissance ?','TP',true),
('terminale',3,5,'Réparation et validation','Atelier',true),
('terminale',3,6,'Évaluation trim/flaps','Évaluation',true),
('terminale',4,1,'Analyse système guindeau','Cours',true),
('terminale',4,2,'Symptômes et causes possibles','Exercices + widget',true),
('terminale',4,3,'Diagnostic circuit de commande','TP',true),
('terminale',4,4,'Diagnostic circuit de puissance','TP',true),
('terminale',4,5,'Réparation et traçabilité','Atelier',true),
('terminale',4,6,'Évaluation guindeau','Évaluation',true),
('terminale',5,1,'Entretien client et contrat d’intervention','Cours',true),
('terminale',5,2,'Organisation de l’intervention','Atelier',true),
('terminale',5,3,'Conseil technique au client','Jeu de rôle',true),
('terminale',5,4,'Intervention intégrée','TP',true),
('terminale',5,5,'Restitution de l’embarcation','Jeu de rôle',true),
('terminale',5,6,'Prise en charge/restitution','Évaluation',true),
('terminale',6,1,'Blocs U2, U31 et U32','Cours',true),
('terminale',6,2,'Sujet blanc diagnostic','Atelier',true),
('terminale',6,3,'Sujet blanc intervention','Atelier',true),
('terminale',6,4,'Sujet blanc prise en charge','Atelier',true),
('terminale',6,5,'Compétences fragiles','Remédiation',true),
('terminale',6,6,'Bilan Terminale','Évaluation',true)
on conflict(level,period,session_no)
do update set title=excluded.title,session_type=excluded.session_type,is_published=excluded.is_published;

select 'FigaroMN cloud : migration et catalogue des séances OK' as resultat;
