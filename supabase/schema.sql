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
  if not exists (select 1 from pg_constraint where conname = 'tasks_type_check') then
    alter table public.tasks add constraint tasks_type_check check (type in ('task', 'bug', 'improvement'));
  end if;
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
      case new.type when 'bug' then 'le bug' when 'improvement' then 'l''amélioration' else 'la tâche' end, new.title));
  elsif tg_op = 'DELETE' then
    perform public.log_activity(old.project_id, format('a supprimé %s « %s »',
      case old.type when 'bug' then 'le bug' when 'improvement' then 'l''amélioration' else 'la tâche' end, old.title));
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
  elsif (new.name, new.description, new.emoji, new.color, new.manual_progress, new.repo_url, new.due_date)
        is distinct from (old.name, old.description, old.emoji, old.color, old.manual_progress, old.repo_url, old.due_date) then
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
-- Temps réel (les changements des autres apparaissent en direct)
-- =========================================================
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['projects', 'memberships', 'tasks', 'epics', 'project_links', 'notes', 'note_votes'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
