import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tx } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_DAYS = 30;
const COOKIE = 'tp_session';
const STATUSES = ['idea', 'active', 'paused', 'done'];
const STATUS_LABELS = { idea: 'Idée', active: 'En cours', paused: 'En pause', done: 'Terminé' };
const TASK_STATUSES = ['todo', 'doing', 'done'];
const NOTE_COLORS = ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'];

// ---------- helpers ----------

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [, saltHex, hashHex] = stored.split('$');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function str(v, { max = 200, min = 0, field = 'champ' } = {}) {
  if (typeof v !== 'string') v = v == null ? '' : String(v);
  v = v.trim();
  if (v.length < min) fail(400, `${field} : ${min} caractère(s) minimum`);
  if (v.length > max) fail(400, `${field} : ${max} caractères maximum`);
  return v;
}

function int(v, field = 'id') {
  const n = Number(v);
  if (!Number.isInteger(n)) fail(400, `${field} invalide`);
  return n;
}

const publicUser = (u) => u && { id: u.id, username: u.username, displayName: u.display_name, isAdmin: !!u.is_admin };

// ---------- app ----------

export function createApp(db, { allowRegistration = process.env.ALLOW_REGISTRATION !== 'false', secureCookies = process.env.NODE_ENV === 'production' } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '200kb' }));

  const q = (sql) => db.prepare(sql);

  function log(projectId, userId, message) {
    q('INSERT INTO activity (project_id, user_id, message) VALUES (?, ?, ?)').run(projectId, userId, message);
    q("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(projectId);
  }

  function startSession(res, userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + SESSION_DAYS * 864e5;
    q('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
    res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secureCookies ? '; Secure' : ''}`);
  }

  // Auth middleware: attach req.user when a valid session cookie is present.
  app.use((req, _res, next) => {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    if (token) {
      const row = q('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?').get(token, Date.now());
      if (row) { req.user = row; req.sessionToken = token; }
    }
    next();
  });

  const requireUser = (req, _res, next) => (req.user ? next() : next(new HttpError(401, 'Connexion requise')));

  /** Returns the project + caller's role, or throws 404/403. */
  function access(req, projectId, needAdmin = false) {
    const p = q('SELECT * FROM projects WHERE id = ?').get(projectId);
    if (!p) fail(404, 'Projet introuvable');
    const m = q('SELECT role FROM memberships WHERE project_id = ? AND user_id = ?').get(projectId, req.user.id);
    const role = m?.role ?? (req.user.is_admin ? 'admin' : null);
    if (!role) fail(404, 'Projet introuvable');
    if (needAdmin && role !== 'admin') fail(403, 'Réservé aux admins du projet');
    return { project: p, role };
  }

  function projectSummary(p, role) {
    const c = q(`SELECT COUNT(*) AS total, SUM(status = 'done') AS done, SUM(status = 'doing') AS doing FROM tasks WHERE project_id = ?`).get(p.id);
    const notes = q('SELECT COUNT(*) AS n FROM notes WHERE project_id = ?').get(p.id).n;
    const members = q(`SELECT u.id, u.display_name AS displayName FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.project_id = ? ORDER BY m.role, u.display_name`).all(p.id);
    const total = c.total || 0, done = c.done || 0;
    return {
      id: p.id, name: p.name, description: p.description, emoji: p.emoji, color: p.color,
      status: p.status, repoUrl: p.repo_url, dueDate: p.due_date,
      createdAt: p.created_at, updatedAt: p.updated_at, role,
      manualProgress: p.manual_progress,
      progress: total ? Math.round((done / total) * 100) : p.manual_progress,
      tasks: { total, done, doing: c.doing || 0 },
      noteCount: notes, members,
    };
  }

  const noteDto = (n, userId) => {
    const votes = q('SELECT user_id FROM note_votes WHERE note_id = ?').all(n.id).map((r) => r.user_id);
    return {
      id: n.id, text: n.text, color: n.color, x: n.x, y: n.y, z: n.z,
      createdBy: n.created_by, author: n.author ?? null, createdAt: n.created_at, updatedAt: n.updated_at,
      votes: votes.length, voted: votes.includes(userId),
    };
  };

  const taskDto = (t) => ({
    id: t.id, title: t.title, status: t.status, position: t.position,
    assigneeId: t.assignee_id, createdAt: t.created_at, doneAt: t.done_at,
  });

  // ---------- auth ----------

  app.get('/api/config', (_req, res) => {
    const hasUsers = !!q('SELECT 1 FROM users LIMIT 1').get();
    res.json({ allowRegistration: allowRegistration || !hasUsers });
  });

  app.post('/api/auth/register', (req, res) => {
    const hasUsers = !!q('SELECT 1 FROM users LIMIT 1').get();
    if (hasUsers && !allowRegistration) fail(403, 'Les inscriptions sont fermées. Demande un compte à un admin.');
    const username = str(req.body.username, { min: 3, max: 32, field: 'Identifiant' }).toLowerCase();
    if (!/^[a-z0-9._-]+$/.test(username)) fail(400, 'Identifiant : lettres, chiffres, . _ - uniquement');
    const displayName = str(req.body.displayName || username, { min: 1, max: 60, field: 'Nom' });
    const password = String(req.body.password ?? '');
    if (password.length < 8) fail(400, 'Mot de passe : 8 caractères minimum');
    if (q('SELECT 1 FROM users WHERE username = ?').get(username)) fail(409, 'Cet identifiant est déjà pris');
    // The very first account becomes the instance admin.
    const r = q('INSERT INTO users (username, display_name, password_hash, is_admin) VALUES (?, ?, ?, ?)').run(username, displayName, hashPassword(password), hasUsers ? 0 : 1);
    startSession(res, r.lastInsertRowid);
    res.status(201).json({ user: publicUser(q('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid)) });
  });

  app.post('/api/auth/login', (req, res) => {
    const username = str(req.body.username, { max: 32 }).toLowerCase();
    const u = q('SELECT * FROM users WHERE username = ?').get(username);
    if (!u || !verifyPassword(String(req.body.password ?? ''), u.password_hash)) fail(401, 'Identifiant ou mot de passe incorrect');
    q('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    startSession(res, u.id);
    res.json({ user: publicUser(u) });
  });

  app.post('/api/auth/logout', (req, res) => {
    if (req.sessionToken) q('DELETE FROM sessions WHERE token = ?').run(req.sessionToken);
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    res.json({ ok: true });
  });

  app.get('/api/me', requireUser, (req, res) => res.json({ user: publicUser(req.user) }));

  app.patch('/api/me', requireUser, (req, res) => {
    if (req.body.displayName !== undefined) {
      q('UPDATE users SET display_name = ? WHERE id = ?').run(str(req.body.displayName, { min: 1, max: 60, field: 'Nom' }), req.user.id);
    }
    if (req.body.newPassword !== undefined) {
      if (!verifyPassword(String(req.body.currentPassword ?? ''), req.user.password_hash)) fail(400, 'Mot de passe actuel incorrect');
      if (String(req.body.newPassword).length < 8) fail(400, 'Mot de passe : 8 caractères minimum');
      q('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(String(req.body.newPassword)), req.user.id);
      q('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(req.user.id, req.sessionToken);
    }
    res.json({ user: publicUser(q('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
  });

  // Instance admin: create accounts (useful when registration is closed).
  app.post('/api/admin/users', requireUser, (req, res) => {
    if (!req.user.is_admin) fail(403, 'Réservé aux administrateurs');
    const username = str(req.body.username, { min: 3, max: 32, field: 'Identifiant' }).toLowerCase();
    if (!/^[a-z0-9._-]+$/.test(username)) fail(400, 'Identifiant : lettres, chiffres, . _ - uniquement');
    const password = String(req.body.password ?? '');
    if (password.length < 8) fail(400, 'Mot de passe : 8 caractères minimum');
    if (q('SELECT 1 FROM users WHERE username = ?').get(username)) fail(409, 'Cet identifiant est déjà pris');
    const displayName = str(req.body.displayName || username, { min: 1, max: 60, field: 'Nom' });
    const r = q('INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)').run(username, displayName, hashPassword(password));
    res.status(201).json({ user: publicUser(q('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid)) });
  });

  app.get('/api/users', requireUser, (req, res) => {
    const term = `%${str(req.query.q, { max: 60 })}%`;
    const rows = q('SELECT * FROM users WHERE username LIKE ? OR display_name LIKE ? ORDER BY display_name LIMIT 10').all(term, term);
    res.json({ users: rows.map(publicUser) });
  });

  // ---------- projects ----------

  app.get('/api/projects', requireUser, (req, res) => {
    const rows = q(`SELECT p.*, m.role FROM projects p JOIN memberships m ON m.project_id = p.id AND m.user_id = ? ORDER BY p.updated_at DESC`).all(req.user.id);
    res.json({ projects: rows.map((p) => projectSummary(p, p.role)) });
  });

  function readProjectFields(body, partial) {
    const f = {};
    if (!partial || body.name !== undefined) f.name = str(body.name, { min: 1, max: 80, field: 'Nom du projet' });
    if (body.description !== undefined) f.description = str(body.description, { max: 2000, field: 'Description' });
    if (body.emoji !== undefined) f.emoji = str(body.emoji, { max: 16, field: 'Emoji' }) || '🚀';
    if (body.color !== undefined) {
      if (!/^#[0-9a-fA-F]{6}$/.test(body.color)) fail(400, 'Couleur invalide');
      f.color = body.color;
    }
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) fail(400, 'Statut invalide');
      f.status = body.status;
    }
    if (body.manualProgress !== undefined) f.manual_progress = Math.max(0, Math.min(100, Math.round(Number(body.manualProgress) || 0)));
    if (body.repoUrl !== undefined) {
      const url = str(body.repoUrl, { max: 300, field: 'Lien' });
      if (url && !/^https?:\/\//i.test(url)) fail(400, 'Le lien doit commencer par http:// ou https://');
      f.repo_url = url;
    }
    if (body.dueDate !== undefined) {
      if (body.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)) fail(400, 'Date invalide');
      f.due_date = body.dueDate || null;
    }
    return f;
  }

  app.post('/api/projects', requireUser, (req, res) => {
    const f = readProjectFields(req.body, false);
    const id = tx(db, () => {
      const cols = Object.keys(f);
      const r = q(`INSERT INTO projects (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...Object.values(f));
      q("INSERT INTO memberships (project_id, user_id, role) VALUES (?, ?, 'admin')").run(r.lastInsertRowid, req.user.id);
      log(r.lastInsertRowid, req.user.id, 'a créé le projet');
      return r.lastInsertRowid;
    });
    res.status(201).json({ project: projectSummary(q('SELECT * FROM projects WHERE id = ?').get(id), 'admin') });
  });

  app.get('/api/projects/:id', requireUser, (req, res) => {
    const id = int(req.params.id);
    const { project, role } = access(req, id);
    const members = q(`SELECT u.id, u.username, u.display_name AS displayName, m.role FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.project_id = ? ORDER BY m.role, u.display_name`).all(id);
    const tasks = q('SELECT * FROM tasks WHERE project_id = ? ORDER BY position, id').all(id).map(taskDto);
    const notes = q('SELECT n.*, u.display_name AS author FROM notes n LEFT JOIN users u ON u.id = n.created_by WHERE n.project_id = ? ORDER BY n.z, n.id').all(id).map((n) => noteDto(n, req.user.id));
    const activity = q('SELECT a.id, a.message, a.created_at AS createdAt, u.display_name AS user FROM activity a LEFT JOIN users u ON u.id = a.user_id WHERE a.project_id = ? ORDER BY a.id DESC LIMIT 30').all(id);
    res.json({ project: projectSummary(project, role), members, tasks, notes, activity });
  });

  app.patch('/api/projects/:id', requireUser, (req, res) => {
    const id = int(req.params.id);
    const { project, role } = access(req, id, true);
    const f = readProjectFields(req.body, true);
    const cols = Object.keys(f);
    if (cols.length) {
      q(`UPDATE projects SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(...Object.values(f), id);
      if (f.status && f.status !== project.status) log(id, req.user.id, `a passé le projet en « ${STATUS_LABELS[f.status]} »`);
      else log(id, req.user.id, 'a modifié le projet');
    }
    res.json({ project: projectSummary(q('SELECT * FROM projects WHERE id = ?').get(id), role) });
  });

  app.delete('/api/projects/:id', requireUser, (req, res) => {
    const id = int(req.params.id);
    access(req, id, true);
    q('DELETE FROM projects WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  // ---------- members ----------

  const adminCount = (pid) => q("SELECT COUNT(*) AS n FROM memberships WHERE project_id = ? AND role = 'admin'").get(pid).n;

  app.post('/api/projects/:id/members', requireUser, (req, res) => {
    const id = int(req.params.id);
    access(req, id, true);
    const role = req.body.role === 'admin' ? 'admin' : 'member';
    const u = q('SELECT * FROM users WHERE username = ?').get(str(req.body.username, { max: 32 }).toLowerCase());
    if (!u) fail(404, 'Aucun compte avec cet identifiant');
    if (q('SELECT 1 FROM memberships WHERE project_id = ? AND user_id = ?').get(id, u.id)) fail(409, 'Déjà membre du projet');
    q('INSERT INTO memberships (project_id, user_id, role) VALUES (?, ?, ?)').run(id, u.id, role);
    log(id, req.user.id, `a ajouté ${u.display_name} (${role === 'admin' ? 'admin' : 'membre'})`);
    res.status(201).json({ ok: true });
  });

  app.patch('/api/projects/:id/members/:userId', requireUser, (req, res) => {
    const id = int(req.params.id), userId = int(req.params.userId);
    access(req, id, true);
    const role = req.body.role === 'admin' ? 'admin' : 'member';
    const m = q('SELECT m.role, u.display_name FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.project_id = ? AND m.user_id = ?').get(id, userId);
    if (!m) fail(404, 'Membre introuvable');
    if (m.role === 'admin' && role === 'member' && adminCount(id) <= 1) fail(400, 'Il faut au moins un admin sur le projet');
    q('UPDATE memberships SET role = ? WHERE project_id = ? AND user_id = ?').run(role, id, userId);
    log(id, req.user.id, `a passé ${m.display_name} en ${role === 'admin' ? 'admin' : 'membre'}`);
    res.json({ ok: true });
  });

  app.delete('/api/projects/:id/members/:userId', requireUser, (req, res) => {
    const id = int(req.params.id), userId = int(req.params.userId);
    // Anyone can leave; only admins can remove others.
    access(req, id, userId !== req.user.id);
    const m = q('SELECT m.role, u.display_name FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.project_id = ? AND m.user_id = ?').get(id, userId);
    if (!m) fail(404, 'Membre introuvable');
    if (m.role === 'admin' && adminCount(id) <= 1) fail(400, 'Il faut au moins un admin sur le projet');
    q('DELETE FROM memberships WHERE project_id = ? AND user_id = ?').run(id, userId);
    q('UPDATE tasks SET assignee_id = NULL WHERE project_id = ? AND assignee_id = ?').run(id, userId);
    log(id, req.user.id, userId === req.user.id ? 'a quitté le projet' : `a retiré ${m.display_name}`);
    res.json({ ok: true });
  });

  // ---------- tasks ----------

  function checkAssignee(projectId, assigneeId) {
    if (assigneeId == null || assigneeId === '') return null;
    const aid = int(assigneeId, 'assignee');
    if (!q('SELECT 1 FROM memberships WHERE project_id = ? AND user_id = ?').get(projectId, aid)) fail(400, "La personne assignée n'est pas membre du projet");
    return aid;
  }

  app.post('/api/projects/:id/tasks', requireUser, (req, res) => {
    const id = int(req.params.id);
    access(req, id);
    const title = str(req.body.title, { min: 1, max: 200, field: 'Tâche' });
    const status = TASK_STATUSES.includes(req.body.status) ? req.body.status : 'todo';
    const pos = (q('SELECT MAX(position) AS p FROM tasks WHERE project_id = ?').get(id).p ?? 0) + 1;
    const r = q('INSERT INTO tasks (project_id, title, status, position, assignee_id, created_by, done_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, title, status, pos, checkAssignee(id, req.body.assigneeId), req.user.id, status === 'done' ? new Date().toISOString() : null);
    log(id, req.user.id, `a ajouté la tâche « ${title} »`);
    res.status(201).json({ task: taskDto(q('SELECT * FROM tasks WHERE id = ?').get(r.lastInsertRowid)) });
  });

  app.patch('/api/tasks/:id', requireUser, (req, res) => {
    const t = q('SELECT * FROM tasks WHERE id = ?').get(int(req.params.id));
    if (!t) fail(404, 'Tâche introuvable');
    access(req, t.project_id);
    const f = {};
    if (req.body.title !== undefined) f.title = str(req.body.title, { min: 1, max: 200, field: 'Tâche' });
    if (req.body.status !== undefined) {
      if (!TASK_STATUSES.includes(req.body.status)) fail(400, 'Statut invalide');
      f.status = req.body.status;
      f.done_at = req.body.status === 'done' ? (t.done_at ?? new Date().toISOString()) : null;
    }
    if (req.body.position !== undefined) f.position = Number(req.body.position) || 0;
    if (req.body.assigneeId !== undefined) f.assignee_id = checkAssignee(t.project_id, req.body.assigneeId);
    const cols = Object.keys(f);
    if (cols.length) q(`UPDATE tasks SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(...Object.values(f), t.id);
    if (f.status && f.status !== t.status) {
      const verb = { todo: 'a remis à faire', doing: 'a commencé', done: 'a terminé' }[f.status];
      log(t.project_id, req.user.id, `${verb} « ${f.title ?? t.title} »`);
    } else {
      q("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(t.project_id);
    }
    res.json({ task: taskDto(q('SELECT * FROM tasks WHERE id = ?').get(t.id)) });
  });

  app.delete('/api/tasks/:id', requireUser, (req, res) => {
    const t = q('SELECT * FROM tasks WHERE id = ?').get(int(req.params.id));
    if (!t) fail(404, 'Tâche introuvable');
    access(req, t.project_id);
    q('DELETE FROM tasks WHERE id = ?').run(t.id);
    log(t.project_id, req.user.id, `a supprimé la tâche « ${t.title} »`);
    res.json({ ok: true });
  });

  // ---------- notes (post-it) ----------

  const getNote = (req) => {
    const n = q('SELECT n.*, u.display_name AS author FROM notes n LEFT JOIN users u ON u.id = n.created_by WHERE n.id = ?').get(int(req.params.id));
    if (!n) fail(404, 'Post-it introuvable');
    access(req, n.project_id);
    return n;
  };
  const clampPos = (v) => Math.max(0, Math.min(3000, Number(v) || 0));

  app.post('/api/projects/:id/notes', requireUser, (req, res) => {
    const id = int(req.params.id);
    access(req, id);
    const text = str(req.body.text, { max: 1000, field: 'Post-it' });
    const color = NOTE_COLORS.includes(req.body.color) ? req.body.color : 'yellow';
    const z = (q('SELECT MAX(z) AS z FROM notes WHERE project_id = ?').get(id).z ?? 0) + 1;
    const r = q('INSERT INTO notes (project_id, text, color, x, y, z, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, text, color, clampPos(req.body.x ?? 40), clampPos(req.body.y ?? 40), z, req.user.id);
    log(id, req.user.id, 'a collé un post-it');
    res.status(201).json({ note: noteDto(getNote({ ...req, params: { id: r.lastInsertRowid } }), req.user.id) });
  });

  app.patch('/api/notes/:id', requireUser, (req, res) => {
    const n = getNote(req);
    const f = {};
    if (req.body.text !== undefined) f.text = str(req.body.text, { max: 1000, field: 'Post-it' });
    if (req.body.color !== undefined) {
      if (!NOTE_COLORS.includes(req.body.color)) fail(400, 'Couleur invalide');
      f.color = req.body.color;
    }
    if (req.body.x !== undefined) f.x = clampPos(req.body.x);
    if (req.body.y !== undefined) f.y = clampPos(req.body.y);
    if (req.body.front) f.z = (q('SELECT MAX(z) AS z FROM notes WHERE project_id = ?').get(n.project_id).z ?? 0) + 1;
    const cols = Object.keys(f);
    if (cols.length) q(`UPDATE notes SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...Object.values(f), n.id);
    res.json({ note: noteDto(getNote(req), req.user.id) });
  });

  app.delete('/api/notes/:id', requireUser, (req, res) => {
    const n = getNote(req);
    q('DELETE FROM notes WHERE id = ?').run(n.id);
    log(n.project_id, req.user.id, 'a décollé un post-it');
    res.json({ ok: true });
  });

  app.post('/api/notes/:id/vote', requireUser, (req, res) => {
    const n = getNote(req);
    const had = q('SELECT 1 FROM note_votes WHERE note_id = ? AND user_id = ?').get(n.id, req.user.id);
    if (had) q('DELETE FROM note_votes WHERE note_id = ? AND user_id = ?').run(n.id, req.user.id);
    else q('INSERT INTO note_votes (note_id, user_id) VALUES (?, ?)').run(n.id, req.user.id);
    res.json({ note: noteDto(n, req.user.id) });
  });

  // Turn an idea into a task (the post-it is kept, so the board stays intact).
  app.post('/api/notes/:id/to-task', requireUser, (req, res) => {
    const n = getNote(req);
    const title = n.text.split('\n')[0].trim().slice(0, 200) || 'Idée sans titre';
    const pos = (q('SELECT MAX(position) AS p FROM tasks WHERE project_id = ?').get(n.project_id).p ?? 0) + 1;
    const r = q('INSERT INTO tasks (project_id, title, position, created_by) VALUES (?, ?, ?, ?)').run(n.project_id, title, pos, req.user.id);
    log(n.project_id, req.user.id, `a transformé un post-it en tâche « ${title} »`);
    res.status(201).json({ task: taskDto(q('SELECT * FROM tasks WHERE id = ?').get(r.lastInsertRowid)) });
  });

  // ---------- static + errors ----------

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Route inconnue')));
  app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders(res, file) {
      if (file.endsWith('sw.js') || file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  }));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Erreur serveur' : err.message });
  });

  return app;
}
