// Accès aux données : Supabase (auth, base Postgres protégée par RLS, temps réel).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm';

const cfg = window.TOOL_PROJ_CONFIG || {};
export const configured = !!(cfg.supabaseUrl && cfg.supabaseKey);
export const allowSignup = cfg.allowSignup !== false;
// An expired or reused email link comes back with the error in the URL hash; read it before Supabase clears it.
const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
const sb = configured ? createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { flowType: 'implicit' } }) : null;

// Translate Supabase / Postgres errors into messages people can act on.
const MESSAGES = [
  [/tasks_type_check/i, "Le type « Idée » demande la mise à jour de la base : relance supabase/schema.sql dans le SQL Editor (tes données sont conservées)."],
  [/PGRST20[45]|42P01|42703|schema cache|does not exist.*(epics|description|priority)|relation "public\.(epics|project_links)"/i, "La base Supabase n'est pas à jour : relance le script supabase/schema.sql dans le SQL Editor (tes données sont conservées)."],
  [/email_provider_disabled|Email logins are disabled/i, 'La connexion par email est désactivée dans Supabase (Authentication → Sign In / Providers → Email).'],
  [/Signups not allowed|otp_disabled/i, "Aucun compte avec cet email. Demande à un admin de t'inviter."],
  [/expired|invalid.*(token|otp|link)|(token|otp|link).*invalid/i, 'Ce code ou ce lien a expiré ou a déjà servi. Demande-en un nouveau.'],
  [/only request this after|over_email_send_rate_limit|rate limit/i, "Trop d'emails demandés. Attends un peu avant de réessayer."],
  [/passkey_disabled|Passkeys are disabled/i, "Les clés d'accès ne sont pas activées dans Supabase (voir le README)."],
  [/CEREMONY_ABORTED|NotAllowedError|not allowed|timed out|cancel/i, "Clé d'accès annulée, ou aucune clé pour ce site sur cet appareil."],
  [/passkey.*not found|credential.*not found|webauthn_credential/i, "Cette clé d'accès n'est plus reconnue. Connecte-toi par email puis recrée-la."],
  [/duplicate key.*username|profiles_username_key/i, 'Cet identifiant est déjà pris.'],
  [/profiles_username_check/i, 'Identifiant : 3 à 32 caractères, lettres minuscules, chiffres, . _ - uniquement.'],
  [/row-level security|permission denied/i, "Tu n'as pas les droits pour faire ça."],
  [/violates check constraint/i, 'Valeur invalide.'],
  [/Failed to fetch|NetworkError|Load failed/i, 'Pas de connexion. Réessaie quand tu seras en ligne.'],
];
function translate(error) {
  const raw = [error?.code, error?.name, error?.message || String(error)].filter(Boolean).join(' ');
  const known = MESSAGES.find(([re]) => re.test(raw));
  return known ? known[1] : error?.message || String(error);
}
function fail(error) { throw new Error(translate(error)); }
const ok = ({ data, error }) => { if (error) fail(error); return data; };

// ---------- auth (no passwords: email link / code, or passkey) ----------

/** Message to show when the user arrives from an email link that no longer works. */
export const urlAuthError = hashParams.get('error_description') ? translate({ code: hashParams.get('error_code'), message: hashParams.get('error_description') }) : '';

const profileDto = (p, user) => p && {
  id: p.id, username: p.username, displayName: p.display_name,
  avatarEmoji: p.avatar_emoji || '', avatarColor: p.avatar_color || '',
  onboarded: user?.user_metadata?.onboarded === true,
};

export async function currentUser() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  const p = ok(await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle());
  return profileDto(p, session.user);
}

/** Notifies sign-in / sign-out, including from another tab (e.g. the email link opened in a new tab). */
export function onAuth(cb) {
  sb.auth.onAuthStateChange((event) => { if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setTimeout(() => cb(event), 0); });
}

const redirectTo = () => location.origin + location.pathname;

/** Emails a sign-in link (and a code, if the email template includes it). Creates the account on first use. */
export async function sendEmailLink(email) {
  email = (email || '').trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Adresse email invalide.');
  ok(await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: allowSignup, emailRedirectTo: redirectTo() } }));
}

export async function verifyEmailCode(email, code) {
  ok(await sb.auth.verifyOtp({ email: email.trim(), token: code.replace(/\s/g, ''), type: 'email' }));
  return currentUser();
}

export const passkeysSupported = () => !!window.PublicKeyCredential && window.isSecureContext;

export async function signInWithPasskey() {
  ok(await sb.auth.signInWithPasskey());
  return currentUser();
}

function deviceName() {
  const ua = navigator.userAgent;
  const device = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android'
    : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Appareil';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  return browser ? `${device} · ${browser}` : device;
}

/** Creates a passkey for the signed-in user on this device. */
export async function addPasskey() {
  const created = ok(await sb.auth.registerPasskey());
  if (created?.id) await sb.auth.passkey.update({ passkeyId: created.id, friendlyName: deviceName() }).catch(() => {});
}

export async function listPasskeys() { return ok(await sb.auth.passkey.list()) || []; }
export async function deletePasskey(id) { ok(await sb.auth.passkey.delete({ passkeyId: id })); }

export async function signOut() { await sb.auth.signOut(); }

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;

export async function updateProfile(userId, { displayName, username, avatarEmoji, avatarColor }) {
  const row = { display_name: (displayName || '').trim() };
  if (!row.display_name) throw new Error('Choisis un nom affiché.');
  if (avatarEmoji !== undefined) row.avatar_emoji = avatarEmoji || null;
  if (avatarColor !== undefined) row.avatar_color = avatarColor || null;
  if (username !== undefined) {
    row.username = username.trim().toLowerCase().replace(/^@/, '');
    if (!USERNAME_RE.test(row.username)) throw new Error('Identifiant : 3 à 32 caractères, lettres minuscules, chiffres, . _ - uniquement.');
  }
  const p = ok(await sb.from('profiles').update(row).eq('id', userId).select().single());
  const { data: { user } } = await sb.auth.getUser();
  return profileDto(p, user);
}

/** Saves the first-login choices (name, username) and remembers that the welcome step is done. */
export async function completeOnboarding(userId, fields) {
  await updateProfile(userId, fields);
  ok(await sb.auth.updateUser({ data: { onboarded: true } }));
  return currentUser();
}

// ---------- projects ----------

function summary(p, me) {
  const tasks = p.tasks || [];
  const total = tasks.length, done = tasks.filter((t) => t.status === 'done').length;
  const members = (p.memberships || []).map((m) => ({
    id: m.user_id, role: m.role, displayName: m.profiles?.display_name ?? '?', username: m.profiles?.username ?? '',
    avatarEmoji: m.profiles?.avatar_emoji || '', avatarColor: m.profiles?.avatar_color || '',
  }))
    .sort((a, b) => (a.role === b.role ? a.displayName.localeCompare(b.displayName) : a.role === 'admin' ? -1 : 1));
  return {
    id: p.id, name: p.name, description: p.description, emoji: p.emoji, color: p.color, status: p.status,
    taskStyle: p.task_style || 'classic', typeColors: p.type_colors || {},
    dueDate: p.due_date, createdAt: p.created_at, updatedAt: p.updated_at,
    role: members.find((m) => m.id === me)?.role ?? null,
    manualProgress: p.manual_progress,
    progress: p.manual_progress, // set by admins: upcoming tasks shouldn't make the project look less advanced
    tasks: { total, done, doing: tasks.filter((t) => t.status === 'doing').length },
    noteCount: p.notes?.[0]?.count ?? 0,
    members,
  };
}

const PROJECT_SELECT = '*, memberships(role, user_id, profiles(*)), tasks(status), notes(count)';

export async function listProjects(me) {
  const rows = ok(await sb.from('projects').select(PROJECT_SELECT).order('updated_at', { ascending: false }));
  return rows.map((p) => summary(p, me));
}

const taskDto = (t) => ({
  id: t.id, title: t.title, description: t.description ?? '', status: t.status, type: t.type ?? 'task', priority: t.priority ?? 'normal',
  epicId: t.epic_id ?? null, position: t.position, assigneeId: t.assignee_id, createdAt: t.created_at, doneAt: t.done_at,
});
const linkDto = (l) => ({ id: l.id, label: l.label, url: l.url, position: l.position });
const epicDto = (e) => ({ id: e.id, title: e.title, description: e.description, horizon: e.horizon, position: e.position, createdAt: e.created_at });
const noteDto = (n, me) => ({
  id: n.id, text: n.text, color: n.color, x: n.x, y: n.y, z: n.z, createdBy: n.created_by,
  author: n.author?.display_name ?? null, createdAt: n.created_at, updatedAt: n.updated_at,
  votes: n.note_votes.length, voted: n.note_votes.some((v) => v.user_id === me),
});

export async function getProject(id, me) {
  const [p, tasks, epics, links, notes, activity] = await Promise.all([
    sb.from('projects').select(PROJECT_SELECT).eq('id', id).maybeSingle().then(ok),
    sb.from('tasks').select('*').eq('project_id', id).order('position').order('id').then(ok),
    sb.from('epics').select('*').eq('project_id', id).order('position').order('id').then(ok),
    sb.from('project_links').select('*').eq('project_id', id).order('position').order('id').then(ok),
    sb.from('notes').select('*, author:profiles!notes_created_by_fkey(display_name), note_votes(user_id)').eq('project_id', id).order('z').order('id').then(ok),
    sb.from('activity').select('id, message, created_at, profiles(display_name)').eq('project_id', id).order('id', { ascending: false }).limit(30).then(ok),
  ]);
  if (!p) throw new Error('Projet introuvable.');
  const project = summary(p, me);
  return {
    project,
    members: project.members,
    tasks: tasks.map(taskDto),
    epics: epics.map(epicDto),
    links: links.map(linkDto),
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
  if (f.dueDate !== undefined) row.due_date = f.dueDate || null;
  if (f.taskStyle !== undefined) row.task_style = f.taskStyle;
  if (f.typeColors !== undefined) row.type_colors = f.typeColors;
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
  return rows.map((r) => profileDto(r));
}

// ---------- tasks ----------

function taskRow(f) {
  const row = {};
  if (f.title !== undefined) { row.title = f.title.trim().slice(0, 200); if (!row.title) throw new Error('Donne un titre.'); }
  if (f.description !== undefined) row.description = f.description.trim().slice(0, 5000);
  if (f.status !== undefined) row.status = f.status;
  if (f.type !== undefined) row.type = f.type;
  if (f.priority !== undefined) row.priority = f.priority;
  if (f.position !== undefined) row.position = f.position;
  if (f.assigneeId !== undefined) row.assignee_id = f.assigneeId || null;
  if (f.epicId !== undefined) row.epic_id = f.epicId ? Number(f.epicId) : null;
  return row;
}

export async function addTask(pid, f, tasks) {
  const position = Math.max(0, ...tasks.map((t) => t.position)) + 1;
  ok(await sb.from('tasks').insert({ project_id: pid, status: 'todo', position, ...taskRow(f) }));
}

export async function updateTask(id, f) { ok(await sb.from('tasks').update(taskRow(f)).eq('id', id)); }

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
  if (f.z !== undefined) row.z = Math.round(f.z);
  ok(await sb.from('notes').update(row).eq('id', id));
  return row;
}

/** Moves several post-it at once: [{id, x, y}]. */
export async function moveNotes(items) {
  const results = await Promise.all(items.map((i) => sb.from('notes').update({ x: clamp(i.x), y: clamp(i.y) }).eq('id', i.id)));
  results.forEach((r) => { if (r.error) fail(r.error); });
}

export async function deleteNote(id) { ok(await sb.from('notes').delete().eq('id', id)); }

export async function toggleVote(note, me) {
  if (note.voted) ok(await sb.from('note_votes').delete().eq('note_id', note.id).eq('user_id', me));
  else ok(await sb.from('note_votes').insert({ note_id: note.id }));
}

/** Turns an idea into a task; the post-it stays on the wall. */
// ---------- links (GitHub, Supabase, Claude, maquette, site…) ----------

/** Accepts "github.com/x/y" too; only http(s) links are kept. */
export function cleanUrl(raw) {
  let u = (raw || '').trim();
  if (!u) throw new Error("Colle l'adresse du lien.");
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
  let parsed;
  try { parsed = new URL(u); } catch { throw new Error("Cette adresse n'est pas valide."); }
  if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname.includes('.')) throw new Error("L'adresse doit commencer par http:// ou https://.");
  return parsed.href.slice(0, 500);
}

export async function addLink(pid, { label, url }, links) {
  const position = Math.max(0, ...links.map((l) => l.position)) + 1;
  ok(await sb.from('project_links').insert({ project_id: pid, label: (label || '').trim().slice(0, 80), url: cleanUrl(url), position }));
}
export async function updateLink(id, { label, url }) {
  ok(await sb.from('project_links').update({ label: (label || '').trim().slice(0, 80), url: cleanUrl(url) }).eq('id', id));
}
export async function deleteLink(id) { ok(await sb.from('project_links').delete().eq('id', id)); }

// ---------- epics (grands chantiers) ----------

function epicRow(f) {
  const row = {};
  if (f.title !== undefined) { row.title = f.title.trim().slice(0, 200); if (!row.title) throw new Error('Donne un titre au chantier.'); }
  if (f.description !== undefined) row.description = f.description.trim().slice(0, 5000);
  if (f.horizon !== undefined) row.horizon = f.horizon;
  if (f.position !== undefined) row.position = f.position;
  return row;
}

export async function addEpic(pid, f, epics) {
  const position = Math.max(0, ...epics.map((e) => e.position)) + 1;
  return ok(await sb.from('epics').insert({ project_id: pid, horizon: 'next', position, ...epicRow(f) }).select('id').single()).id;
}
export async function updateEpic(id, f) { ok(await sb.from('epics').update(epicRow(f)).eq('id', id)); }
export async function deleteEpic(id) { ok(await sb.from('epics').delete().eq('id', id)); }

/** Turns a post-it into a chantier or an item (task, bug, improvement), then removes it from the wall. */
export async function convertNote(pid, note, kind, data) {
  const [first, ...rest] = note.text.trim().split('\n');
  const title = (first || '').trim().slice(0, 200) || 'Idée sans titre';
  const description = rest.join('\n').trim();
  if (kind === 'epic') await addEpic(pid, { title, description }, data.epics);
  else await addTask(pid, { title, description, type: kind }, data.tasks);
  await deleteNote(note.id);
  return title;
}

// ---------- realtime ----------

/** Calls onChange whenever teammates change something in the project. Returns an unsubscribe function. */
export function subscribeProject(pid, onChange) {
  const ch = sb.channel(`project-${pid}`);
  for (const table of ['tasks', 'epics', 'project_links', 'notes', 'memberships']) {
    ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `project_id=eq.${pid}` }, onChange);
  }
  ch.on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${pid}` }, onChange);
  ch.on('postgres_changes', { event: '*', schema: 'public', table: 'note_votes' }, onChange);
  ch.subscribe();
  return () => sb.removeChannel(ch);
}
