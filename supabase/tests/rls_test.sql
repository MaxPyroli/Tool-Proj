-- Tests des règles d'accès. Lancer : npm run test:db (voir README).
\set ON_ERROR_STOP on
set client_min_messages = warning;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@ex.fr', '{"username":"Alice","display_name":"Alice"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@ex.fr', '{"username":"bob"}'),
  ('00000000-0000-0000-0000-00000000000c', 'eve@ex.fr', '{"username":"bob"}');

do $$ begin
  assert (select username from profiles where id = '00000000-0000-0000-0000-00000000000a') = 'alice', 'identifiant en minuscules';
  assert (select username from profiles where id = '00000000-0000-0000-0000-00000000000c') like 'bob-%', 'identifiant déjà pris → suffixe';
end $$;

create function pg_temp.expect_error(sql text, needle text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'ÉCHEC : aurait dû refuser : %', sql;
exception when others then
  if sqlerrm like 'ÉCHEC%' or position(needle in sqlerrm) = 0 then raise exception '% (reçu : %)', sql, sqlerrm; end if;
end $$;
grant execute on function pg_temp.expect_error(text, text) to authenticated;

-- ===== Alice crée un projet =====
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select create_project('App vélo', 'desc', '🚲', '#3b6fd8', 'active') as pid \gset
do $$ begin
  assert (select role from memberships where user_id = auth.uid()) = 'admin', 'le créateur est admin';
  assert (select count(*) from activity) = 1, 'activité de création';
end $$;
select pg_temp.expect_error($$insert into projects (name) values ('x')$$, 'permission denied');
select add_member(:pid, '@bob', 'member');
select pg_temp.expect_error(format('select add_member(%s, ''bob'')', :pid), 'Déjà membre');
select pg_temp.expect_error(format('select add_member(%s, ''personne'')', :pid), 'Aucun compte');
insert into tasks (project_id, title) values (:pid, 'Login'), (:pid, 'Carte');
-- dernier admin protégé
select pg_temp.expect_error(format('update memberships set role = ''member'' where project_id = %s and user_id = auth.uid()', :pid), 'au moins un admin');
select pg_temp.expect_error(format('delete from memberships where project_id = %s and user_id = auth.uid()', :pid), 'au moins un admin');

-- ===== Bob, membre =====
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  assert (select count(*) from projects) = 1, 'bob voit le projet';
  assert (select count(*) from tasks) = 2, 'bob voit les tâches';
end $$;
update projects set name = 'Pirate';
do $$ begin assert (select name from projects) = 'App vélo', 'un membre ne modifie pas le projet'; end $$;
select pg_temp.expect_error(format('select add_member(%s, ''alice'')', :pid), 'Réservé aux admins');
update tasks set status = 'done' where title = 'Login';
do $$ begin assert (select done_at is not null from tasks where title = 'Login'), 'done_at rempli'; end $$;
update tasks set assignee_id = '00000000-0000-0000-0000-00000000000b' where title = 'Carte';
select pg_temp.expect_error($$update tasks set assignee_id = '00000000-0000-0000-0000-00000000000c' where title = 'Carte'$$, 'pas membre');
insert into notes (project_id, text, color) values (:pid, 'Mode sombre', 'pink') returning id as nid \gset
insert into note_votes (note_id) values (:nid);
select pg_temp.expect_error(format('insert into note_votes (note_id, user_id) values (%s, ''00000000-0000-0000-0000-00000000000a'')', :nid), 'row-level security');
select pg_temp.expect_error(format('update notes set color = ''red'' where id = %s', :nid), 'check constraint');
update profiles set display_name = 'Pirate' where id = '00000000-0000-0000-0000-00000000000a';
update profiles set display_name = 'Bobby' where id = auth.uid();

-- ===== Chantiers =====
insert into epics (project_id, title, horizon) values (:pid, 'Mode hors-ligne', 'now') returning id as eid \gset
insert into tasks (project_id, title, type, priority, epic_id, description) values (:pid, 'Crash au démarrage', 'bug', 'high', :eid, 'Sur Android 14');
select pg_temp.expect_error(format('insert into tasks (project_id, title, type) values (%s, ''x'', ''epic'')', :pid), 'check constraint');
select pg_temp.expect_error(format('insert into tasks (project_id, title, priority) values (%s, ''x'', ''urgent'')', :pid), 'check constraint');
do $$ begin
  assert exists (select 1 from activity where message = 'a ajouté le bug « Crash au démarrage »'), 'activité bug';
  assert exists (select 1 from activity where message = 'a créé le chantier « Mode hors-ligne »'), 'activité chantier';
end $$;

-- ===== Eve, extérieure =====
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$ begin
  assert (select count(*) from projects) = 0, 'eve ne voit pas le projet';
  assert (select count(*) from tasks) = 0 and (select count(*) from notes) = 0 and (select count(*) from activity) = 0, 'eve ne voit rien';
  assert (select count(*) from profiles) = 3, 'profils visibles pour la recherche';
end $$;
select pg_temp.expect_error(format('insert into notes (project_id, text) values (%s, ''x'')', :pid), 'row-level security');
select pg_temp.expect_error(format('insert into tasks (project_id, title) values (%s, ''x'')', :pid), 'row-level security');
select pg_temp.expect_error(format('insert into epics (project_id, title) values (%s, ''x'')', :pid), 'row-level security');
do $$ begin assert (select count(*) from epics) = 0, 'eve ne voit pas les chantiers'; end $$;
-- un chantier d'un autre projet ne peut pas être utilisé
select create_project('Projet Eve') as epid \gset
select pg_temp.expect_error(format('insert into tasks (project_id, title, epic_id) values (%s, ''x'', %s)', :epid, :eid), 'autre projet');
delete from projects;
select pg_temp.expect_error(format('insert into note_votes (note_id) values (%s)', :nid), 'row-level security');

-- ===== Anonyme =====
reset role;
set role anon;
select pg_temp.expect_error('select * from projects', 'permission denied');

-- ===== Bilan =====
reset role;
do $$ begin
  assert (select display_name from profiles where username = 'alice') = 'Alice', 'bob ne renomme pas alice';
  assert (select display_name from profiles where username = 'bob') = 'Bobby', 'bob se renomme';
  assert (select count(*) from projects where name = 'App vélo') = 1, 'eve ne supprime pas';
  assert (select count(*) from note_votes) = 1;
  assert exists (select 1 from activity where message = 'a terminé « Login »');
  assert exists (select 1 from activity where message like 'a ajouté bob (membre)');
end $$;

-- Bob quitte, ses tâches sont désassignées ; Alice supprime le projet (cascade malgré la règle du dernier admin).
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
delete from memberships where user_id = auth.uid();
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin assert (select assignee_id from tasks where title = 'Carte') is null, 'désassignée'; end $$;
delete from epics;
do $$ begin assert (select epic_id from tasks where title = 'Crash au démarrage') is null, 'chantier supprimé → tâche gardée'; end $$;
delete from projects;
reset role;
do $$ begin assert (select count(*) from projects where name <> 'Projet Eve') = 0 and (select count(*) from memberships m join projects p on p.id = m.project_id where p.name <> 'Projet Eve') = 0, 'projet supprimé'; end $$;
-- suppression d'un compte admin unique
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000d', 'zoe@ex.fr');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
select create_project('Solo');
reset role;
delete from auth.users where email = 'zoe@ex.fr';

\echo 'OK : tous les tests de sécurité passent'
