// Accès aux données : Supabase (auth, base Postgres protégée par RLS, temps réel).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm';

const cfg = window.TOOL_PROJ_CONFIG || {};
export const configured = !!(cfg.supabaseUrl && cfg.supabaseKey);
export const allowSignup = cfg.allowSignup !== false;
const sb = configured ? createClient(cfg.supabaseUrl, cfg.supabaseKey) : null;

// Translate Supabase / Postgres errors into messages people can act on.
const MESSAGES = [
  [/Invalid login credentials/i, 'Email ou mot de passe incorrect.'],
  [/Email not confirmed/i, "Ton email n'est pas encore confirmé : clique sur le lien reçu par mail."],
  [/User already registered/i, 'Un compte existe déjà avec cet email.'],
  [/Password should be at least/i, 'Mot de passe : 8 caractères minimum.'],
  [/Signups not allowed/i, 'Les inscriptions sont fermées. Demande à un admin de t\'inviter.'],
  [/rate limit/i, 'Trop de tentatives. Réessaie dans quelques minutes.'],
  [/row-level security|permission denied/i, "Tu n'as pas les droits pour faire ça."],
  [/violates check constraint/i, 'Valeur invalide.'],
  [/Failed to fetch|NetworkError|Load failed/i, 'Pas de connexion. Réessaie quand tu seras en ligne.'],
];
function fail(error) {
  const raw = error?.message || String(error);
  const known = MESSAGES.find(([re]) => re.test(raw));
  throw new Error(known ? known[1] : raw);
}
const ok = ({ data, error }) => { if (error) fail(error); return data; };

// ---------- auth ----------

const profileDto = (p) => p && { id: p.id, username: p.username, displayName: p.display_name };

export async function currentUser() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  const p = ok(await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle());
  return profileDto(p);
}

export function onSignedOut(cb) {
  sb.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') cb(); });
}

export async function signIn(email, password) {
  ok(await sb.auth.signInWithPassword({ email: email.trim(), password }));
  return currentUser();
}

/** Returns the user, or null when Supabase asks to confirm the email first. */
export async function signUp({ email, password, username, displayName }) {
  username = (username || '').trim().toLowerCase().replace(/^@/, '');
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new Error('Identifiant : 3 à 32 caractères, lettres, chiffres, . _ - uniquement.');
  if ((password || '').length < 8) throw new Error('Mot de passe : 8 caractères minimum.');
  if (!ok(await sb.rpc('username_available', { name: username }))) throw new Error('Cet identifiant est déjà pris.');
  const data = ok(await sb.auth.signUp({
    email: email.trim(), password,
    options: { data: { username, display_name: (displayName || '').trim() || username }, emailRedirectTo: location.origin + location.pathname },
  }));
  return data.session ? currentUser() : null;
}

export async function signOut() { await sb.auth.signOut(); }

export async function updateProfile(userId, displayName) {
  return profileDto(ok(await sb.from('profiles').update({ display_name: displayName.trim() }).eq('id', userId).select().single()));
}

export async function changePassword(password) {
  if ((password || '').length < 8) throw new Error('Mot de passe : 8 caractères minimum.');
  ok(await sb.auth.updateUser({ password }));
}

// ---------- projects ----------

function summary(p, me) {
  const tasks = p.tasks || [];
  const total = tasks.length, done = tasks.filter((t) => t.status === 'done').length;
  const members = (p.memberships || []).map((m) => ({ id: m.user_id, role: m.role, displayName: m.profiles?.display_name ?? '?', username: m.profiles?.username ?? '' }))
    .sort((a, b) => (a.role === b.role ? a.displayName.localeCompare(b.displayName) : a.role === 'admin' ? -1 : 1));
  return {
    id: p.id, name: p.name, description: p.description, emoji: p.emoji, color: p.color, status: p.status,
    repoUrl: p.repo_url, dueDate: p.due_date, createdAt: p.created_at, updatedAt: p.updated_at,
    role: members.find((m) => m.id === me)?.role ?? null,
    manualProgress: p.manual_progress,
    progress: total ? Math.round((done / total) * 100) : p.manual_progress,
    tasks: { total, done, doing: tasks.filter((t) => t.status === 'doing').length },
    noteCount: p.notes?.[0]?.count ?? 0,
    members,
  };
}

const PROJECT_SELECT = '*, memberships(role, user_id, profiles(username, display_name)), tasks(status), notes(count)';

export async function listProjects(me) {
  const rows = ok(await sb.from('projects').select(PROJECT_SELECT).order('updated_at', { ascending: false }));
  return rows.map((p) => summary(p, me));
}

const taskDto = (t) => ({ id: t.id, title: t.title, status: t.status, position: t.position, assigneeId: t.assignee_id, createdAt: t.created_at, doneAt: t.done_at });
const noteDto = (n, me) => ({
  id: n.id, text: n.text, color: n.color, x: n.x, y: n.y, z: n.z, createdBy: n.created_by,
  author: n.author?.display_name ?? null, createdAt: n.created_at, updatedAt: n.updated_at,
  votes: n.note_votes.length, voted: n.note_votes.some((v) => v.user_id === me),
});

export async function getProject(id, me) {
  const [p, tasks, notes, activity] = await Promise.all([
    sb.from('projects').select(PROJECT_SELECT).eq('id', id).maybeSingle().then(ok),
    sb.from('tasks').select('*').eq('project_id', id).order('position').order('id').then(ok),
    sb.from('notes').select('*, author:profiles!notes_created_by_fkey(display_name), note_votes(user_id)').eq('project_id', id).order('z').order('id').then(ok),
    sb.from('activity').select('id, message, created_at, profiles(display_name)').eq('project_id', id).order('id', { ascending: false }).limit(30).then(ok),
  ]);
  if (!p) throw new Error('Projet introuvable.');
  const project = summary(p, me);
  return {
    project,
    members: project.members,
    tasks: tasks.map(taskDto),
    notes: notes.map((n) => noteDto(n, me)),
    activity: activity.map((a) => ({ id: a.id, message: a.message, createdAt: a.created_at, user: a.profiles?.display_name })),
  };
}

export async function createProject(f) {
  return ok(await sb.rpc('create_project', { p_name: f.name, p_description: f.description || '', p_emoji: f.emoji || '🚀', p_color: f.color, p_status: f.status }));
}

export async function updateProject(id, f) {
  const row = {};
  if (f.name !== undefined) row.name = f.name.trim();
  if (f.description !== undefined) row.description = f.description.trim();
  if (f.emoji !== undefined) row.emoji = f.emoji.trim() || '🚀';
  if (f.color !== undefined) row.color = f.color;
  if (f.status !== undefined) row.status = f.status;
  if (f.manualProgress !== undefined) row.manual_progress = Math.max(0, Math.min(100, Math.round(Number(f.manualProgress) || 0)));
  if (f.repoUrl !== undefined) {
    row.repo_url = f.repoUrl.trim();
    if (row.repo_url && !/^https?:\/\//i.test(row.repo_url)) throw new Error('Le lien doit commencer par http:// ou https://');
  }
  if (f.dueDate !== undefined) row.due_date = f.dueDate || null;
  const data = ok(await sb.from('projects').update(row).eq('id', id).select('id'));
  if (!data.length) throw new Error("Tu n'as pas les droits pour modifier ce projet.");
}

export async function deleteProject(id) {
  const data = ok(await sb.from('projects').delete().eq('id', id).select('id'));
  if (!data.length) throw new Error("Tu n'as pas les droits pour supprimer ce projet.");
}

// ---------- members ----------

export async function addMember(pid, username, role) { ok(await sb.rpc('add_member', { p_project: pid, p_username: username, p_role: role })); }
export async function setRole(pid, userId, role) { ok(await sb.from('memberships').update({ role }).eq('project_id', pid).eq('user_id', userId)); }
export async function removeMember(pid, userId) { ok(await sb.from('memberships').delete().eq('project_id', pid).eq('user_id', userId)); }

export async function searchUsers(term) {
  const q = term.replace(/[%_,()]/g, '');
  const rows = ok(await sb.from('profiles').select('*').or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).order('display_name').limit(10));
  return rows.map(profileDto);
}

// ---------- tasks ----------

export async function addTask(pid, { title, status = 'todo' }, tasks) {
  const position = Math.max(0, ...tasks.map((t) => t.position)) + 1;
  ok(await sb.from('tasks').insert({ project_id: pid, title: title.trim().slice(0, 200), status, position }));
}

export async function updateTask(id, f) {
  const row = {};
  if (f.title !== undefined) row.title = f.title.trim();
  if (f.status !== undefined) row.status = f.status;
  if (f.position !== undefined) row.position = f.position;
  if (f.assigneeId !== undefined) row.assignee_id = f.assigneeId || null;
  ok(await sb.from('tasks').update(row).eq('id', id));
}

export async function deleteTask(id) { ok(await sb.from('tasks').delete().eq('id', id)); }

// ---------- notes ----------

const clamp = (v) => Math.max(0, Math.min(3000, Math.round(Number(v) || 0)));
const topZ = (notes) => Math.max(0, ...notes.map((n) => n.z)) + 1;

export async function addNote(pid, { text, color, x, y }, notes) {
  ok(await sb.from('notes').insert({ project_id: pid, text: text.trim(), color, x: clamp(x), y: clamp(y), z: topZ(notes) }));
}

export async function updateNote(id, f, notes) {
  const row = {};
  if (f.text !== undefined) row.text = f.text.trim();
  if (f.color !== undefined) row.color = f.color;
  if (f.x !== undefined) row.x = clamp(f.x);
  if (f.y !== undefined) row.y = clamp(f.y);
  if (f.front) row.z = topZ(notes);
  ok(await sb.from('notes').update(row).eq('id', id));
  return row;
}

export async function deleteNote(id) { ok(await sb.from('notes').delete().eq('id', id)); }

export async function toggleVote(note, me) {
  if (note.voted) ok(await sb.from('note_votes').delete().eq('note_id', note.id).eq('user_id', me));
  else ok(await sb.from('note_votes').insert({ note_id: note.id }));
}

/** Turns an idea into a task; the post-it stays on the wall. */
export async function noteToTask(pid, note, tasks) {
  const title = note.text.split('\n')[0].trim().slice(0, 200) || 'Idée sans titre';
  await addTask(pid, { title }, tasks);
  return title;
}

// ---------- realtime ----------

/** Calls onChange whenever teammates change something in the project. Returns an unsubscribe function. */
export function subscribeProject(pid, onChange) {
  const ch = sb.channel(`project-${pid}`);
  for (const table of ['tasks', 'notes', 'memberships']) {
    ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `project_id=eq.${pid}` }, onChange);
  }
  ch.on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${pid}` }, onChange);
  ch.on('postgres_changes', { event: '*', schema: 'public', table: 'note_votes' }, onChange);
  ch.subscribe();
  return () => sb.removeChannel(ch);
}
