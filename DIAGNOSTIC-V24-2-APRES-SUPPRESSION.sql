-- =====================================================================
-- FIGAROMN V24.2 - DIAGNOSTIC NON DESTRUCTIF APRES INCIDENT
-- Ce script NE SUPPRIME et NE MODIFIE RIEN.
-- A exécuter dans Supabase > SQL Editor.
-- =====================================================================

-- 1) Combien de comptes Auth existent encore ?
select
  count(*) as comptes_auth_total,
  count(*) filter (where email is not null) as comptes_auth_avec_email
from auth.users;

-- 2) Combien de profils élèves / professeurs existent encore ?
select
  role,
  count(*) as nombre
from public.profiles
group by role
order by role;

-- 3) Comptes Auth qui n'ont plus de profil public.
select
  u.id,
  u.email,
  u.created_at,
  u.raw_user_meta_data
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
order by u.created_at;

-- 4) Profils publics qui n'ont plus de compte Auth.
select
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.level,
  p.archived_at
from public.profiles p
left join auth.users u on u.id = p.id
where u.id is null
order by p.role, p.full_name;

-- 5) Tous les profils élèves encore présents.
select
  p.id,
  p.full_name,
  p.email,
  p.level,
  p.archived_at
from public.profiles p
where p.role = 'student'
order by p.level, p.full_name;
