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


-- ===== Accès pour Claude (mcp_call) =====
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'mia@ex.fr', '{"username":"mia"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'max@ex.fr', '{"username":"max"}'),
  ('00000000-0000-0000-0000-0000000000f3', 'zed@ex.fr', '{"username":"zed"}');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', false);
select create_project('Projet Claude') as cpid \gset
select add_member(:cpid, '@max', 'member');
insert into claude_tokens (label, token_hash, can_write) values ('rw', repeat('1', 64), true), ('ro', repeat('2', 64), false);
insert into claude_tokens (label, token_hash, can_write, expires_at) values ('expiré', repeat('3', 64), true, now() - interval '1 minute');
select pg_temp.expect_error($$insert into claude_tokens (user_id, label, token_hash) values ('00000000-0000-0000-0000-0000000000f2', 'x', repeat('4', 64))$$, 'permission denied');
select pg_temp.expect_error($$select token_hash from claude_tokens$$, 'permission denied');
select pg_temp.expect_error($$select public.mcp_call(repeat('1', 64), 'list_projects')$$, 'permission denied');
do $$ begin assert (select count(*) from claude_tokens) = 3, 'je vois mes accès (sans l''empreinte)'; end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', false);
do $$ begin assert (select count(*) from claude_tokens) = 0, 'je ne vois pas les accès des autres'; end $$;
insert into claude_tokens (label, token_hash, can_write) values ('max', repeat('5', 64), true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f3', false);
insert into claude_tokens (label, token_hash, can_write) values ('zed', repeat('6', 64), true);
reset role;

select set_config('t.cpid', :'cpid', false);
do $$ declare r jsonb; tid bigint; kid bigint; other_pid bigint; pidv bigint := current_setting('t.cpid')::bigint; begin
  assert (public.mcp_call(repeat('9', 64), 'ping')->>'auth')::boolean = false, 'empreinte inconnue refusée';
  assert (public.mcp_call(repeat('3', 64), 'ping')->>'auth')::boolean = false, 'accès expiré refusé';
  assert (public.mcp_call(repeat('1', 64), 'ping')->>'auth')::boolean = true, 'accès valide';
  assert (select last_used_at from claude_tokens where token_hash = repeat('1', 64)) is not null, 'dernière utilisation notée';
  -- projets : chacun voit les siens
  assert jsonb_array_length(public.mcp_call(repeat('1', 64), 'list_projects')->'projects') = 1, 'Mia voit son projet';
  assert jsonb_array_length(public.mcp_call(repeat('6', 64), 'list_projects')->'projects') = 0, 'Zed ne voit rien';
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('6', 64), 'get_project', '{"project_id": %s}')$f$, pidv), 'accès');
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('6', 64), 'create_task', '{"project_id": %s, "title": "x"}')$f$, pidv), 'accès');
  assert (public.mcp_call(repeat('5', 64), 'get_project', jsonb_build_object('project_id', pidv))->'project'->>'name') = 'Projet Claude', 'Max (membre) voit le projet';
  assert jsonb_array_length(public.mcp_call(repeat('5', 64), 'get_project', jsonb_build_object('project_id', pidv))->'members') = 2, 'membres listés';
  -- lecture seule
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('2', 64), 'create_task', '{"project_id": %s, "title": "x"}')$f$, pidv), 'lecture seule');
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('2', 64), 'create_note', '{"project_id": %s, "text": "x"}')$f$, pidv), 'lecture seule');
  assert jsonb_array_length(public.mcp_call(repeat('2', 64), 'list_tasks', jsonb_build_object('project_id', pidv))->'tasks') = 0, 'lecture seule : on peut lire';
  -- création et modification
  r := public.mcp_call(repeat('1', 64), 'create_task', jsonb_build_object('project_id', pidv, 'title', 'Écrire le README', 'type', 'idea', 'priority', 'high', 'description', 'Détails'));
  tid := (r->>'task_id')::bigint;
  assert (select created_by from tasks where id = tid) = '00000000-0000-0000-0000-0000000000f1', 'auteur = la personne';
  assert (select assignee_id from tasks where id = tid) = '00000000-0000-0000-0000-0000000000f1', 'assignée à la personne par défaut';
  assert (select type || priority from tasks where id = tid) = 'ideahigh', 'type et priorité';
  assert exists (select 1 from activity where project_id = pidv and user_id = '00000000-0000-0000-0000-0000000000f1' and message like '%Écrire le README%'), 'journal d''activité attribué à la personne';
  perform public.mcp_call(repeat('1', 64), 'update_task', jsonb_build_object('task_id', tid, 'status', 'done'));
  assert (select done_at from tasks where id = tid) is not null, 'terminée : date de fin';
  perform public.mcp_call(repeat('1', 64), 'update_task', jsonb_build_object('task_id', tid, 'status', 'doing', 'assignee', 'max', 'title', 'README écrit'));
  assert (select title || status from tasks where id = tid) = 'README écritdoing', 'modifiée';
  assert (select assignee_id from tasks where id = tid) = '00000000-0000-0000-0000-0000000000f2', 'assignée à Max';
  assert (select done_at from tasks where id = tid) is null, 'plus terminée';
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('1', 64), 'update_task', '{"task_id": %s, "assignee": "inconnu"}')$f$, tid), 'Personne');
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('1', 64), 'update_task', '{"task_id": %s, "status": "fini"}')$f$, tid), 'check constraint');
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('1', 64), 'create_task', '{"project_id": %s, "title": "x", "assignee": "zed"}')$f$, pidv), 'pas membre');
  -- signalements des utilisateurs (formulaire public)
  insert into intake_forms (project_id, enabled) values (pidv, true);
  insert into tickets (project_id, kind, title, body, email, image_path) values
    (pidv, 'bug', 'Plantage au lancement', 'Sur Pixel', 'u@ex.fr', 'jeton/11111111-1111-1111-1111-111111111111.jpg'),
    (pidv, 'idea', 'Mode sombre', '', '', null);
  r := public.mcp_call(repeat('2', 64), 'list_tickets', jsonb_build_object('project_id', pidv));
  assert jsonb_array_length(r->'tickets') = 2 and (r->>'form_enabled')::boolean, 'lecture seule : on lit les signalements';
  assert (public.mcp_call(repeat('2', 64), 'list_tickets', jsonb_build_object('project_id', pidv, 'status', 'accepted'))->'tickets') = '[]'::jsonb, 'filtre par statut';
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('6', 64), 'list_tickets', '{"project_id": %s}')$f$, pidv), 'accès');
  kid := (select id from tickets where title = 'Plantage au lancement');
  assert public.mcp_call(repeat('2', 64), 'get_ticket_images', jsonb_build_object('ticket_id', kid))->'images'->0->>'path' like 'jeton/%', 'chemin de la capture renvoyé';
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('6', 64), 'get_ticket_images', '{"ticket_id": %s}')$f$, kid), 'n''existe pas');
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('2', 64), 'resolve_ticket', '{"ticket_id": %s, "action": "accept"}')$f$, kid), 'lecture seule');
  r := public.mcp_call(repeat('1', 64), 'resolve_ticket', jsonb_build_object('ticket_id', kid, 'action', 'accept'));
  assert (select type from tasks where id = (r->>'task_id')::bigint) = 'bug' and (select status from tickets where id = kid) = 'accepted' and r->>'image_path' like 'jeton/%', 'garder = tâche (bug) + signalement accepté';
  assert (select description from tasks where id = (r->>'task_id')::bigint) like '%Signalement n°%(u@ex.fr)', 'provenance notée dans la tâche';
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('1', 64), 'resolve_ticket', '{"ticket_id": %s, "action": "reject"}')$f$, kid), 'déjà trié');
  perform public.mcp_call(repeat('1', 64), 'resolve_ticket', jsonb_build_object('ticket_id', (select id from tickets where title = 'Mode sombre'), 'action', 'reject'));
  assert (select status from tickets where title = 'Mode sombre') = 'rejected', 'ignorer';
  delete from tasks where description like '%Signalement n°%'; delete from tickets; delete from intake_forms;
  -- images d'une tâche : chemins renvoyés aux seuls membres
  insert into task_images (task_id, project_id, path) values (tid, pidv, pidv || '/' || tid || '/11111111-1111-1111-1111-111111111111.jpg');
  assert jsonb_array_length(public.mcp_call(repeat('1', 64), 'get_task_images', jsonb_build_object('task_id', tid))->'images') = 1, 'get_task_images : le membre voit les images';
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('6', 64), 'get_task_images', '{"task_id": %s}')$f$, tid), 'accès');
  -- conversation verrouillée sur un projet (Mcp-Session-Id)
  perform public.mcp_call(repeat('1', 64), 'create_task', jsonb_build_object('project_id', pidv, 'title', 'Sans session'));
  r := public.mcp_call(repeat('1', 64), 'list_projects', '{"_session": "11111111-1111-1111-1111-111111111111"}');
  assert r ? 'choose', 'session neuve : on demande le projet';
  perform pg_temp.expect_error($f$select public.mcp_call(repeat('1', 64), 'my_tasks', '{"_session": "11111111-1111-1111-1111-111111111111"}')$f$, 'sur quel projet');
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('1', 64), 'create_task', '{"_session": "11111111-1111-1111-1111-111111111111", "project_id": %s, "title": "x"}')$f$, pidv), 'sur quel projet');
  perform pg_temp.expect_error($f$select public.mcp_call(repeat('1', 64), 'select_project', '{"_session": "11111111-1111-1111-1111-111111111111", "project_id": 999999}')$f$, 'accès');
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('6', 64), 'select_project', '{"_session": "22222222-2222-2222-2222-222222222222", "project_id": %s}')$f$, pidv), 'accès');
  r := public.mcp_call(repeat('1', 64), 'select_project', jsonb_build_object('_session', '11111111-1111-1111-1111-111111111111', 'project_id', pidv));
  assert (r->>'selected')::boolean, 'projet choisi';
  r := public.mcp_call(repeat('1', 64), 'create_task', jsonb_build_object('_session', '11111111-1111-1111-1111-111111111111', 'title', 'Projet par défaut'));
  assert (select project_id from tasks where id = (r->>'task_id')::bigint) = pidv, 'project_id omis : le projet de la conversation';
  assert jsonb_array_length(public.mcp_call(repeat('1', 64), 'list_projects', '{"_session": "11111111-1111-1111-1111-111111111111"}')->'projects') = 1, 'liste réduite au projet choisi';
  select (public.create_project('Autre projet')) into other_pid;
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('1', 64), 'get_project', '{"_session": "11111111-1111-1111-1111-111111111111", "project_id": %s}')$f$, other_pid), 'limitée');
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('1', 64), 'select_project', '{"_session": "11111111-1111-1111-1111-111111111111", "project_id": %s}')$f$, other_pid), 'déjà limitée');
  r := public.mcp_call(repeat('1', 64), 'select_project', jsonb_build_object('_session', '11111111-1111-1111-1111-111111111111', 'project_id', other_pid, 'change', true));
  assert (r->>'project_id')::bigint = other_pid, 'changement de projet demandé (change: true)';
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('1', 64), 'get_project', '{"_session": "11111111-1111-1111-1111-111111111111", "project_id": %s}')$f$, pidv), 'limitée');
  update claude_sessions set last_used_at = now() - interval '7 hours' where session_id = '11111111-1111-1111-1111-111111111111';
  assert public.mcp_call(repeat('1', 64), 'list_projects', '{"_session": "11111111-1111-1111-1111-111111111111"}') ? 'choose', 'session inactive 6 h : on redemande';
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('6', 64), 'update_task', '{"task_id": %s, "status": "done"}')$f$, tid), 'accès');
  -- lecture
  assert jsonb_array_length(public.mcp_call(repeat('5', 64), 'my_tasks')->'tasks') = 1, 'Max voit la tâche qui lui est assignée';
  assert (public.mcp_call(repeat('5', 64), 'my_tasks')->'tasks'->0->>'project') = 'Projet Claude', 'avec le nom du projet';
  assert jsonb_array_length(public.mcp_call(repeat('1', 64), 'list_tasks', jsonb_build_object('project_id', pidv, 'type', 'bug'))->'tasks') = 0, 'filtre par type';
  assert jsonb_array_length(public.mcp_call(repeat('1', 64), 'list_tasks', jsonb_build_object('project_id', pidv, 'status', 'doing'))->'tasks') = 1, 'filtre par statut';
  -- post-it et chantiers
  r := public.mcp_call(repeat('1', 64), 'create_note', jsonb_build_object('project_id', pidv, 'text', 'Une idée', 'color', 'pink'));
  assert (select x between 0 and 3000 and y between 0 and 3000 and color = 'pink' from notes where id = (r->>'note_id')::bigint), 'post-it placé dans le mur';
  assert jsonb_array_length(public.mcp_call(repeat('5', 64), 'list_notes', jsonb_build_object('project_id', pidv))->'notes') = 1, 'post-it listé';
  r := public.mcp_call(repeat('1', 64), 'create_epic', jsonb_build_object('project_id', pidv, 'title', 'Grand chantier', 'horizon', 'now'));
  assert (select horizon from epics where id = (r->>'epic_id')::bigint) = 'now', 'chantier créé';
  perform pg_temp.expect_error(format($f$select public.mcp_call(repeat('1', 64), 'delete_everything', '{"project_id": %s}')$f$, pidv), 'Outil inconnu');
end $$;
-- révoquer = supprimer la ligne
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', false);
delete from claude_tokens where label = 'rw';
reset role;
do $$ begin assert (public.mcp_call(repeat('1', 64), 'ping')->>'auth')::boolean = false, 'accès révoqué refusé'; end $$;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', false);
delete from projects where name = 'Projet Claude';
reset role;


-- ===== Images des tâches =====
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'ila@ex.fr', '{"username":"ila"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'ivo@ex.fr', '{"username":"ivo"}');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
select create_project('Images') as ipid \gset
insert into tasks (project_id, title) values (:ipid, 'Avec images') returning id as itid \gset
select set_config('t.ipid', :'ipid', false), set_config('t.itid', :'itid', false);
insert into task_images (task_id, project_id, path) values (:itid, :ipid, :'ipid' || '/' || :'itid' || '/11111111-1111-1111-1111-111111111111.jpg');
select pg_temp.expect_error(format($f$insert into task_images (task_id, project_id, path) values (%s, %s, '%s/%s/zzz.jpg')$f$, :itid, :ipid, :ipid, :itid), 'check constraint');
select pg_temp.expect_error(format($f$insert into task_images (task_id, project_id, path) values (%s, %s, '999/%s/22222222-2222-2222-2222-222222222222.jpg')$f$, :itid, :ipid, :itid), 'Chemin');
select pg_temp.expect_error(format($f$insert into task_images (task_id, project_id, path, created_by) values (%s, %s, '%s/%s/33333333-3333-3333-3333-333333333333.jpg', '00000000-0000-0000-0000-0000000000a2')$f$, :itid, :ipid, :ipid, :itid), 'row-level security');
do $$ declare i int; pidv text := current_setting('t.ipid'); tidv text := current_setting('t.itid'); begin
  for i in 2..8 loop
    insert into task_images (task_id, project_id, path) values (tidv::bigint, pidv::bigint, pidv || '/' || tidv || '/00000000-0000-0000-0000-00000000000' || i || '.jpg');
  end loop;
  begin
    insert into task_images (task_id, project_id, path) values (tidv::bigint, pidv::bigint, pidv || '/' || tidv || '/00000000-0000-0000-0000-000000000099.jpg');
    raise exception 'ÉCHEC : la 9e image aurait dû être refusée';
  exception when others then
    if sqlerrm like 'ÉCHEC%' or position('Huit images' in sqlerrm) = 0 then raise; end if;
  end;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
do $$ begin assert (select count(*) from task_images) = 0, 'un non-membre ne voit pas les images'; end $$;
select pg_temp.expect_error(format($f$insert into task_images (task_id, project_id, path) values (%s, %s, '%s/%s/44444444-4444-4444-4444-444444444444.jpg')$f$, :itid, :ipid, :ipid, :itid), 'pas dans ce projet');
delete from task_images;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
do $$ begin assert (select count(*) from task_images) = 8, 'un non-membre ne peut pas supprimer'; end $$;
delete from tasks where title = 'Avec images';
do $$ begin assert (select count(*) from task_images) = 0, 'supprimer la tâche supprime ses images'; end $$;
delete from projects where name = 'Images';
reset role;

-- ===== Dernier projet ouvert =====
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select create_project('Ouvertures') as opid \gset
insert into project_opens (project_id) values (:opid);
do $$ begin assert (select count(*) from project_opens) = 1, 'ma date d''ouverture est enregistrée'; end $$;
update project_opens set opened_at = now();
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
do $$ begin assert (select count(*) from project_opens) = 0, 'je ne vois pas les ouvertures des autres'; end $$;
select pg_temp.expect_error(format('insert into project_opens (project_id) values (%s)', :opid), 'row-level security');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
delete from projects where name = 'Ouvertures';
do $$ begin assert (select count(*) from project_opens) = 0, 'supprimer le projet supprime ses ouvertures'; end $$;
select pg_temp.expect_error(format($f$insert into project_opens (project_id, user_id) values (%s, '00000000-0000-0000-0000-00000000000a')$f$, :opid), 'row-level security');
reset role;

-- ===== Formulaire public (signalements) =====
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select create_project('Avec formulaire') as fpid \gset
select (intake_set(:fpid, true)).token as ftok \gset
select set_config('t.fpid', :'fpid', false), set_config('t.ftok', :'ftok', false);
do $$ begin assert (select enabled from intake_forms where project_id = current_setting('t.fpid')::bigint), 'formulaire activé par un admin'; end $$;
-- un non-admin / non-membre ne peut ni activer ni voir
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
select pg_temp.expect_error(format('select intake_set(%s, false)', :fpid), 'Réservé aux admins');
do $$ begin assert (select count(*) from intake_forms) = 0 and (select count(*) from tickets) = 0, 'un non-membre ne voit rien'; end $$;
reset role;
-- l'invité (rôle anon) : voit seulement le nom, envoie un signalement, rien d'autre
set role anon;
do $$ begin assert (public.intake_info(current_setting('t.ftok'))->>'name') = 'Avec formulaire', 'la page publique connaît le nom du projet'; end $$;
do $$ begin assert public.intake_info('mauvais') = 'null'::jsonb, 'lien inconnu : rien'; end $$;
select public.submit_ticket(:'ftok', 'bug', 'Ça plante', 'au démarrage', 'invite@ex.fr') as tid \gset
select set_config('t.tid', :'tid', false);
select pg_temp.expect_error($$select public.submit_ticket('mauvais', 'bug', 'x')$$, 'fermé');
select pg_temp.expect_error(format($f$select public.submit_ticket('%s', 'autre', 'x')$f$, :'ftok'), 'Type inconnu');
select pg_temp.expect_error(format($f$select public.submit_ticket('%s', 'bug', '')$f$, :'ftok'), 'titre est obligatoire');
select pg_temp.expect_error(format($f$select public.submit_ticket('%s', 'bug', 'x', '', 'pas-un-mail')$f$, :'ftok'), 'e-mail');
select pg_temp.expect_error(format($f$select public.submit_ticket('%s', 'bug', 'x', '', '', 'autre-dossier/a.jpg')$f$, :'ftok'), 'Image invalide');
do $$ begin assert public.intake_open(current_setting('t.ftok')) and not public.intake_open('mauvais'), 'le dépôt d''une capture vérifie le lien (sans droit sur les tables)'; end $$;
select pg_temp.expect_error('select * from public.tickets', 'permission denied');
select pg_temp.expect_error('select * from public.intake_forms', 'permission denied');
reset role;
-- le projet lit sa boîte, trie, mais l'adresse IP n'est pas exposée aux membres par le client
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ begin assert (select count(*) from tickets where project_id = current_setting('t.fpid')::bigint and status = 'new') = 1, 'le membre voit le signalement'; end $$;
update tickets set status = 'rejected' where id = :tid;
select pg_temp.expect_error(format('update tickets set title = ''piraté'' where id = %s', :tid), 'permission denied');
-- couper le formulaire : l'envoi est refusé ; renouveler : l'ancien lien est mort
select intake_set(:fpid, false);
reset role; set role anon;
select pg_temp.expect_error(format($f$select public.submit_ticket('%s', 'bug', 'x')$f$, :'ftok'), 'fermé');
reset role; set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select (intake_set(:fpid, true, true)).token as ftok2 \gset
select (:'ftok2' <> :'ftok') as nouveau \gset
select pg_temp.expect_error(format('select 1 / %s', case when :'nouveau' then 1 else 0 end), 'zero') where not :'nouveau';
reset role; set role anon;
select pg_temp.expect_error(format($f$select public.submit_ticket('%s', 'bug', 'x')$f$, :'ftok'), 'fermé');
-- limite : 5 envois par heure et par adresse IP
select set_config('request.headers', '{"x-forwarded-for": "1.2.3.4, 10.0.0.1"}', false);
select public.submit_ticket(:'ftok2', 'idea', 'a' || g) from generate_series(1, 5) g;
select pg_temp.expect_error(format($f$select public.submit_ticket('%s', 'idea', 'de trop')$f$, :'ftok2'), 'Trop d''envois');
reset role;
delete from projects where name = 'Avec formulaire';

\echo 'OK : tous les tests de sécurité passent'
