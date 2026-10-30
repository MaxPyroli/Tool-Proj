-- Tool Proj : schéma Supabase.
-- À coller dans Supabase → SQL Editor → New query → Run.
-- Le script peut être relancé sans risque (il ne supprime aucune donnée).

-- =========================================================
-- Tables
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  emoji text not null default '🚀' check (char_length(emoji) between 1 and 16),
  color text not null default '#0d7c72' check (color ~ '^#[0-9a-fA-F]{6}$'),
  status text not null default 'idea' check (status in ('idea', 'active', 'paused', 'done')),
  manual_progress int not null default 0 check (manual_progress between 0 and 100),
  repo_url text not null default '' check (repo_url = '' or repo_url ~* '^https?://'),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  project_id bigint not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  primary key (project_id, user_id)
);
create index if not exists memberships_user_idx on public.memberships (user_id);

create table if not exists public.tasks (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.projects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  position double precision not null default 0,
  assignee_id uuid references public.profiles (id) on delete set null,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index if not exists tasks_project_idx on public.tasks (project_id);

-- Avatars : emoji et couleur choisis par chacun (vides = initiales).
alter table public.profiles add column if not exists avatar_emoji text;
alter table public.profiles add column if not exists avatar_color text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_emoji_check') then
    alter table public.profiles add constraint profiles_avatar_emoji_check check (avatar_emoji is null or char_length(avatar_emoji) between 1 and 16);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_color_check') then
    alter table public.profiles add constraint profiles_avatar_color_check check (avatar_color is null or avatar_color ~ '^#[0-9a-fA-F]{6}$');
  end if;
end $$;

-- Grands chantiers : les grosses idées, qui regroupent des tâches, bugs et améliorations.
create table if not exists public.epics (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.projects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 5000),
  horizon text not null default 'next' check (horizon in ('now', 'next', 'later', 'done')),
  position double precision not null default 0,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists epics_project_idx on public.epics (project_id);

-- Tâches v2 : description, type, priorité, chantier (ajoutés sans toucher aux données existantes).
alter table public.tasks add column if not exists description text not null default '';
alter table public.tasks add column if not exists type text not null default 'task';
alter table public.tasks add column if not exists priority text not null default 'normal';
alter table public.tasks add column if not exists epic_id bigint references public.epics (id) on delete set null;
create index if not exists tasks_epic_idx on public.tasks (epic_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_priority_check') then
    alter table public.tasks add constraint tasks_priority_check check (priority in ('high', 'normal', 'low'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_description_check') then
    alter table public.tasks add constraint tasks_description_check check (char_length(description) <= 5000);
  end if;
end $$;

-- Liens du projet : dépôt GitHub, base Supabase, conversation Claude, maquette, site…
create table if not exists public.project_links (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.projects (id) on delete cascade,
  label text not null default '' check (char_length(label) <= 80),
  url text not null check (char_length(url) <= 500 and url ~* '^https?://\S+$'),
  position double precision not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists project_links_project_idx on public.project_links (project_id);

-- L'ancien champ « lien » du projet devient le premier lien de la liste (une seule fois).
insert into public.project_links (project_id, label, url)
select p.id, 'Lien', p.repo_url from public.projects p
where p.repo_url <> '' and not exists (select 1 from public.project_links l where l.project_id = p.id);

alter table public.tasks drop constraint if exists tasks_type_check;
alter table public.tasks add constraint tasks_type_check check (type in ('task', 'bug', 'idea', 'improvement'));

-- Style des tâches par projet : un style (look) et des couleurs par type, personnalisables par les admins.
create or replace function public.valid_type_colors(c jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(c) = 'object' and not exists (
    select 1 from jsonb_each_text(c) e
    where e.key not in ('task', 'bug', 'idea', 'improvement') or e.value !~ '^#[0-9a-fA-F]{6}$');
$$;
alter table public.projects add column if not exists task_style text not null default 'classic';
alter table public.projects add column if not exists type_colors jsonb not null default '{}'::jsonb;
alter table public.projects drop constraint if exists projects_task_style_check;
alter table public.projects add constraint projects_task_style_check check (task_style in ('classic', 'candy', 'neon', 'paper', 'pixel', 'sticker'));
alter table public.projects drop constraint if exists projects_type_colors_check;
alter table public.projects add constraint projects_type_colors_check check (public.valid_type_colors(type_colors));

create table if not exists public.notes (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.projects (id) on delete cascade,
  text text not null default '' check (char_length(text) <= 1000),
  color text not null default 'yellow' check (color in ('yellow', 'pink', 'blue', 'green', 'orange', 'purple')),
  x double precision not null default 40 check (x between 0 and 3000),
  y double precision not null default 40 check (y between 0 and 3000),
  z int not null default 0,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_project_idx on public.notes (project_id);

create table if not exists public.note_votes (
  note_id bigint not null references public.notes (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  primary key (note_id, user_id)
);

create table if not exists public.activity (
  id bigint generated always as identity primary key,
  project_id bigint not null references public.projects (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists activity_project_idx on public.activity (project_id, id desc);

-- =========================================================
-- Fonctions utilitaires (security definer : elles contournent la RLS
-- pour éviter les boucles entre politiques)
-- =========================================================

create or replace function public.is_member(pid bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships where project_id = pid and user_id = auth.uid());
$$;

create or replace function public.is_project_admin(pid bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships where project_id = pid and user_id = auth.uid() and role = 'admin');
$$;

create or replace function public.username_available(name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where username = lower(trim(name)));
$$;

-- Crée un projet et en fait l'appelant admin, en une seule opération.
create or replace function public.create_project(
  p_name text, p_description text default '', p_emoji text default '🚀',
  p_color text default '#0d7c72', p_status text default 'idea'
) returns bigint language plpgsql security definer set search_path = '' as $$
declare new_id bigint;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  insert into public.projects (name, description, emoji, color, status)
  values (trim(p_name), coalesce(p_description, ''), coalesce(nullif(trim(p_emoji), ''), '🚀'), p_color, p_status)
  returning id into new_id;
  insert into public.memberships (project_id, user_id, role) values (new_id, auth.uid(), 'admin');
  return new_id;
end $$;

-- Ajoute quelqu'un à un projet à partir de son identifiant (réservé aux admins du projet).
create or replace function public.add_member(p_project bigint, p_username text, p_role text default 'member')
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid;
begin
  if not public.is_project_admin(p_project) then raise exception 'Réservé aux admins du projet'; end if;
  select id into uid from public.profiles where username = lower(trim(both '@ ' from p_username));
  if uid is null then raise exception 'Aucun compte avec cet identifiant'; end if;
  if exists (select 1 from public.memberships where project_id = p_project and user_id = uid) then
    raise exception 'Déjà membre du projet';
  end if;
  insert into public.memberships (project_id, user_id, role)
  values (p_project, uid, case when p_role = 'admin' then 'admin' else 'member' end);
end $$;

-- Journal d'activité.
create or replace function public.log_activity(pid bigint, msg text)
returns void language sql security definer set search_path = '' as $$
  insert into public.activity (project_id, user_id, message)
  select pid, (select id from public.profiles where id = auth.uid()), msg
  where exists (select 1 from public.projects where id = pid);
  update public.projects set updated_at = now() where id = pid;
  -- Le journal se vide au fil de l'eau : 20 événements au plus, rien de plus vieux que 14 jours.
  delete from public.activity where project_id = pid
    and (created_at < now() - interval '14 days'
         or id not in (select id from public.activity where project_id = pid order by id desc limit 20));
$$;
revoke execute on function public.log_activity(bigint, text) from public, anon, authenticated;

-- =========================================================
-- Triggers
-- =========================================================

-- Profil créé automatiquement à l'inscription (identifiant et nom pris dans les métadonnées).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  base text := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)), '[^a-zA-Z0-9._-]', '', 'g'));
  uname text;
begin
  if char_length(base) < 3 then base := base || 'user'; end if;
  base := left(base, 26);
  uname := base;
  while exists (select 1 from public.profiles where username = uname) loop
    uname := base || '-' || substr(md5(random()::text), 1, 4);
  end loop;
  insert into public.profiles (id, username, display_name)
  values (new.id, uname, left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), uname), 60));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();
drop trigger if exists notes_touch on public.notes;
create trigger notes_touch before update on public.notes for each row execute function public.touch_updated_at();

-- Un projet garde toujours au moins un admin.
create or replace function public.keep_one_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'admin'
     and (tg_op = 'DELETE' or new.role <> 'admin')
     and exists (select 1 from public.projects where id = old.project_id)          -- pas pendant la suppression du projet
     and exists (select 1 from public.profiles where id = old.user_id)             -- ni pendant la suppression du compte
     and (select count(*) from public.memberships where project_id = old.project_id and role = 'admin') <= 1 then
    raise exception 'Il faut au moins un admin sur le projet';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists memberships_keep_admin on public.memberships;
create trigger memberships_keep_admin before update or delete on public.memberships for each row execute function public.keep_one_admin();

-- Tâches : date de fin automatique et assignation limitée aux membres.
create or replace function public.tasks_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.assignee_id is not null and not exists (
    select 1 from public.memberships where project_id = new.project_id and user_id = new.assignee_id) then
    raise exception 'La personne assignée n''est pas membre du projet';
  end if;
  if tg_op = 'UPDATE' and new.project_id <> old.project_id then
    raise exception 'Une tâche ne peut pas changer de projet';
  end if;
  if new.epic_id is not null and not exists (
    select 1 from public.epics where id = new.epic_id and project_id = new.project_id) then
    raise exception 'Ce chantier appartient à un autre projet';
  end if;
  if new.status = 'done' then new.done_at := coalesce(case when tg_op = 'UPDATE' then old.done_at end, now());
  else new.done_at := null; end if;
  return new;
end $$;
drop trigger if exists tasks_before_write on public.tasks;
create trigger tasks_before_write before insert or update on public.tasks for each row execute function public.tasks_before_write();

create or replace function public.links_before_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.project_id <> old.project_id then raise exception 'Un lien ne peut pas changer de projet'; end if;
  return new;
end $$;
drop trigger if exists links_before_update on public.project_links;
create trigger links_before_update before update on public.project_links for each row execute function public.links_before_update();

create or replace function public.notes_before_update()
returns trigger language plpgsql as $$
begin
  if new.project_id <> old.project_id then raise exception 'Un post-it ne peut pas changer de projet'; end if;
  return new;
end $$;
drop trigger if exists notes_before_update on public.notes;
create trigger notes_before_update before update on public.notes for each row execute function public.notes_before_update();

-- Activité.
create or replace function public.tasks_log()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.project_id, format('a ajouté %s « %s »',
      case new.type when 'bug' then 'le bug' when 'idea' then 'l''idée' when 'improvement' then 'l''amélioration' else 'la tâche' end, new.title));
  elsif tg_op = 'DELETE' then
    perform public.log_activity(old.project_id, format('a supprimé %s « %s »',
      case old.type when 'bug' then 'le bug' when 'idea' then 'l''idée' when 'improvement' then 'l''amélioration' else 'la tâche' end, old.title));
  elsif new.status <> old.status then
    perform public.log_activity(new.project_id, format('%s « %s »',
      case new.status when 'todo' then 'a remis à faire' when 'doing' then 'a commencé' else 'a terminé' end, new.title));
  end if;
  return null;
end $$;
drop trigger if exists tasks_log on public.tasks;
create trigger tasks_log after insert or update or delete on public.tasks for each row execute function public.tasks_log();

create or replace function public.epics_before_update()
returns trigger language plpgsql as $$
begin
  if new.project_id <> old.project_id then raise exception 'Un chantier ne peut pas changer de projet'; end if;
  return new;
end $$;
drop trigger if exists epics_before_update on public.epics;
create trigger epics_before_update before update on public.epics for each row execute function public.epics_before_update();

create or replace function public.epics_log()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity(new.project_id, format('a créé le chantier « %s »', new.title));
  elsif tg_op = 'DELETE' then
    perform public.log_activity(old.project_id, format('a supprimé le chantier « %s »', old.title));
  elsif new.horizon <> old.horizon then
    perform public.log_activity(new.project_id, format('a passé le chantier « %s » en %s', new.title,
      case new.horizon when 'now' then '« Maintenant »' when 'next' then '« Ensuite »' when 'later' then '« Plus tard »' else '« Terminé »' end));
  end if;
  return null;
end $$;
drop trigger if exists epics_log on public.epics;
create trigger epics_log after insert or update or delete on public.epics for each row execute function public.epics_log();

create or replace function public.notes_log()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then perform public.log_activity(new.project_id, 'a collé un post-it');
  else perform public.log_activity(old.project_id, 'a décollé un post-it'); end if;
  return null;
end $$;
drop trigger if exists notes_log on public.notes;
create trigger notes_log after insert or delete on public.notes for each row execute function public.notes_log();

create or replace function public.memberships_log()
returns trigger language plpgsql security definer set search_path = '' as $$
declare who text;
begin
  select display_name into who from public.profiles where id = coalesce(new.user_id, old.user_id);
  if tg_op = 'INSERT' then
    if new.user_id = auth.uid() then perform public.log_activity(new.project_id, 'a créé le projet');
    else perform public.log_activity(new.project_id, format('a ajouté %s (%s)', who, case new.role when 'admin' then 'admin' else 'membre' end)); end if;
  elsif tg_op = 'UPDATE' then
    if new.role <> old.role then
      perform public.log_activity(new.project_id, format('a passé %s en %s', who, case new.role when 'admin' then 'admin' else 'membre' end));
    end if;
  else
    update public.tasks set assignee_id = null where project_id = old.project_id and assignee_id = old.user_id;
    if old.user_id = auth.uid() then perform public.log_activity(old.project_id, 'a quitté le projet');
    else perform public.log_activity(old.project_id, format('a retiré %s', who)); end if;
  end if;
  return null;
end $$;
drop trigger if exists memberships_log on public.memberships;
create trigger memberships_log after insert or update or delete on public.memberships for each row execute function public.memberships_log();

create or replace function public.projects_log()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> old.status then
    insert into public.activity (project_id, user_id, message)
    values (new.id, auth.uid(), format('a passé le projet en « %s »',
      case new.status when 'idea' then 'Idée' when 'active' then 'En cours' when 'paused' then 'En pause' else 'Terminé' end));
  elsif (new.name, new.description, new.emoji, new.color, new.manual_progress, new.repo_url, new.due_date, new.task_style, new.type_colors)
        is distinct from (old.name, old.description, old.emoji, old.color, old.manual_progress, old.repo_url, old.due_date, old.task_style, old.type_colors) then
    insert into public.activity (project_id, user_id, message) values (new.id, auth.uid(), 'a modifié le projet');
  end if;
  return null;
end $$;
drop trigger if exists projects_log on public.projects;
create trigger projects_log after update on public.projects for each row execute function public.projects_log();

-- =========================================================
-- Sécurité (Row Level Security)
-- =========================================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.memberships enable row level security;
alter table public.tasks enable row level security;
alter table public.epics enable row level security;
alter table public.project_links enable row level security;
alter table public.notes enable row level security;
alter table public.note_votes enable row level security;
alter table public.activity enable row level security;

-- Profils : visibles par les personnes connectées (pour pouvoir s'ajouter aux projets), modifiables par leur propriétaire.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Projets : visibles par les membres, modifiables et supprimables par les admins. Création via create_project().
drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects for select to authenticated using (public.is_member(id));
drop policy if exists "projects_update" on public.projects;
create policy "projects_update" on public.projects for update to authenticated using (public.is_project_admin(id)) with check (public.is_project_admin(id));
drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete" on public.projects for delete to authenticated using (public.is_project_admin(id));

-- Équipe : visible par les membres ; les admins gèrent ; chacun peut quitter. Ajout via add_member().
drop policy if exists "memberships_select" on public.memberships;
create policy "memberships_select" on public.memberships for select to authenticated using (public.is_member(project_id));
drop policy if exists "memberships_update" on public.memberships;
create policy "memberships_update" on public.memberships for update to authenticated using (public.is_project_admin(project_id)) with check (public.is_project_admin(project_id));
drop policy if exists "memberships_delete" on public.memberships;
create policy "memberships_delete" on public.memberships for delete to authenticated using (public.is_project_admin(project_id) or user_id = auth.uid());

-- Tâches et post-it : tout membre du projet.
drop policy if exists "tasks_all" on public.tasks;
create policy "tasks_all" on public.tasks for all to authenticated using (public.is_member(project_id)) with check (public.is_member(project_id));
drop policy if exists "epics_all" on public.epics;
create policy "epics_all" on public.epics for all to authenticated using (public.is_member(project_id)) with check (public.is_member(project_id));
-- Liens : visibles par les membres, gérés par les admins du projet.
drop policy if exists "links_select" on public.project_links;
create policy "links_select" on public.project_links for select to authenticated using (public.is_member(project_id));
drop policy if exists "links_write" on public.project_links;
create policy "links_write" on public.project_links for insert to authenticated with check (public.is_project_admin(project_id));
drop policy if exists "links_update" on public.project_links;
create policy "links_update" on public.project_links for update to authenticated using (public.is_project_admin(project_id)) with check (public.is_project_admin(project_id));
drop policy if exists "links_delete" on public.project_links;
create policy "links_delete" on public.project_links for delete to authenticated using (public.is_project_admin(project_id));
drop policy if exists "notes_all" on public.notes;
create policy "notes_all" on public.notes for all to authenticated using (public.is_member(project_id)) with check (public.is_member(project_id));

-- Votes : visibles par les membres, chacun gère son propre vote.
drop policy if exists "votes_select" on public.note_votes;
create policy "votes_select" on public.note_votes for select to authenticated
  using (exists (select 1 from public.notes n where n.id = note_id and public.is_member(n.project_id)));
drop policy if exists "votes_insert" on public.note_votes;
create policy "votes_insert" on public.note_votes for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.notes n where n.id = note_id and public.is_member(n.project_id)));
drop policy if exists "votes_delete" on public.note_votes;
create policy "votes_delete" on public.note_votes for delete to authenticated using (user_id = auth.uid());

-- Activité : lecture seule pour les membres (écrite par les triggers).
drop policy if exists "activity_select" on public.activity;
create policy "activity_select" on public.activity for select to authenticated using (public.is_member(project_id));

grant select, update on public.profiles to authenticated;
grant select, update, delete on public.projects to authenticated;
grant select, update, delete on public.memberships to authenticated;
grant select, insert, update, delete on public.tasks, public.epics, public.notes, public.note_votes to authenticated;
grant select on public.activity to authenticated;
grant select, insert, update, delete on public.project_links to authenticated;
revoke insert on public.projects, public.memberships, public.activity from authenticated, anon;
grant execute on function public.create_project(text, text, text, text, text), public.add_member(bigint, text, text),
  public.username_available(text), public.is_member(bigint), public.is_project_admin(bigint) to authenticated;

-- =========================================================
-- Durcissement (alertes du linter Supabase)
-- =========================================================

-- Les fonctions de déclencheurs ne se lancent que par leurs tables : personne ne doit pouvoir les appeler via l'API.
revoke execute on function public.handle_new_user(), public.keep_one_admin(), public.tasks_before_write(), public.tasks_log(),
  public.epics_log(), public.notes_log(), public.memberships_log(), public.projects_log() from public, anon, authenticated;

-- Les fonctions appelées par l'app ou par les règles d'accès ne servent qu'aux comptes connectés.
revoke execute on function public.is_member(bigint), public.is_project_admin(bigint), public.create_project(text, text, text, text, text),
  public.add_member(bigint, text, text), public.username_available(text) from public, anon;
grant execute on function public.is_member(bigint), public.is_project_admin(bigint), public.create_project(text, text, text, text, text),
  public.add_member(bigint, text, text), public.username_available(text) to authenticated;

alter function public.touch_updated_at() set search_path = '';
alter function public.notes_before_update() set search_path = '';
alter function public.epics_before_update() set search_path = '';

-- =========================================================
-- Notifications (Web Push)
-- Un appareil s'abonne depuis l'app ; un déclencheur prévient une fonction Edge (« send-push ») qui envoie la notification.
-- Les clés et l'adresse de la fonction sont dans private.push_config, remplie à la main (jamais dans ce fichier).
-- Sans cette configuration, tout reste muet : rien ne casse.
-- =========================================================
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$ begin
  begin create extension if not exists pg_net; exception when others then null; end;
end $$;

create table if not exists public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 20 and 2000),
  p256dh text not null check (char_length(p256dh) between 20 and 200),
  auth text not null check (char_length(auth) between 10 and 100),
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push_select" on public.push_subscriptions;
drop policy if exists "push_insert" on public.push_subscriptions;
drop policy if exists "push_delete" on public.push_subscriptions;
create policy "push_select" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy "push_insert" on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
create policy "push_delete" on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());
grant select, insert, delete on public.push_subscriptions to authenticated;

create table if not exists private.push_config (
  id int primary key default 1 check (id = 1),
  url text,            -- adresse de la fonction Edge send-push
  secret text,         -- secret partagé entre la base et la fonction
  vapid_public text,
  vapid_private text,
  subject text
);
alter table private.push_config enable row level security;

-- Envoie (sans jamais bloquer l'écriture en cours) une notification à tous les appareils d'une personne.
create or replace function private.push_to(p_user uuid, p_title text, p_body text, p_url text)
returns void language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  select * into c from private.push_config where id = 1;
  if c.url is null or c.secret is null then return; end if;
  if not exists (select 1 from public.push_subscriptions where user_id = p_user) then return; end if;
  begin
    perform net.http_post(
      url := c.url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', c.secret),
      body := jsonb_build_object('user_id', p_user, 'title', p_title, 'body', p_body, 'url', p_url));
  exception when others then null;
  end;
end $$;

-- Tâche assignée à quelqu'un d'autre que soi.
create or replace function public.tasks_notify() returns trigger language plpgsql security definer set search_path = '' as $$
declare who text; proj text;
begin
  if new.assignee_id is null or new.assignee_id is not distinct from auth.uid() then return null; end if;
  if tg_op = 'UPDATE' and old.assignee_id is not distinct from new.assignee_id then return null; end if;
  select coalesce(display_name, username) into who from public.profiles where id = auth.uid();
  select name into proj from public.projects where id = new.project_id;
  perform private.push_to(new.assignee_id, 'Une tâche pour toi',
    coalesce(who, 'Quelqu''un') || ' t''a assigné « ' || new.title || ' » (' || coalesce(proj, 'projet') || ')',
    '#/p/' || new.project_id || '/taches');
  return null;
exception when others then return null;
end $$;
drop trigger if exists tasks_notify on public.tasks;
create trigger tasks_notify after insert or update of assignee_id on public.tasks
  for each row execute function public.tasks_notify();

-- Ajouté à un projet par quelqu'un d'autre.
create or replace function public.memberships_notify() returns trigger language plpgsql security definer set search_path = '' as $$
declare who text; proj text;
begin
  if new.user_id is not distinct from auth.uid() then return null; end if;
  select coalesce(display_name, username) into who from public.profiles where id = auth.uid();
  select name into proj from public.projects where id = new.project_id;
  perform private.push_to(new.user_id, 'Nouveau projet',
    coalesce(who, 'Quelqu''un') || ' t''a ajouté au projet « ' || coalesce(proj, 'projet') || ' »',
    '#/p/' || new.project_id);
  return null;
exception when others then return null;
end $$;
drop trigger if exists memberships_notify on public.memberships;
create trigger memberships_notify after insert on public.memberships
  for each row execute function public.memberships_notify();

-- Bouton « Tester » de l'app : une notification vers ses propres appareils.
create or replace function public.push_test() returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Connecte-toi d''abord.'; end if;
  if not exists (select 1 from public.push_subscriptions where user_id = auth.uid()) then return false; end if;
  perform private.push_to(auth.uid(), 'Tool Proj', 'Les notifications fonctionnent sur cet appareil.', '#/');
  return true;
end $$;

-- Réservée à la fonction Edge (clé serveur) : donne les clés et les appareils si le secret est bon.
create or replace function public.push_payload(p_secret text, p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  select * into c from private.push_config where id = 1;
  if c.secret is null or p_secret is distinct from c.secret then return null; end if;
  return jsonb_build_object('vapid_public', c.vapid_public, 'vapid_private', c.vapid_private, 'subject', c.subject,
    'subscriptions', coalesce((select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth))
                               from public.push_subscriptions where user_id = p_user), '[]'::jsonb));
end $$;
revoke execute on function public.tasks_notify(), public.memberships_notify(), public.push_test(),
  public.push_payload(text, uuid) from public, anon, authenticated;
grant execute on function public.push_test() to authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.push_payload(text, uuid) to service_role;
  end if;
end $$;

-- =========================================================
-- Images des tâches
-- Les fichiers sont dans le stockage Supabase (espace privé « task-images », dossier <projet>/<tâche>/), réduits dans le navigateur :
-- une version 1600 px et une vignette « _t ». Cette table dit lesquels appartiennent à quelle tâche.
-- =========================================================
create table if not exists public.task_images (
  id bigint generated always as identity primary key,
  task_id bigint not null references public.tasks (id) on delete cascade,
  project_id bigint not null references public.projects (id) on delete cascade,
  path text not null unique check (path ~ '^[0-9]+/[0-9]+/[0-9a-f-]{36}\.jpg$'),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists task_images_task_idx on public.task_images (task_id);
create index if not exists task_images_project_idx on public.task_images (project_id);

create or replace function public.task_images_before_insert() returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.tasks where id = new.task_id and project_id = new.project_id) then
    raise exception 'Cette tâche n''est pas dans ce projet';
  end if;
  if split_part(new.path, '/', 1) <> new.project_id::text or split_part(new.path, '/', 2) <> new.task_id::text then
    raise exception 'Chemin d''image invalide';
  end if;
  if (select count(*) from public.task_images where task_id = new.task_id) >= 8 then
    raise exception 'Huit images au plus par tâche';
  end if;
  return new;
end $$;
drop trigger if exists task_images_before_insert on public.task_images;
create trigger task_images_before_insert before insert on public.task_images for each row execute function public.task_images_before_insert();

alter table public.task_images enable row level security;
drop policy if exists "task_images_select" on public.task_images;
drop policy if exists "task_images_insert" on public.task_images;
drop policy if exists "task_images_delete" on public.task_images;
create policy "task_images_select" on public.task_images for select to authenticated using (public.is_member(project_id));
create policy "task_images_insert" on public.task_images for insert to authenticated with check (public.is_member(project_id) and created_by = auth.uid());
create policy "task_images_delete" on public.task_images for delete to authenticated using (public.is_member(project_id));
grant select, insert, delete on public.task_images to authenticated;
revoke execute on function public.task_images_before_insert() from public, anon, authenticated;

-- Stockage (seulement là où le stockage Supabase existe) : espace privé, JPEG de 2 Mo au plus, accès aux membres du projet.
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('task-images', 'task-images', false, 2097152, array['image/jpeg'])
    on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];
    drop policy if exists "task_images_read" on storage.objects;
    drop policy if exists "task_images_write" on storage.objects;
    drop policy if exists "task_images_remove" on storage.objects;
    create policy "task_images_read" on storage.objects for select to authenticated
      using (bucket_id = 'task-images' and case when (storage.foldername(name))[1] ~ '^[0-9]+$' then public.is_member(((storage.foldername(name))[1])::bigint) else false end);
    create policy "task_images_write" on storage.objects for insert to authenticated
      with check (bucket_id = 'task-images' and case when (storage.foldername(name))[1] ~ '^[0-9]+$' then public.is_member(((storage.foldername(name))[1])::bigint) else false end);
    create policy "task_images_remove" on storage.objects for delete to authenticated
      using (bucket_id = 'task-images' and case when (storage.foldername(name))[1] ~ '^[0-9]+$' then public.is_member(((storage.foldername(name))[1])::bigint) else false end);
  end if;
end $$;

-- =========================================================
-- Accès pour Claude (connecteur MCP)
-- La personne crée un accès dans l'app : la clé est fabriquée dans son navigateur, seule son empreinte (SHA-256) est gardée ici.
-- La fonction Edge « mcp » reçoit la clé, calcule l'empreinte et appelle mcp_call() (réservée à la clé serveur) :
-- les outils agissent avec les droits de la personne (membre des projets), jamais plus.
-- =========================================================
create table if not exists public.claude_tokens (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  label text not null default '' check (char_length(label) <= 60),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  can_write boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists claude_tokens_user_idx on public.claude_tokens (user_id);
alter table public.claude_tokens enable row level security;
drop policy if exists "claude_tokens_select" on public.claude_tokens;
drop policy if exists "claude_tokens_insert" on public.claude_tokens;
drop policy if exists "claude_tokens_delete" on public.claude_tokens;
create policy "claude_tokens_select" on public.claude_tokens for select to authenticated using (user_id = auth.uid());
create policy "claude_tokens_insert" on public.claude_tokens for insert to authenticated with check (user_id = auth.uid());
create policy "claude_tokens_delete" on public.claude_tokens for delete to authenticated using (user_id = auth.uid());
revoke all on public.claude_tokens from anon, authenticated;
grant select (id, user_id, label, can_write, expires_at, created_at, last_used_at) on public.claude_tokens to authenticated;
grant insert (label, token_hash, can_write, expires_at) on public.claude_tokens to authenticated;
grant delete on public.claude_tokens to authenticated;

-- Une « session » = une conversation dans Claude (en-tête Mcp-Session-Id fourni par la fonction Edge).
-- Au premier usage, Claude demande le projet, puis select_project le verrouille pour toute la conversation.
create table if not exists public.claude_sessions (
  token_id bigint not null references public.claude_tokens(id) on delete cascade,
  session_id text not null check (session_id ~ '^[0-9a-f-]{36}$'),
  project_id bigint references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  primary key (token_id, session_id)
);
alter table public.claude_sessions enable row level security;
revoke all on public.claude_sessions from anon, authenticated;

create or replace function public.mcp_call(p_token_hash text, p_tool text, p_args jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t record; uid uuid; a jsonb := coalesce(p_args, '{}'::jsonb); pid bigint; tid bigint; eid bigint; r jsonb; n int; w boolean;
  v_status text; v_type text; v_prio text; v_assignee uuid; v_name text; sid text; lock bigint; lock_name text;
begin
  select * into t from public.claude_tokens where token_hash = p_token_hash and (expires_at is null or expires_at > now());
  if t.id is null then return jsonb_build_object('auth', false); end if;
  uid := t.user_id; w := t.can_write;
  if t.last_used_at is null or t.last_used_at < now() - interval '1 minute' then
    update public.claude_tokens set last_used_at = now() where id = t.id;
  end if;
  -- les déclencheurs (journal d'activité, auteur) voient la personne comme si elle agissait depuis l'app
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', uid, 'role', 'authenticated')::text, true);

  if p_tool = 'ping' then return jsonb_build_object('auth', true, 'can_write', w); end if;

  -- conversation : le projet choisi (select_project) est le seul accessible ; sans session, pas de verrou
  sid := nullif(a->>'_session', ''); a := a - '_session';
  if sid is not null then
    insert into public.claude_sessions (token_id, session_id) values (t.id, sid)
      on conflict (token_id, session_id) do update set
        project_id = case when public.claude_sessions.last_used_at < now() - interval '6 hours' then null else public.claude_sessions.project_id end,
        last_used_at = now()
      returning project_id into lock;
    if lock is not null then select name into lock_name from public.projects where id = lock; end if;
  end if;

  if p_tool = 'select_project' then
    pid := nullif(a->>'project_id', '')::bigint;
    if sid is null then raise exception 'Cette connexion ne garde pas la conversation : donne project_id à chaque outil.'; end if;
    if pid is null or not public.is_member(pid) then raise exception 'Tu n''as pas accès à ce projet (ou il n''existe pas).'; end if;
    if lock is not null and lock <> pid and not coalesce((a->>'change')::boolean, false) then raise exception 'Cette conversation est déjà limitée au projet « % » (id %). Si la personne demande clairement de changer de projet, rappelle select_project avec change: true.', lock_name, lock; end if;
    update public.claude_sessions set project_id = pid where token_id = t.id and session_id = sid;
    return jsonb_build_object('selected', true, 'project_id', pid, 'project', (select name from public.projects where id = pid),
      'note', 'Cette conversation reste sur ce projet uniquement.');
  end if;

  if sid is not null and lock is null and p_tool <> 'list_projects' then
    raise exception 'Demande d''abord à la personne sur quel projet travailler (liste-les avec list_projects), puis appelle select_project.';
  end if;

  if p_tool = 'list_projects' then
    return jsonb_build_object('projects', coalesce((select jsonb_agg(jsonb_build_object(
      'id', p.id, 'name', p.name, 'status', p.status, 'progress', p.manual_progress, 'role', m.role,
      'open_tasks', (select count(*) from public.tasks x where x.project_id = p.id and x.status <> 'done')) order by p.name)
      from public.memberships m join public.projects p on p.id = m.project_id where m.user_id = uid and (lock is null or p.id = lock)), '[]'::jsonb))
      || case when sid is not null and lock is null then jsonb_build_object('choose', 'Demande à la personne quel projet utiliser dans cette conversation, puis appelle select_project.')
              when lock is not null then jsonb_build_object('locked_to', lock) else '{}'::jsonb end;
  end if;

  if p_tool in ('get_project', 'list_tasks', 'list_notes', 'create_task', 'create_note', 'create_epic') then
    pid := coalesce(nullif(a->>'project_id', '')::bigint, lock);
    if pid is null then raise exception 'Il manque project_id.'; end if;
    if lock is not null and pid <> lock then raise exception 'Cette conversation est limitée au projet « % » (id %).', lock_name, lock; end if;
    if not public.is_member(pid) then raise exception 'Tu n''as pas accès à ce projet (ou il n''existe pas).'; end if;
  end if;

  if p_tool = 'get_project' then
    return jsonb_build_object(
      'project', (select jsonb_build_object('id', p.id, 'name', p.name, 'description', p.description, 'status', p.status, 'progress', p.manual_progress, 'due_date', p.due_date) from public.projects p where p.id = pid),
      'counts', (select coalesce(jsonb_object_agg(status, c), '{}'::jsonb) from (select status, count(*) c from public.tasks where project_id = pid group by status) q),
      'epics', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'title', e.title, 'horizon', e.horizon,
          'tasks_open', (select count(*) from public.tasks x where x.epic_id = e.id and x.status <> 'done'),
          'tasks_done', (select count(*) from public.tasks x where x.epic_id = e.id and x.status = 'done')) order by e.position, e.id)
          from public.epics e where e.project_id = pid), '[]'::jsonb),
      'members', coalesce((select jsonb_agg(jsonb_build_object('username', pr.username, 'name', pr.display_name, 'role', m.role))
          from public.memberships m join public.profiles pr on pr.id = m.user_id where m.project_id = pid), '[]'::jsonb),
      'links', coalesce((select jsonb_agg(jsonb_build_object('label', l.label, 'url', l.url) order by l.position, l.id) from public.project_links l where l.project_id = pid), '[]'::jsonb));
  end if;

  if p_tool = 'list_tasks' or p_tool = 'my_tasks' then
    n := least(greatest(coalesce(nullif(a->>'limit', '')::int, 50), 1), 200);
    return jsonb_build_object('tasks', coalesce((select jsonb_agg(row_to_json(q)) from (
      select x.id, x.project_id, pr.name as project, x.title, left(x.description, 600) as description, x.status, x.type, x.priority,
             e.title as epic, x.epic_id, a2.username as assignee, x.created_at, x.done_at,
             (select count(*) from public.task_images i where i.task_id = x.id) as images
      from public.tasks x
      join public.projects pr on pr.id = x.project_id
      left join public.epics e on e.id = x.epic_id
      left join public.profiles a2 on a2.id = x.assignee_id
      where (lock is null or x.project_id = lock) and (case when p_tool = 'my_tasks' then x.assignee_id = uid and x.status <> 'done'
                  else x.project_id = pid
                       and (nullif(a->>'status', '') is null or x.status = a->>'status')
                       and (nullif(a->>'type', '') is null or x.type = a->>'type')
                       and (nullif(a->>'epic_id', '') is null or x.epic_id = (a->>'epic_id')::bigint)
                       and (coalesce((a->>'mine')::boolean, false) = false or x.assignee_id = uid)
                       and (coalesce((a->>'include_done')::boolean, false) or nullif(a->>'status', '') is not null or x.status <> 'done') end)
        and (p_tool <> 'my_tasks' or exists (select 1 from public.memberships m where m.project_id = x.project_id and m.user_id = uid))
      order by case x.status when 'doing' then 0 when 'todo' then 1 else 2 end, case x.priority when 'high' then 0 when 'normal' then 1 else 2 end, x.id
      limit n) q), '[]'::jsonb));
  end if;

  if p_tool = 'list_notes' then
    return jsonb_build_object('notes', coalesce((select jsonb_agg(row_to_json(q)) from (
      select x.id, x.text, x.color, (select count(*) from public.note_votes v where v.note_id = x.id) as votes, x.created_at
      from public.notes x where x.project_id = pid order by x.id desc limit 100) q), '[]'::jsonb));
  end if;

  -- ----- écritures -----
  if p_tool in ('create_task', 'update_task', 'create_note', 'create_epic') and not w then
    raise exception 'Cet accès est en lecture seule.';
  end if;

  if p_tool = 'create_task' then
    v_type := coalesce(nullif(a->>'type', ''), 'task'); v_prio := coalesce(nullif(a->>'priority', ''), 'normal'); v_status := coalesce(nullif(a->>'status', ''), 'todo');
    v_name := coalesce(nullif(a->>'assignee', ''), 'me');
    if v_name = 'me' then v_assignee := uid;
    elsif v_name = 'none' then v_assignee := null;
    else
      select id into v_assignee from public.profiles where username = lower(ltrim(v_name, '@'));
      if v_assignee is null then raise exception 'Personne ne s''appelle « % ».', v_name; end if;
    end if;
    insert into public.tasks (project_id, title, description, type, priority, status, epic_id, assignee_id, position)
    values (pid, left(trim(a->>'title'), 200), left(coalesce(a->>'description', ''), 5000), v_type, v_prio, v_status, nullif(a->>'epic_id', '')::bigint, v_assignee,
            coalesce((select max(position) from public.tasks where project_id = pid), 0) + 1)
    returning id into tid;
    return jsonb_build_object('created', true, 'task_id', tid);
  end if;

  if p_tool = 'update_task' then
    tid := nullif(a->>'task_id', '')::bigint;
    select project_id into pid from public.tasks where id = tid;
    if pid is null or not public.is_member(pid) or (lock is not null and pid <> lock) then raise exception 'Cette tâche n''existe pas (ou tu n''y as pas accès dans ce projet).'; end if;
    if a ? 'assignee' then
      v_name := a->>'assignee';
      if v_name is null or v_name in ('', 'none') then v_assignee := null;
      elsif v_name = 'me' then v_assignee := uid;
      else
        select id into v_assignee from public.profiles where username = lower(ltrim(v_name, '@'));
        if v_assignee is null then raise exception 'Personne ne s''appelle « % ».', v_name; end if;
      end if;
    end if;
    update public.tasks set
      title = coalesce(left(trim(a->>'title'), 200), title),
      description = coalesce(left(a->>'description', 5000), description),
      status = coalesce(nullif(a->>'status', ''), status),
      type = coalesce(nullif(a->>'type', ''), type),
      priority = coalesce(nullif(a->>'priority', ''), priority),
      epic_id = case when a ? 'epic_id' then nullif(a->>'epic_id', '')::bigint else epic_id end,
      assignee_id = case when a ? 'assignee' then v_assignee else assignee_id end
    where id = tid;
    return jsonb_build_object('updated', true, 'task_id', tid);
  end if;

  if p_tool = 'create_note' then
    n := (select count(*) from public.notes where project_id = pid);
    insert into public.notes (project_id, text, color, x, y, z)
    values (pid, left(coalesce(a->>'text', ''), 1000), coalesce(nullif(a->>'color', ''), 'yellow'),
            40 + (n % 12) * 220, least(40 + (n / 12) * 220, 2800), coalesce((select max(z) from public.notes where project_id = pid), 0) + 1)
    returning id into tid;
    return jsonb_build_object('created', true, 'note_id', tid);
  end if;

  if p_tool = 'create_epic' then
    insert into public.epics (project_id, title, description, horizon, position)
    values (pid, left(trim(a->>'title'), 200), left(coalesce(a->>'description', ''), 5000), coalesce(nullif(a->>'horizon', ''), 'next'),
            coalesce((select max(position) from public.epics where project_id = pid), 0) + 1)
    returning id into eid;
    return jsonb_build_object('created', true, 'epic_id', eid);
  end if;

  raise exception 'Outil inconnu : %', p_tool;
end $$;
revoke execute on function public.mcp_call(text, text, jsonb) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.mcp_call(text, text, jsonb) to service_role;
  end if;
end $$;

-- =========================================================
-- Temps réel (les changements des autres apparaissent en direct)
-- =========================================================
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['projects', 'memberships', 'tasks', 'epics', 'project_links', 'notes', 'note_votes', 'task_images'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
