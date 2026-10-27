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
-- style des tâches et couleurs par type
update projects set task_style = 'neon', type_colors = '{"bug":"#ff3860","idea":"#ffe600"}' where id = :pid;
select pg_temp.expect_error(format('update projects set task_style = ''disco'' where id = %s', :pid), 'check constraint');
select pg_temp.expect_error(format('update projects set type_colors = ''{"bug":"rouge"}'' where id = %s', :pid), 'check constraint');
select pg_temp.expect_error(format('update projects set type_colors = ''{"epic":"#ffffff"}'' where id = %s', :pid), 'check constraint');
select pg_temp.expect_error(format('update projects set type_colors = ''[]'' where id = %s', :pid), 'check constraint');
insert into tasks (project_id, title, type) values (:pid, 'Et si on faisait un mode sombre ?', 'idea');
do $$ begin assert exists (select 1 from activity where message = 'a ajouté l''idée « Et si on faisait un mode sombre ? »'), 'activité idée'; end $$;
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
  assert (select count(*) from tasks) = 3, 'bob voit les tâches';
end $$;
update projects set name = 'Pirate';
do $$ begin assert (select name from projects) = 'App vélo', 'un membre ne modifie pas le projet'; end $$;
update projects set task_style = 'pixel';
do $$ begin assert (select task_style from projects) = 'neon', 'un membre ne change pas le style'; end $$;
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
update profiles set avatar_emoji = '🦊', avatar_color = '#ffd8a8' where id = auth.uid();
select pg_temp.expect_error($$update profiles set avatar_color = 'rouge' where id = auth.uid()$$, 'check constraint');

-- ===== Chantiers =====
insert into epics (project_id, title, horizon) values (:pid, 'Mode hors-ligne', 'now') returning id as eid \gset
insert into tasks (project_id, title, type, priority, epic_id, description) values (:pid, 'Crash au démarrage', 'bug', 'high', :eid, 'Sur Android 14');
select pg_temp.expect_error(format('insert into tasks (project_id, title, type) values (%s, ''x'', ''epic'')', :pid), 'check constraint');
select pg_temp.expect_error(format('insert into tasks (project_id, title, priority) values (%s, ''x'', ''urgent'')', :pid), 'check constraint');
do $$ begin
  assert exists (select 1 from activity where message = 'a ajouté le bug « Crash au démarrage »'), 'activité bug';
  assert exists (select 1 from activity where message = 'a créé le chantier « Mode hors-ligne »'), 'activité chantier';
end $$;

-- ===== Liens du projet =====
-- (Alice est admin du projet ; Bob l'est devenu plus haut : on teste avec un projet où il est simple membre.)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select create_project('Projet liens') as lpid \gset
select add_member(:lpid, 'bob', 'member');
insert into project_links (project_id, label, url) values (:lpid, 'Dépôt', 'https://github.com/x/y');
select pg_temp.expect_error(format('insert into project_links (project_id, url) values (%s, ''javascript:alert(1)'')', :lpid), 'check constraint');
select pg_temp.expect_error(format('insert into project_links (project_id, url) values (%s, ''ftp://x.fr'')', :lpid), 'check constraint');
-- le journal d'activité se vide au fil de l'eau (20 événements au plus)
insert into tasks (project_id, title) select :lpid, 'Tâche ' || g from generate_series(1, 25) g;
select (count(*) <= 20 and count(*) > 0) as purged from activity where project_id = :lpid \gset
\if :purged
\else
  do $$ begin raise exception 'ÉCHEC : le journal ne se vide pas tout seul'; end $$;
\endif
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin assert (select count(*) from project_links) = 1, 'un membre voit les liens'; end $$;
select pg_temp.expect_error(format('insert into project_links (project_id, label, url) values (%s, ''x'', ''https://x.fr'')', :lpid), 'row-level security');
update project_links set label = 'Pirate';
delete from project_links;
do $$ begin assert (select label from project_links) = 'Dépôt', 'un membre ne modifie ni ne supprime les liens'; end $$;

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
do $$ begin assert (select count(*) from project_links) = 0, 'eve ne voit pas les liens'; end $$;
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
  assert (select avatar_emoji from profiles where username = 'bob') = '🦊', 'bob choisit son avatar';
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


-- ===== Notifications =====
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-0000000000e1', 'ned@ex.fr', '{"username":"ned"}'), ('00000000-0000-0000-0000-0000000000e2', 'ola@ex.fr', '{"username":"ola"}');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
select create_project('Notifs') as npid \gset
select add_member(:npid, '@ola', 'member');
insert into push_subscriptions (user_id, endpoint, p256dh, auth) values (auth.uid(), 'https://push.example/abcdefghijklmnop', repeat('p', 40), repeat('a', 20));
select pg_temp.expect_error($$insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ('00000000-0000-0000-0000-0000000000e2', 'https://push.example/zzzzzzzzzzzzzzzz', repeat('p', 40), repeat('a', 20))$$, 'row-level security');
select pg_temp.expect_error($$select * from private.push_config$$, 'permission denied');
select pg_temp.expect_error($$select public.push_payload('x', auth.uid())$$, 'permission denied');
do $$ begin
  assert (select count(*) from push_subscriptions) = 1, 'je vois mon appareil';
  assert public.push_test() = true, 'test avec un appareil';
end $$;
-- une tâche assignée à une autre personne ne casse rien (même sans configuration)
insert into tasks (project_id, title, assignee_id) values (:npid, 'Pour Ola', '00000000-0000-0000-0000-0000000000e2');
update tasks set assignee_id = null where title = 'Pour Ola';
update tasks set assignee_id = '00000000-0000-0000-0000-0000000000e2' where title = 'Pour Ola';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e2', false);
do $$ begin
  assert (select count(*) from push_subscriptions) = 0, 'je ne vois pas les appareils des autres';
  assert public.push_test() = false, 'test sans appareil';
end $$;
delete from push_subscriptions;
reset role;
do $$ begin assert (select count(*) from push_subscriptions) = 1, 'je ne peux pas effacer les appareils des autres'; end $$;
-- configuration : la fonction ne sert qu'avec le bon secret
insert into private.push_config (id, url, secret, vapid_public, vapid_private, subject) values (1, 'https://exemple.invalid/send-push', 's3cret', 'pub', 'priv', 'https://exemple.invalid/');
do $$ begin
  assert public.push_payload('mauvais', '00000000-0000-0000-0000-0000000000e1') is null, 'mauvais secret refusé';
  assert (public.push_payload('s3cret', '00000000-0000-0000-0000-0000000000e1')->'subscriptions'->0->>'endpoint') = 'https://push.example/abcdefghijklmnop', 'bon secret : les appareils';
end $$;
-- avec la configuration, une assignation ne casse toujours rien (pg_net absent ou injoignable)
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
update tasks set assignee_id = null where title = 'Pour Ola';
update tasks set assignee_id = '00000000-0000-0000-0000-0000000000e2' where title = 'Pour Ola';
select public.push_test();
reset role;
delete from private.push_config;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
delete from projects;
reset role;

\echo 'OK : tous les tests de sécurité passent'
