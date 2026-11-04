// Fausse « base de données » pour la version de test (un seul fichier HTML, sans Supabase ni internet).
// Remplace `vendor/supabase-js.js` à la fabrication (scripts/build-single.cjs --demo). Les données sont fictives, gardées dans le navigateur
// (localStorage) : on peut tout casser, la pastille « VERSION DE TEST » en haut à droite remet tout à zéro. Jamais publié avec l'app.
const KEY = 'tp-demo-db-v1', SESSION = 'tp-demo-session';
const ME = 'u-demo';
const iso = (d = 0) => new Date(Date.now() - d * 60000).toISOString();

// ---------- données fictives ----------
function seed() {
  const db = { seq: {}, profiles: [], projects: [], memberships: [], tasks: [], epics: [], project_links: [], notes: [], note_votes: [], activity: [], task_images: [], claude_tokens: [], push_subscriptions: [] };
  const id = (t) => (db.seq[t] = (db.seq[t] || 0) + 1);
  const add = (t, row) => { const r = { id: id(t), created_at: iso(600), updated_at: iso(60), ...row }; db[t].push(r); return r; };
  [[ME, 'demo', 'Démo', '🦊', '#0f766e'], ['u-lea', 'lea', 'Léa Martin', '🌻', '#d97706'], ['u-karim', 'karim', 'Karim B.', '🛠️', '#2563eb'], ['u-sofia', 'sofia', 'Sofia', '🎨', '#db2777'], ['u-theo', 'theo', 'Théo', '🚀', '#7c3aed']]
    .forEach(([pid, username, display_name, avatar_emoji, avatar_color]) => db.profiles.push({ id: pid, username, display_name, avatar_emoji, avatar_color, created_at: iso(5000) }));
  const projects = [
    { name: 'Appli vélo', emoji: '🚲', color: '#0f766e', status: 'active', description: "Une appli pour **planifier ses sorties** à vélo : carte, trajets, météo.\nObjectif : une première version pour le printemps.", manual_progress: 65, members: [ME, 'u-lea', 'u-karim', 'u-sofia'] },
    { name: 'Planning de la cantine', emoji: '🍽️', color: '#d97706', status: 'idea', description: 'Afficher les menus de la semaine et prévenir quand le plat change.', manual_progress: 10, members: [ME, 'u-theo'] },
    { name: 'Jeu de cartes', emoji: '🃏', color: '#7c3aed', status: 'paused', description: 'Un petit jeu de cartes à jouer entre amis, sur téléphone.', manual_progress: 40, members: [ME, 'u-sofia', 'u-theo'] },
    { name: 'Carnet de recettes', emoji: '📒', color: '#db2777', status: 'done', description: 'Ranger les recettes de la famille, avec photos.', manual_progress: 100, members: [ME, 'u-lea'] },
  ];
  const ep = (p, title, horizon, position) => add('epics', { project_id: p.id, title, description: '', horizon, position });
  const task = (p, title, o = {}) => add('tasks', { project_id: p.id, title, description: '', status: 'todo', type: 'task', priority: 'normal', epic_id: null, assignee_id: null, position: id('pos'), ...o, done_at: o.status === 'done' ? iso(300) : null });
  projects.forEach((def) => {
    const { members, ...row } = def;
    const p = add('projects', { ...row, type_colors: {}, due_date: null });
    members.forEach((u, k) => add('memberships', { project_id: p.id, user_id: u, role: k === 0 ? 'admin' : 'member' }));
  });
  const [velo, cantine, jeu, carnet] = db.projects;
  // --- Appli vélo : beaucoup de matière pour tester les listes, le mur, les chantiers
  const e1 = ep(velo, 'Carte et trajets', 'now', 1), e2 = ep(velo, 'Mode hors-ligne', 'now', 2), e3 = ep(velo, 'Accueil et profil', 'now', 3), e4 = ep(velo, 'Boutique de sorties', 'later', 4), e5 = ep(velo, 'Lancement', 'later', 5), e6 = ep(velo, 'Prototype', 'done', 6);
  [
    ['Afficher la carte avec le trajet', e1, { type: 'task', assignee_id: ME }], ['Le GPS décroche dans les tunnels', e1, { type: 'bug', priority: 'high', assignee_id: 'u-karim', description: "Le point **saute** quand on perd le signal.\nÀ tester avec le mode avion ==10 minutes==." }],
    ['Tracer un trajet au doigt', e1, { assignee_id: 'u-lea' }], ['Distance et dénivelé en direct', e1, { type: 'improvement' }], ['Zoom trop lent sur les vieux téléphones', e1, { type: 'bug' }],
    ['Télécharger une zone de carte', e2, { assignee_id: 'u-karim' }], ['Sauvegarder les favoris sans réseau', e2, { type: 'improvement', priority: 'high' }], ['Message clair quand on est hors-ligne', e2, { type: 'task', priority: 'low' }],
    ["Écran d'accueil avec la météo", e3, { assignee_id: 'u-sofia' }], ['Idée : badges pour les sorties', e3, { type: 'idea' }], ['Photo de profil et couleur', e3, { type: 'improvement', assignee_id: ME }],
    ['Page de la boutique', e4, {}], ['Paiement des sorties payantes', e4, { priority: 'low' }], ['Site de présentation', e5, { assignee_id: 'u-lea' }], ['Texte pour les stores', e5, {}],
    ['Corriger la police du titre au chargement', null, { type: 'bug', priority: 'high', assignee_id: ME }], ["Écrire la page d'aide", null, {}], ['Tester sur un vieux téléphone Android', null, { assignee_id: 'u-karim' }], ['Mode sombre de la carte', null, { type: 'improvement' }], ['Changer le nom de domaine', null, { priority: 'low' }],
    ['Logo et icône', e1, { status: 'done', assignee_id: 'u-sofia' }], ['Choisir les couleurs', null, { status: 'done' }], ['Maquette de la carte', e6, { status: 'done', assignee_id: 'u-sofia' }], ['Premier trajet enregistré', e6, { status: 'done', assignee_id: ME }], ['Compte et connexion', e6, { status: 'done', assignee_id: 'u-karim' }], ['Nom de l\'appli', null, { status: 'done' }],
  ].forEach(([t, e, o]) => task(velo, t, { epic_id: e ? e.id : null, ...o }));
  [['Menus de la semaine', {}], ["Prévenir quand le plat change", { priority: 'high', type: 'improvement' }], ['Importer le PDF de la mairie', { type: 'idea' }], ['Version pour les parents', {}]].forEach(([t, o]) => task(cantine, t, o));
  [['Distribuer les cartes', { assignee_id: 'u-sofia' }], ['Règles du jeu', {}], ['Animation de la pioche', { type: 'improvement' }], ['Bug : une carte reste collée', { type: 'bug', priority: 'high' }], ['Scores', { status: 'done' }]].forEach(([t, o]) => task(jeu, t, o));
  [['Scanner une recette', { status: 'done' }], ['Ajouter des photos', { status: 'done' }], ['Partage avec la famille', { status: 'done' }]].forEach(([t, o]) => task(carnet, t, o));
  // --- post-it (mur)
  const notes = [['Et si on partageait les trajets entre amis ?', 'yellow', 3], ['Mode nuit pour la carte', 'blue', 5], ['Alerte vent fort', 'pink', 2], ['Classement des sorties du mois', 'green', 4], ['Photos de parcours', 'orange', 1], ['Météo sur 3 jours', 'purple', 6], ['Thème « course »', 'yellow', 0], ['Partage par lien', 'blue', 2], ['Rappels pour partir à l\'heure', 'pink', 1], ['Vélo cargo ?', 'green', 0], ['Défis entre amis', 'orange', 7], ['Itinéraires pour enfants', 'purple', 2]];
  notes.forEach(([text, color, votes], k) => {
    const n = add('notes', { project_id: velo.id, text, color, x: 160 + (k % 4) * 380, y: 150 + Math.floor(k / 4) * 360, z: k, created_by: [ME, 'u-lea', 'u-karim', 'u-sofia'][k % 4] });
    for (let v = 0; v < votes; v++) db.note_votes.push({ id: id('note_votes'), note_id: n.id, user_id: ['u-lea', 'u-karim', 'u-sofia', 'u-theo', ME][v % 5] });
  });
  ['Gratin de pâtes à tester', 'Idée de menu : soupe', 'Plat végétarien le mardi'].forEach((text, k) => add('notes', { project_id: cantine.id, text, color: ['yellow', 'green', 'orange'][k], x: 200 + k * 380, y: 200, z: k, created_by: ME }));
  // --- liens et activité
  add('project_links', { project_id: velo.id, label: 'Code', url: 'https://github.com/exemple/appli-velo', position: 1 });
  add('project_links', { project_id: velo.id, label: 'Maquettes', url: 'https://www.figma.com/file/exemple', position: 2 });
  ['a ajouté « Afficher la carte avec le trajet »', 'a terminé « Maquette de la carte »', 'a collé un post-it', 'a créé le chantier « Mode hors-ligne »'].forEach((message, k) => db.activity.push({ id: id('activity'), project_id: velo.id, user_id: ['u-lea', 'u-sofia', 'u-karim', ME][k], message, created_at: iso(20 + k * 90) }));
  return db;
}

let db;
try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { db = null; }
if (!db) db = seed();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* plein ou privé : on garde en mémoire */ } };
const nextId = (t) => (db.seq[t] = (db.seq[t] || 0) + 1);
db.seq = db.seq || {};
const fixSeq = () => { for (const t of Object.keys(db)) if (Array.isArray(db[t])) db.seq[t] = Math.max(db.seq[t] || 0, ...db[t].map((r) => (typeof r.id === 'number' ? r.id : 0))); };
fixSeq();

// ---------- lecture avec relations (select 'a, b, rel(sub), alias:table!fk(sub)') ----------
const RELS = {
  projects: { memberships: { t: 'memberships', fk: 'project_id', lk: 'id' }, tasks: { t: 'tasks', fk: 'project_id', lk: 'id' }, notes: { t: 'notes', fk: 'project_id', lk: 'id' } },
  memberships: { profiles: { t: 'profiles', fk: 'id', lk: 'user_id', one: true } },
  notes: { profiles: { t: 'profiles', fk: 'id', lk: 'created_by', one: true }, note_votes: { t: 'note_votes', fk: 'note_id', lk: 'id' } },
  activity: { profiles: { t: 'profiles', fk: 'id', lk: 'user_id', one: true } },
};
const splitTop = (s) => { const out = []; let depth = 0, cur = ''; for (const c of s) { if (c === '(') depth++; if (c === ')') depth--; if (c === ',' && !depth) { out.push(cur.trim()); cur = ''; } else cur += c; } if (cur.trim()) out.push(cur.trim()); return out; };
function shape(table, row, cols) {
  if (!cols || cols === '*') return { ...row };
  const out = {};
  for (const tok of splitTop(cols)) {
    if (tok === '*') { Object.assign(out, row); continue; }
    const m = tok.match(/^(?:(\w+):)?(\w+)(?:!\w+)?\((.*)\)$/s);
    if (!m) { out[tok] = row[tok]; continue; }
    const [, alias, name, sub] = m, rel = RELS[table]?.[name];
    if (!rel) { out[alias || name] = null; continue; }
    const rows = db[rel.t].filter((r) => r[rel.fk] === row[rel.lk]);
    if (sub.trim() === 'count') out[alias || name] = [{ count: rows.length }];
    else if (rel.one) out[alias || name] = rows[0] ? shape(rel.t, rows[0], sub) : null;
    else out[alias || name] = rows.map((r) => shape(rel.t, r, sub));
  }
  return out;
}

const like = (pat) => new RegExp(`^${pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*')}$`, 'i');
function parseOr(s) {
  const tests = s.split(',').map((part) => { const [col, op, ...rest] = part.split('.'); const val = rest.join('.'); return op === 'ilike' ? (r) => like(val).test(String(r[col] ?? '')) : () => false; });
  return (r) => tests.some((t) => t(r));
}

const DEFAULTS = {
  tasks: () => ({ description: '', type: 'task', priority: 'normal', epic_id: null, assignee_id: null, done_at: null }),
  epics: () => ({ description: '', horizon: 'now' }),
  notes: () => ({ created_by: ME }),
  projects: () => ({ type_colors: {}, due_date: null, manual_progress: 0 }),
  project_links: () => ({}),
  note_votes: () => ({ user_id: ME }),
  claude_tokens: () => ({ expires_at: null, last_used_at: null }),
};
const bump = (t, row, before) => { // ce que ferait la base toute seule
  if (t === 'tasks' && 'status' in row) { row.done_at = row.status === 'done' ? iso() : null; if (before && before.status !== row.status) db.activity.push({ id: nextId('activity'), project_id: row.project_id, user_id: ME, message: row.status === 'done' ? `a terminé « ${row.title} »` : `a remis à faire « ${row.title} »`, created_at: iso() }); }
  if (t !== 'projects' && row.project_id) { const p = db.projects.find((x) => x.id === row.project_id); if (p) p.updated_at = iso(); }
};
const CASCADE = { projects: (r) => { for (const t of ['memberships', 'tasks', 'epics', 'project_links', 'notes', 'activity', 'task_images']) db[t] = db[t].filter((x) => x.project_id !== r.id); }, tasks: (r) => { db.task_images = db.task_images.filter((x) => x.task_id !== r.id); }, notes: (r) => { db.note_votes = db.note_votes.filter((x) => x.note_id !== r.id); }, epics: (r) => { db.tasks.forEach((t) => { if (t.epic_id === r.id) t.epic_id = null; }); } };

class Query {
  constructor(table) { this.t = table; this.op = 'select'; this.cols = '*'; this.preds = []; this.ord = []; this.lim = null; this.one = null; this.payload = null; this.back = false; }
  select(cols = '*') { if (this.op !== 'select') this.back = true; this.cols = cols; return this; }
  insert(v) { this.op = 'insert'; this.payload = v; return this; }
  update(v) { this.op = 'update'; this.payload = v; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(c, v) { this.preds.push((r) => r[c] === v || String(r[c]) === String(v)); return this; }
  or(s) { this.preds.push(parseOr(s)); return this; }
  order(c, o = {}) { this.ord.push([c, o.ascending !== false]); return this; }
  limit(n) { this.lim = n; return this; }
  single() { this.one = 'single'; return this; }
  maybeSingle() { this.one = 'maybe'; return this; }
  then(res, rej) { return Promise.resolve().then(() => this.run()).then(res, rej); }
  rows() {
    let rows = (db[this.t] || []).filter((r) => this.preds.every((p) => p(r)));
    for (const [c, asc] of [...this.ord].reverse()) rows = [...rows].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (asc ? 1 : -1));
    return rows;
  }
  finish(rows) {
    if (this.lim != null) rows = rows.slice(0, this.lim);
    const shaped = rows.map((r) => shape(this.t, r, this.cols));
    if (this.one === 'single') return shaped.length ? { data: shaped[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'Aucune ligne trouvée' } };
    if (this.one === 'maybe') return { data: shaped[0] ?? null, error: null };
    return { data: shaped, error: null };
  }
  run() {
    const t = this.t;
    if (!db[t]) return { data: null, error: { message: `Table inconnue : ${t}` } };
    if (this.op === 'select') return this.finish(this.rows());
    if (this.op === 'insert') {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload], made = [];
      for (const v of list) { const row = { id: nextId(t), created_at: iso(), updated_at: iso(), ...(DEFAULTS[t]?.() || {}), ...v }; if (t === 'tasks' && !('status' in v)) row.status = 'todo'; bump(t, row); db[t].push(row); made.push(row); }
      save();
      return this.back ? this.finish(made) : { data: null, error: null };
    }
    if (this.op === 'update') {
      const hit = this.rows();
      for (const r of hit) { const before = { ...r }; Object.assign(r, this.payload, { updated_at: iso() }); bump(t, r, before); }
      save();
      return this.back ? this.finish(hit) : { data: null, error: null };
    }
    const hit = this.rows(); // delete
    db[t] = db[t].filter((r) => !hit.includes(r)); hit.forEach((r) => CASCADE[t]?.(r));
    save();
    return this.back ? this.finish(hit) : { data: null, error: null };
  }
}

// ---------- faux client ----------
const listeners = new Set();
const user = () => ({ id: ME, email: 'demo@exemple.fr', user_metadata: { onboarded: db.onboarded !== false } });
const active = () => localStorage.getItem(SESSION) !== 'off';
const notify = (ev) => listeners.forEach((cb) => cb(ev, active() ? { user: user() } : null));
const noPasskey = async () => ({ data: null, error: { message: 'Les clés d\'accès ne sont pas disponibles dans la version de test.' } });

export function createClient() {
  return {
    from: (t) => new Query(t),
    rpc: async (name, a = {}) => {
      if (name === 'create_project') {
        const p = { id: nextId('projects'), created_at: iso(), updated_at: iso(), name: a.p_name, description: a.p_description, emoji: a.p_emoji, color: a.p_color, status: a.p_status, type_colors: {}, due_date: null, manual_progress: 0 };
        db.projects.push(p); db.memberships.push({ id: nextId('memberships'), project_id: p.id, user_id: ME, role: 'admin', created_at: iso() }); save();
        return { data: p.id, error: null };
      }
      if (name === 'add_member') {
        const pr = db.profiles.find((x) => x.username === a.p_username);
        if (!pr) return { data: null, error: { message: 'Aucun compte avec cet identifiant.' } };
        db.memberships.push({ id: nextId('memberships'), project_id: a.p_project, user_id: pr.id, role: a.p_role, created_at: iso() }); save();
        return { data: null, error: null };
      }
      if (name === 'push_test') return { data: false, error: null };
      return { data: null, error: { message: `Fonction inconnue : ${name}` } };
    },
    auth: {
      getSession: async () => ({ data: { session: active() ? { user: user() } : null }, error: null }),
      getUser: async () => ({ data: { user: user() }, error: null }),
      onAuthStateChange: (cb) => { listeners.add(cb); return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }; },
      signInWithOtp: async () => ({ data: {}, error: null }), // n'importe quelle adresse, n'importe quel code
      verifyOtp: async () => { localStorage.setItem(SESSION, 'on'); setTimeout(() => notify('SIGNED_IN'), 0); return { data: { user: user() }, error: null }; },
      updateUser: async ({ data } = {}) => { if (data && 'onboarded' in data) { db.onboarded = !!data.onboarded; save(); } return { data: { user: user() }, error: null }; },
      signOut: async () => { localStorage.setItem(SESSION, 'off'); setTimeout(() => notify('SIGNED_OUT'), 0); return { error: null }; },
      signInWithPasskey: noPasskey, registerPasskey: noPasskey,
      passkey: { update: noPasskey, list: async () => ({ data: [], error: null }), delete: noPasskey },
    },
    storage: { from: () => ({ createSignedUrls: async () => ({ data: null, error: { message: 'Les images ne sont pas disponibles dans la version de test.' } }), upload: async () => ({ data: null, error: { message: 'Les images ne sont pas disponibles dans la version de test.' } }), remove: async () => ({ data: [], error: null }) }) },
    channel: () => { const ch = { on: () => ch, subscribe: () => ch }; return ch; },
    removeChannel: () => {},
  };
}
