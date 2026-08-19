-- ============================================================
-- FIGAROMN V5 - AUTHENTIFICATION ELEVES CAP + BAC PRO
-- À exécuter UNE FOIS dans Supabase > SQL Editor.
-- Conserve les comptes existants.
-- ============================================================

begin;

-- Supprime uniquement les contraintes CHECK de niveau de nos tables
-- afin de réautoriser explicitement CAP en plus du Bac Pro.
do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid='public.profiles'::regclass
      and contype='c'
      and pg_get_constraintdef(oid) ilike '%level%'
  loop
    execute format('alter table public.profiles drop constraint %I',r.conname);
  end loop;

  for r in
    select conname
    from pg_constraint
    where conrelid='public.classes'::regclass
      and contype='c'
      and pg_get_constraintdef(oid) ilike '%level%'
  loop
    execute format('alter table public.classes drop constraint %I',r.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_level_figaromn_check
  check (level is null or level in ('cap','seconde','premiere','terminale')) not valid;

alter table public.classes
  add constraint classes_level_figaromn_check
  check (level in ('cap','seconde','premiere','terminale')) not valid;

-- Le niveau choisi lors de la création du compte est enregistré.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_level text;
begin
  requested_level := new.raw_user_meta_data ->> 'level';

  if requested_level not in ('cap','seconde','premiere','terminale') then
    requested_level := null;
  end if;

  insert into public.profiles (
    id, full_name, email, role, level
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    'student',
    requested_level
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = case
        when coalesce(public.profiles.full_name,'') = '' then excluded.full_name
        else public.profiles.full_name
      end,
      level = coalesce(public.profiles.level, excluded.level);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

commit;

select 'FigaroMN V5 : authentification élève CAP/Bac Pro activée' as resultat;
