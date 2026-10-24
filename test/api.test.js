import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../db.js';
import { createApp } from '../app.js';

async function setup(t, opts) {
  const app = createApp(openDb(':memory:'), opts);
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const client = () => {
    let cookie = '';
    return async (method, url, body) => {
      const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', cookie }, body: body && JSON.stringify(body) });
      const set = res.headers.get('set-cookie');
      if (set) cookie = set.split(';')[0];
      return { status: res.status, body: await res.json() };
    };
  };
  return { server, client };
}

test('comptes, rôles et permissions', async (t) => {
  const { server, client } = await setup(t, { allowRegistration: true });
  const alice = client(), bob = client(), eve = client();
  let r = await alice('POST', '/api/auth/register', { username: 'alice', password: 'motdepasse', displayName: 'Alice' });
  assert.equal(r.status, 201);
  assert.equal(r.body.user.isAdmin, true, 'le premier compte est admin');
  r = await bob('POST', '/api/auth/register', { username: 'bob', password: 'motdepasse' });
  assert.equal(r.body.user.isAdmin, false);
  await eve('POST', '/api/auth/register', { username: 'eve', password: 'motdepasse' });
  assert.equal((await bob('POST', '/api/auth/register', { username: 'BOB', password: 'motdepasse' })).status, 409);

  r = await alice('POST', '/api/projects', { name: 'App vélo', status: 'active' });
  assert.equal(r.status, 201);
  const pid = r.body.project.id;
  assert.equal(r.body.project.role, 'admin');

  // Non-members can't see it.
  assert.equal((await bob('GET', `/api/projects/${pid}`)).status, 404);

  assert.equal((await alice('POST', `/api/projects/${pid}/members`, { username: 'bob', role: 'member' })).status, 201);
  r = await bob('GET', `/api/projects/${pid}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.project.role, 'member');

  // Members can't edit the project or manage the team.
  assert.equal((await bob('PATCH', `/api/projects/${pid}`, { name: 'Pirate' })).status, 403);
  assert.equal((await bob('POST', `/api/projects/${pid}/members`, { username: 'eve' })).status, 403);

  // ...but they can work on tasks.
  r = await bob('POST', `/api/projects/${pid}/tasks`, { title: 'Écran carte' });
  assert.equal(r.status, 201);
  await alice('POST', `/api/projects/${pid}/tasks`, { title: 'Login' });
  await bob('PATCH', `/api/tasks/${r.body.task.id}`, { status: 'done' });
  r = await alice('GET', '/api/projects');
  assert.equal(r.body.projects[0].progress, 50);

  // Last admin can't be demoted or leave.
  const aliceId = (await alice('GET', '/api/me')).body.user.id;
  assert.equal((await alice('PATCH', `/api/projects/${pid}/members/${aliceId}`, { role: 'member' })).status, 400);
  assert.equal((await alice('DELETE', `/api/projects/${pid}/members/${aliceId}`)).status, 400);

  // Promote bob; then bob can edit.
  const bobId = (await bob('GET', '/api/me')).body.user.id;
  await alice('PATCH', `/api/projects/${pid}/members/${bobId}`, { role: 'admin' });
  assert.equal((await bob('PATCH', `/api/projects/${pid}`, { status: 'paused' })).status, 200);

  // Eve is still an outsider.
  assert.equal((await eve('POST', `/api/projects/${pid}/notes`, { text: 'x' })).status, 404);
  server.close();
});

test('post-it : création, déplacement, vote, conversion en tâche', async (t) => {
  const { server, client } = await setup(t, { allowRegistration: true });
  const a = client();
  await a('POST', '/api/auth/register', { username: 'leo', password: 'motdepasse' });
  const pid = (await a('POST', '/api/projects', { name: 'P' })).body.project.id;
  let r = await a('POST', `/api/projects/${pid}/notes`, { text: 'Mode sombre\nplus de détails', color: 'pink', x: 100, y: 120 });
  assert.equal(r.status, 201);
  const nid = r.body.note.id;
  r = await a('PATCH', `/api/notes/${nid}`, { x: 9999, y: -5, front: true });
  assert.equal(r.body.note.x, 3000);
  assert.equal(r.body.note.y, 0);
  assert.equal((await a('POST', `/api/notes/${nid}/vote`)).body.note.votes, 1);
  assert.equal((await a('POST', `/api/notes/${nid}/vote`)).body.note.votes, 0);
  r = await a('POST', `/api/notes/${nid}/to-task`);
  assert.equal(r.body.task.title, 'Mode sombre');
  assert.equal((await a('PATCH', `/api/notes/${nid}`, { color: 'red' })).status, 400);
  server.close();
});

test('inscriptions fermées : seul le premier compte peut s\'inscrire', async (t) => {
  const { server, client } = await setup(t, { allowRegistration: false });
  const admin = client(), other = client();
  assert.equal((await admin('POST', '/api/auth/register', { username: 'admin', password: 'motdepasse' })).status, 201);
  assert.equal((await other('POST', '/api/auth/register', { username: 'xyz', password: 'motdepasse' })).status, 403);
  assert.equal((await admin('POST', '/api/admin/users', { username: 'xyz', password: 'motdepasse' })).status, 201);
  assert.equal((await other('POST', '/api/auth/login', { username: 'xyz', password: 'motdepasse' })).status, 200);
  assert.equal((await other('POST', '/api/auth/login', { username: 'xyz', password: 'mauvais!!' })).status, 401);
  server.close();
});
