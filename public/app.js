// Tool-Proj front-end: vanilla JS, hash router, event delegation. Data lives in Supabase (see data.js).
import * as db from './data.js';

const $app = document.getElementById('app');
const sheet = document.getElementById('sheet');

const STATUS = { idea: 'Idée', active: 'En cours', paused: 'En pause', done: 'Terminé' };
const TASK = { todo: 'À faire', doing: 'En cours', done: 'Fait' };
const TASK_COLOR = { todo: 'var(--muted)', doing: 'var(--st-paused)', done: 'var(--st-active)' };
const NOTE_COLORS = { yellow: 'Jaune', pink: 'Rose', blue: 'Bleu', green: 'Vert', orange: 'Orange', purple: 'Violet' };
const PROJECT_COLORS = ['#0d7c72', '#3b6fd8', '#7048c8', '#d6336c', '#e8590c', '#2b8a3e', '#5c6370'];
const EMOJIS = ['🚀', '📱', '💡', '🛠️', '🎮', '🛒', '📊', '🎨', '🤖', '🌱'];
const BOARD_W = 1800, BOARD_H = 1200;

const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

const state = {
  me: null, authStep: 'email', authEmail: '', authError: '', authInfo: '',
  projects: [], filter: 'all',
  pid: null, data: null, tab: 'apercu',
  taskCol: 'todo', boardView: store.get('boardView', matchMedia('(max-width: 719px)').matches ? 'grid' : 'wall'),
  dragging: false, installPrompt: null,
};

// ---------- utils ----------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isPhone = () => matchMedia('(max-width: 719px)').matches;
const initials = (name = '?') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const hue = (id) => [...String(id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const avatar = (u, cls = '') => u ? `<span class="avatar ${cls}" style="--h:${hue(u.id)}" title="${esc(u.displayName)}">${esc(initials(u.displayName))}</span>` : '';
const parseDate = (s) => new Date(/Z|[+-]\d\d:?\d\d$/.test(s) ? s : s.replace(' ', 'T') + 'Z');

function timeAgo(s) {
  const sec = (Date.now() - parseDate(s)) / 1000;
  if (sec < 60) return "à l'instant";
  if (sec < 3600) return `il y a ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `il y a ${Math.floor(sec / 3600)} h`;
  if (sec < 86400 * 7) return `il y a ${Math.floor(sec / 86400)} j`;
  return parseDate(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function dueLabel(d) {
  if (!d) return '';
  const days = Math.round((new Date(d + 'T00:00:00') - new Date(new Date().toDateString())) / 864e5);
  const date = new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  if (days < 0) return `${date} · en retard de ${-days} j`;
  if (days === 0) return `${date} · aujourd'hui`;
  return `${date} · dans ${days} j`;
}

const icon = {
  key: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.7-8.7M17 6l3 3M14.5 8.5l2 2"/></svg>',
  overview: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  tasks: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 7 2 2 4-4M4 17l2 2 4-4M13 7h8M13 17h8"/></svg>',
  notes: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 4h16v11l-5 5H4z"/><path d="M15 20v-5h5"/></svg>',
  team: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.8 3 2.6 3.5 5.2"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  gear: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
};

function toast(msg, err = false) {
  const el = document.createElement('div');
  el.className = `toast${err ? ' err' : ''}`;
  el.textContent = msg;
  document.getElementById('toasts').append(el);
  setTimeout(() => el.remove(), err ? 4500 : 2500);
}

/** Wraps an async action: shows its error as a toast. */
const run = (fn) => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message, true); } };

function applyTheme() {
  const t = store.get('theme', 'auto');
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = t;
}

// ---------- sheet (modal) ----------

let sheetCleanup = null;
function openSheet(html, onMount) {
  sheetCleanup?.();
  sheetCleanup = null;
  sheet.innerHTML = `<div class="sheet-body">${html}</div>`;
  if (!sheet.open) sheet.showModal();
  sheetCleanup = onMount?.(sheet) || null;
  const auto = sheet.querySelector('[autofocus]');
  if (auto && !isPhone()) auto.focus();
}
function closeSheet() {
  sheetCleanup?.();
  sheetCleanup = null;
  if (sheet.open) sheet.close();
}
sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });
sheet.addEventListener('close', () => { sheetCleanup?.(); sheetCleanup = null; });

function confirmSheet(message, okLabel = 'Supprimer') {
  return new Promise((resolve) => {
    openSheet(`
      <h2 id="sheet-title">Confirmer</h2>
      <p>${esc(message)}</p>
      <div class="row end"><button class="btn ghost" data-r="0">Annuler</button><button class="btn danger solid" data-r="1">${esc(okLabel)}</button></div>`,
    (root) => {
      const onClick = (e) => { const b = e.target.closest('[data-r]'); if (b) { resolve(b.dataset.r === '1'); closeSheet(); } };
      root.addEventListener('click', onClick);
      return () => { root.removeEventListener('click', onClick); resolve(false); };
    });
  });
}

// ---------- routing ----------

function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  if (parts[0] === 'p' && parts[1]) return { name: 'project', id: Number(parts[1]), tab: parts[2] || 'apercu' };
  return { name: 'list' };
}
window.addEventListener('hashchange', () => { closeSheet(); render(); });

async function render() {
  document.body.classList.remove('with-tabbar');
  if (!state.me) return renderAuth();
  const r = route();
  if (r.name === 'project') {
    state.tab = ['apercu', 'taches', 'idees', 'equipe'].includes(r.tab) ? r.tab : 'apercu';
    if (state.pid !== r.id || !state.data) {
      state.pid = r.id; state.data = null;
      $app.innerHTML = '<div class="loading">Chargement…</div>';
      try { state.data = await db.getProject(r.id, state.me.id); subscribe(r.id); }
      catch (e) { toast(e.message, true); location.hash = '#/'; return; }
    }
    return renderProject();
  }
  state.pid = null; state.data = null; subscribe(null);
  try { state.projects = await db.listProjects(state.me.id); }
  catch (e) { toast(e.message, true); }
  renderList();
}

async function reloadProject() {
  if (!state.pid) return;
  state.data = await db.getProject(state.pid, state.me.id);
  renderProject();
}

// Live updates: when a teammate changes something, refresh as soon as the screen is idle.
let unsubscribe = null, staleTimer = null;
function subscribe(pid) {
  unsubscribe?.(); unsubscribe = null;
  if (pid) unsubscribe = db.subscribeProject(pid, () => { clearTimeout(staleTimer); staleTimer = setTimeout(refreshIfIdle, 400); });
}
async function refreshIfIdle() {
  if (!state.pid || !state.data || document.hidden) return;
  if (sheet.open || state.dragging || ($app.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) {
    clearTimeout(staleTimer); staleTimer = setTimeout(refreshIfIdle, 2000); // try again once idle
    return;
  }
  const fresh = await db.getProject(state.pid, state.me.id);
  if (JSON.stringify(fresh) !== JSON.stringify(state.data)) { state.data = fresh; renderProject(); }
}

// ---------- auth ----------

function renderAuth() {
  const codeStep = state.authStep === 'code';
  const passkeys = db.passkeysSupported();
  $app.innerHTML = `
  <main class="auth">
    <div class="auth-card">
      <div class="auth-hero">
        <a class="brand" href="#/"><img src="icons/icon.svg" alt="">Tool-Proj</a>
        <h1>Tes projets d'apps, leurs idées et qui fait quoi.</h1>
        <div class="sample" aria-hidden="true">
          <div class="note c-yellow" style="--rot:-3deg">Mode hors-ligne pour l'app vélo ?</div>
          <div class="note c-pink" style="--rot:2deg">Refaire l'écran d'accueil</div>
        </div>
      </div>
      <div class="panel stack">
        ${state.authError ? `<p class="error" role="alert">${esc(state.authError)}</p>` : ''}
        ${state.authInfo ? `<p class="info">${esc(state.authInfo)}</p>` : ''}
        ${codeStep ? `
        <form class="stack" data-form="email-code" novalidate>
          <h2>Regarde tes emails</h2>
          <p>On a envoyé un lien de connexion à <b>${esc(state.authEmail)}</b>. Ouvre-le sur cet appareil, ou tape ici le code qu'il contient.</p>
          <label class="field"><span>Code reçu par email</span>
            <input class="input code-input" id="auth-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]*" maxlength="12" placeholder="123456" required></label>
          <button class="btn primary" type="submit">Se connecter</button>
          <div class="row between small"><button type="button" class="link-btn" data-action="auth-resend">Renvoyer l'email</button><button type="button" class="link-btn" data-action="auth-back">Changer d'adresse</button></div>
        </form>` : `
        <form class="stack" data-form="email-link" novalidate>
          <h2>Connexion</h2>
          <label class="field"><span>Email</span><input class="input" id="auth-email" type="email" name="email" value="${esc(state.authEmail)}" autocomplete="email" autocapitalize="none" spellcheck="false" required></label>
          <button class="btn primary" type="submit">Recevoir un lien de connexion</button>
        </form>
        ${passkeys ? `<div class="or" aria-hidden="true">ou</div>
        <button class="btn" type="button" data-action="passkey-login">${icon.key} Utiliser une clé d'accès</button>` : ''}
        <p class="small muted">Pas de mot de passe ici. ${db.allowSignup ? 'Première visite ? Le lien reçu par email crée ton compte.' : "Pas de compte ? Demande à un admin de t'inviter."}${passkeys ? " Une fois connecté, tu pourras créer une clé d'accès pour entrer en un geste (Face ID, empreinte…)." : ''}</p>`}
      </div>
    </div>
  </main>`;
  if (codeStep && !isPhone()) $app.querySelector('#auth-code')?.focus();
}

/** First sign-in: pick a name and username, then offer a passkey. */
function welcomeSheet() {
  const me = state.me;
  openSheet(`
    <form class="stack" data-form="welcome">
      <h2 id="sheet-title">Bienvenue !</h2>
      <p class="muted">Choisis comment ton équipe te verra.</p>
      <label class="field"><span>Nom affiché</span><input class="input" id="wf-name" name="displayName" value="${esc(me.displayName)}" maxlength="60" required autocomplete="name"></label>
      <label class="field"><span>Identifiant <small class="muted">(sert à t'ajouter aux projets)</small></span>
        <input class="input" id="wf-user" name="username" value="${esc(me.username)}" maxlength="32" required autocapitalize="none" spellcheck="false"></label>
      <div class="row end"><button class="btn primary" type="submit">Continuer</button></div>
    </form>`);
}

function passkeyOfferSheet() {
  openSheet(`
    <div class="stack">
      <div class="key-badge" aria-hidden="true">${icon.key}</div>
      <h2 id="sheet-title">Créer une clé d'accès ?</h2>
      <p>La prochaine fois, tu entreras en un geste avec Face ID, ton empreinte ou le code de cet appareil, sans attendre d'email.</p>
      <div class="row end"><button class="btn ghost" data-action="close">Plus tard</button><button class="btn primary" data-action="passkey-add" data-then="close">Créer la clé</button></div>
    </div>`);
}

// ---------- projects list ----------

function projectCard(p) {
  return `
  <a class="pcard" href="#/p/${p.id}" style="--pc:${esc(p.color)}">
    <div class="pcard-head">
      <span class="emoji-badge">${esc(p.emoji)}</span>
      <div class="grow stack" style="gap:4px">
        <h2>${esc(p.name)}</h2>
        <div class="row" style="gap:6px"><span class="pill ${p.status}">${STATUS[p.status]}</span>${p.role === 'admin' ? '<span class="role admin">admin</span>' : ''}</div>
      </div>
    </div>
    ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ''}
    <div class="pcard-progress">
      <div class="row between small"><span class="muted">${p.tasks.total ? `${p.tasks.done}/${p.tasks.total} tâches` : 'Avancement'}</span><strong class="num">${p.progress} %</strong></div>
      <div class="progress"><i style="width:${p.progress}%"></i></div>
    </div>
    <div class="pcard-foot">
      <div class="stats"><span>${p.noteCount} post-it</span><span>${timeAgo(p.updatedAt)}</span></div>
      <div class="avatars">${p.members.slice(0, 4).map((m) => avatar(m)).join('')}</div>
    </div>
  </a>`;
}

function renderList() {
  const counts = { all: state.projects.length };
  for (const s of Object.keys(STATUS)) counts[s] = state.projects.filter((p) => p.status === s).length;
  const shown = state.filter === 'all' ? state.projects : state.projects.filter((p) => p.status === state.filter);
  $app.innerHTML = `
  ${topbar(`<a class="brand" href="#/"><img src="icons/icon.svg" alt="">Tool-Proj</a><span class="grow"></span>
    <button class="btn primary hide-sm" data-action="new-project">+ Nouveau projet</button>`)}
  <main class="page">
    <div class="list-head">
      <div class="stack" style="gap:4px"><h1>Mes projets</h1>
      <p class="muted">${counts.all ? `${counts.all} projet${counts.all > 1 ? 's' : ''} · ${counts.active} en cours` : 'Commence par créer ton premier projet.'}</p></div>
    </div>
    ${counts.all ? `<div class="chips" role="toolbar" aria-label="Filtrer par statut" style="margin-bottom:16px">
      ${[['all', 'Tous'], ...Object.entries(STATUS)].map(([k, l]) => `<button class="chip" data-action="filter" data-v="${k}" aria-pressed="${state.filter === k}">${l}<span class="num">${counts[k]}</span></button>`).join('')}
    </div>` : ''}
    ${shown.length ? `<div class="projects">${shown.map(projectCard).join('')}</div>`
      : `<div class="empty"><div class="big">🗂️</div><p>${counts.all ? 'Aucun projet avec ce statut.' : "Aucun projet pour l'instant."}</p>
         ${counts.all ? '' : '<button class="btn primary" data-action="new-project">Créer un projet</button>'}</div>`}
  </main>
  <button class="fab hide-lg" data-action="new-project" aria-label="Nouveau projet">+ Projet</button>`;
}

function topbar(inner) {
  return `<header class="topbar"><div class="topbar-inner">${inner}
    <button class="btn ghost icon" data-action="account" aria-label="Mon compte">${avatar(state.me)}</button></div></header>`;
}

// ---------- project form ----------

function projectForm(p) {
  const editing = !!p;
  p ||= { name: '', description: '', emoji: '🚀', color: PROJECT_COLORS[0], status: 'idea', manualProgress: 0, repoUrl: '', dueDate: '', tasks: { total: 0 } };
  openSheet(`
    <form class="stack" data-form="${editing ? 'edit-project' : 'new-project'}">
      <div class="sheet-head"><h2 id="sheet-title">${editing ? 'Paramètres du projet' : 'Nouveau projet'}</h2><button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">✕</button></div>
      <label class="field"><span>Nom</span><input class="input" id="pf-name" name="name" value="${esc(p.name)}" required maxlength="80" placeholder="ex. App de covoiturage" autofocus></label>
      <div class="field"><span>Icône</span>
        <div class="row"><input class="input" id="pf-emoji" name="emoji" value="${esc(p.emoji)}" maxlength="8" style="width:70px;text-align:center;font-size:1.3rem">
        <div class="row" style="gap:4px">${EMOJIS.map((e) => `<button type="button" class="btn ghost icon" data-action="pick-emoji" data-v="${e}">${e}</button>`).join('')}</div></div>
      </div>
      <div class="field"><span>Couleur</span>
        <div class="swatches">${PROJECT_COLORS.map((c) => `<button type="button" class="swatch" style="--note:${c}" data-action="pick-color" data-v="${c}" aria-pressed="${c === p.color}" aria-label="Couleur ${c}"></button>`).join('')}
        <input type="color" class="color-input" id="pf-color" name="color" value="${esc(p.color)}" aria-label="Autre couleur"></div>
      </div>
      <label class="field"><span>Statut</span><select class="input" id="pf-status" name="status">${Object.entries(STATUS).map(([k, l]) => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Description</span><textarea class="input" id="pf-desc" name="description" maxlength="2000" placeholder="Le but de l'app, pour qui, la stack…">${esc(p.description)}</textarea></label>
      ${editing ? `
        <label class="field"><span>Échéance</span><input class="input" id="pf-due" type="date" name="dueDate" value="${esc(p.dueDate || '')}"></label>
        <label class="field"><span>Lien (dépôt, maquette, store…)</span><input class="input" id="pf-repo" type="url" name="repoUrl" value="${esc(p.repoUrl)}" placeholder="https://github.com/…"></label>
        <label class="field"><span>Avancement manuel : <b class="num" id="pf-prog-v">${p.manualProgress} %</b></span>
          <input type="range" id="pf-prog" name="manualProgress" min="0" max="100" step="5" value="${p.manualProgress}" ${p.tasks.total ? 'disabled' : ''}>
          <small class="muted">${p.tasks.total ? "Calculé automatiquement à partir des tâches." : "Utilisé tant que le projet n'a pas de tâches."}</small></label>` : ''}
      <div class="row ${editing ? 'between' : 'end'}">
        ${editing ? '<button type="button" class="btn danger" data-action="delete-project">Supprimer le projet</button>' : ''}
        <button class="btn primary" type="submit">${editing ? 'Enregistrer' : 'Créer le projet'}</button>
      </div>
    </form>`,
  (root) => {
    const range = root.querySelector('#pf-prog');
    range?.addEventListener('input', () => { root.querySelector('#pf-prog-v').textContent = `${range.value} %`; });
  });
}

// ---------- project view ----------

function renderProject() {
  const d = state.data;
  if (!d) return;
  const p = d.project;
  const isAdmin = p.role === 'admin';
  const openTasks = d.tasks.filter((t) => t.status !== 'done').length;
  const tabs = [
    ['apercu', 'Aperçu', icon.overview, ''],
    ['taches', 'Tâches', icon.tasks, openTasks],
    ['idees', 'Post-it', icon.notes, d.notes.length],
    ['equipe', 'Équipe', icon.team, d.members.length],
  ];
  const board = $app.querySelector('.board-wrap');
  const scroll = board ? [board.scrollLeft, board.scrollTop] : null;

  document.body.classList.add('with-tabbar');
  $app.innerHTML = `
  ${topbar(`
    <a class="btn ghost icon" href="#/" aria-label="Retour aux projets">${icon.back}</a>
    <div class="title" style="--pc:${esc(p.color)}"><span class="emoji-badge">${esc(p.emoji)}</span><h1>${esc(p.name)}</h1><span class="pill ${p.status} hide-sm">${STATUS[p.status]}</span></div>
    ${isAdmin ? `<button class="btn ghost icon" data-action="edit-project" aria-label="Paramètres du projet">${icon.gear}</button>` : ''}`)}
  <nav class="tabs" aria-label="Sections du projet">
    ${tabs.map(([k, l, ic, n]) => `<a class="tab" href="#/p/${p.id}/${k}" ${state.tab === k ? 'aria-current="page"' : ''}><span class="ico">${ic}</span>${l}${n ? `<span class="count num">${n}</span>` : ''}</a>`).join('')}
  </nav>
  <main class="page" style="--pc:${esc(p.color)}">
    ${{ apercu: viewOverview, taches: viewTasks, idees: viewNotes, equipe: viewTeam }[state.tab](d)}
  </main>
  ${state.tab === 'idees' ? '<button class="fab hide-lg" data-action="new-note">+ Post-it</button>' : ''}`;

  if (state.tab === 'idees' && state.boardView === 'wall') {
    const wrap = $app.querySelector('.board-wrap');
    if (wrap) {
      if (scroll) [wrap.scrollLeft, wrap.scrollTop] = scroll;
      bindBoard(wrap);
    }
  }
  if (state.tab === 'taches') bindTaskDnD();
}

function viewOverview(d) {
  const p = d.project;
  const top = [...d.notes].filter((n) => n.votes > 0).sort((a, b) => b.votes - a.votes).slice(0, 3);
  const todo = d.tasks.filter((t) => t.status === 'todo').length;
  return `
  <div class="overview">
    <section class="panel">
      <div class="hero">
        <div class="ring" style="--p:${p.progress}" role="img" aria-label="Avancement ${p.progress} %"><div><div><strong class="num">${p.progress}%</strong><small>avancement</small></div></div></div>
        <div class="stack grow" style="gap:8px">
          <div class="row"><span class="pill ${p.status}">${STATUS[p.status]}</span><span class="role ${p.role}">${p.role === 'admin' ? 'tu es admin' : 'tu es membre'}</span></div>
          <p class="muted small">${p.tasks.total ? `${p.tasks.done} tâche${p.tasks.done > 1 ? 's' : ''} terminée${p.tasks.done > 1 ? 's' : ''} sur ${p.tasks.total}` : 'Avancement réglé à la main (aucune tâche pour le moment).'}</p>
          <div class="meta">
            ${p.dueDate ? `<span>📅 ${esc(dueLabel(p.dueDate))}</span>` : ''}
            ${p.repoUrl ? `<a href="${esc(p.repoUrl)}" target="_blank" rel="noopener">🔗 ${esc(p.repoUrl.replace(/^https?:\/\//, ''))}</a>` : ''}
          </div>
        </div>
      </div>
      <div class="kv">
        <div><span class="label">À faire</span><strong class="num">${todo}</strong></div>
        <div><span class="label">En cours</span><strong class="num">${p.tasks.doing}</strong></div>
        <div><span class="label">Fait</span><strong class="num">${p.tasks.done}</strong></div>
      </div>
      ${p.description ? `<div class="stack" style="gap:6px"><span class="label">Description</span><p class="description">${esc(p.description)}</p></div>`
        : p.role === 'admin' ? '<p class="muted small">Pas encore de description. <button class="link-btn" data-action="edit-project">En ajouter une</button></p>' : ''}
    </section>
    <div class="stack" style="gap:16px">
      <section class="panel">
        <div class="row between"><h3>Idées les plus votées</h3><a class="small" href="#/p/${p.id}/idees">Voir le mur</a></div>
        ${top.length ? `<div class="top-ideas">${top.map((n) => `<button class="mini-note c-${n.color}" data-action="open-note" data-id="${n.id}"><span>${esc(n.text.split('\n')[0] || 'Post-it vide')}</span><span class="num">👍 ${n.votes}</span></button>`).join('')}</div>`
          : `<p class="muted small">Vote pour les post-it avec 👍 : les favoris apparaîtront ici.</p>`}
      </section>
      <section class="panel">
        <h3>Activité récente</h3>
        ${d.activity.length ? `<ul class="feed">${d.activity.slice(0, 12).map((a) => `<li><span class="grow"><b>${esc(a.user || 'Quelqu\'un')}</b> ${esc(a.message)}<time>${timeAgo(a.createdAt)}</time></span></li>`).join('')}</ul>` : '<p class="muted small">Rien pour le moment.</p>'}
      </section>
    </div>
  </div>`;
}

function viewTasks(d) {
  const byId = Object.fromEntries(d.members.map((m) => [m.id, m]));
  const cols = Object.keys(TASK).map((s) => [s, d.tasks.filter((t) => t.status === s)]);
  const draggable = matchMedia('(pointer: fine)').matches;
  return `
  <form class="quick-add" data-form="add-task">
    <input class="input" id="task-new" name="title" maxlength="200" placeholder="Ajouter une tâche${isPhone() ? ` (${TASK[state.taskCol].toLowerCase()})` : ''}…" autocomplete="off" enterkeyhint="done">
    <button class="btn primary" type="submit">Ajouter</button>
  </form>
  <div class="seg hide-lg" role="tablist">${cols.map(([s, list]) => `<button data-action="task-col" data-v="${s}" aria-pressed="${state.taskCol === s}">${TASK[s]} <span class="num muted">${list.length}</span></button>`).join('')}</div>
  <div class="columns">
    ${cols.map(([s, list]) => `
      <section class="col ${state.taskCol === s ? 'shown' : ''}" data-col="${s}" aria-label="${TASK[s]}">
        <div class="col-head"><h3><span class="dot" style="--c:${TASK_COLOR[s]}"></span>${TASK[s]}</h3><span class="muted num small">${list.length}</span></div>
        ${list.length ? list.map((t) => `
          <div class="task ${t.status === 'done' ? 'is-done' : ''}" data-action="open-task" data-id="${t.id}" ${draggable ? 'draggable="true"' : ''}>
            <button class="check ${t.status}" data-action="toggle-task" data-id="${t.id}" aria-label="${t.status === 'done' ? 'Remettre à faire' : 'Marquer comme fait'}">${t.status === 'done' ? '✓' : t.status === 'doing' ? '●' : ''}</button>
            <span class="t-title">${esc(t.title)}</span>
            ${avatar(byId[t.assigneeId])}
          </div>`).join('') : `<p class="col-empty">${s === 'done' ? 'Rien de terminé pour le moment.' : 'Aucune tâche.'}</p>`}
      </section>`).join('')}
  </div>`;
}

function noteHtml(n, wall) {
  const rot = (((n.id * 37) % 7) - 3) * 0.7;
  return `
  <article class="note c-${n.color}" data-note="${n.id}" ${wall ? '' : `data-action="open-note" data-id="${n.id}"`}
    style="--rot:${rot}deg;${wall ? `left:${n.x}px;top:${n.y}px;z-index:${n.z}` : ''}" tabindex="0" aria-label="Post-it : ${esc(n.text.slice(0, 60))}">
    <div class="n-text">${esc(n.text)}</div>
    <div class="n-foot"><span class="who">${esc(n.author || '')}</span>
      <button class="vote ${n.voted ? 'on' : ''}" data-action="vote" data-id="${n.id}" aria-pressed="${n.voted}" aria-label="Voter">👍 <span class="num">${n.votes}</span></button></div>
  </article>`;
}

function viewNotes(d) {
  const wall = state.boardView === 'wall';
  const sorted = wall ? d.notes : [...d.notes].sort((a, b) => b.votes - a.votes || b.id - a.id);
  return `
  <div class="board-tools">
    <button class="btn primary hide-sm" data-action="new-note">+ Post-it</button>
    <div class="seg" style="margin:0">
      <button data-action="board-view" data-v="wall" aria-pressed="${wall}">Mur</button>
      <button data-action="board-view" data-v="grid" aria-pressed="${!wall}">Grille</button>
    </div>
    <p class="muted small grow">${wall ? 'Glisse les post-it pour les ranger, touche-les pour les modifier.' : 'Triés par votes.'}</p>
  </div>
  ${!d.notes.length ? `<div class="empty"><div class="big">🗒️</div><p>Aucun post-it. Note ici les idées, les bugs à régler, les envies…</p><button class="btn primary" data-action="new-note">Coller un post-it</button></div>`
    : wall ? `<div class="board-wrap"><div class="board">${sorted.map((n) => noteHtml(n, true)).join('')}</div></div>`
      : `<div class="note-grid">${sorted.map((n) => noteHtml(n, false)).join('')}</div>`}`;
}

function viewTeam(d) {
  const p = d.project;
  const isAdmin = p.role === 'admin';
  return `
  <div class="stack" style="max-width:720px">
    ${isAdmin ? `
    <form class="panel" data-form="add-member" autocomplete="off">
      <h3>Ajouter quelqu'un</h3>
      <div class="row">
        <input class="input grow" id="member-q" name="username" placeholder="Identifiant ou nom" autocapitalize="none" spellcheck="false" style="min-width:160px">
        <select class="input" id="member-role" name="role" style="width:auto"><option value="member">Membre</option><option value="admin">Admin</option></select>
        <button class="btn primary" type="submit">Ajouter</button>
      </div>
      <div class="suggest" id="member-suggest"></div>
      <p class="small muted"><b>Admin</b> : modifie le projet et gère l'équipe. <b>Membre</b> : ajoute et gère les tâches et les post-it.</p>
    </form>` : ''}
    <section class="stack" style="gap:10px">
      <h3>${d.members.length} personne${d.members.length > 1 ? 's' : ''} sur le projet</h3>
      <div class="members">
        ${d.members.map((m) => `
          <div class="member">
            ${avatar(m, 'lg')}
            <div class="grow"><strong>${esc(m.displayName)}${m.id === state.me.id ? ' (toi)' : ''}</strong><span class="small muted">@${esc(m.username)}</span></div>
            ${isAdmin ? `<select aria-label="Rôle de ${esc(m.displayName)}" data-change="role" data-id="${m.id}">
                <option value="member" ${m.role === 'member' ? 'selected' : ''}>Membre</option><option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Admin</option></select>`
              : `<span class="role ${m.role}">${m.role === 'admin' ? 'Admin' : 'Membre'}</span>`}
            ${m.id === state.me.id ? '<button class="btn sm danger" data-action="remove-member" data-id="' + m.id + '">Quitter</button>'
              : isAdmin ? `<button class="btn sm ghost" data-action="remove-member" data-id="${m.id}" aria-label="Retirer ${esc(m.displayName)}">Retirer</button>` : ''}
          </div>`).join('')}
      </div>
    </section>
  </div>`;
}

// ---------- tasks ----------

function taskSheet(t) {
  const d = state.data;
  openSheet(`
    <form class="stack" data-form="edit-task" data-id="${t.id}">
      <div class="sheet-head"><h2 id="sheet-title">Tâche</h2><button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">✕</button></div>
      <label class="field"><span>Intitulé</span><textarea class="input" id="tf-title" name="title" maxlength="200" required style="min-height:70px">${esc(t.title)}</textarea></label>
      <div class="field"><span>Statut</span>
        <div class="seg" style="margin:0">${Object.entries(TASK).map(([k, l]) => `<button type="button" data-action="pick-status" data-v="${k}" aria-pressed="${k === t.status}">${l}</button>`).join('')}</div>
        <input type="hidden" name="status" value="${t.status}"></div>
      <label class="field"><span>Assignée à</span><select class="input" id="tf-assignee" name="assigneeId"><option value="">Personne</option>
        ${d.members.map((m) => `<option value="${m.id}" ${m.id === t.assigneeId ? 'selected' : ''}>${esc(m.displayName)}</option>`).join('')}</select></label>
      <p class="small muted">Créée ${timeAgo(t.createdAt)}${t.doneAt ? ` · terminée ${timeAgo(t.doneAt)}` : ''}</p>
      <div class="row between"><button type="button" class="btn danger" data-action="delete-task" data-id="${t.id}">Supprimer</button><button class="btn primary" type="submit">Enregistrer</button></div>
    </form>`);
}

function bindTaskDnD() {
  if (!matchMedia('(pointer: fine)').matches) return;
  let dragId = null;
  $app.querySelectorAll('.task[draggable]').forEach((el) => {
    el.addEventListener('dragstart', (e) => { dragId = el.dataset.id; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
  });
  $app.querySelectorAll('.col').forEach((col) => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drop'); });
    col.addEventListener('dragleave', () => col.classList.remove('drop'));
    col.addEventListener('drop', run(async (e) => {
      e.preventDefault(); col.classList.remove('drop');
      const id = Number(dragId || e.dataTransfer.getData('text/plain'));
      const t = state.data.tasks.find((x) => x.id === id);
      if (!t || t.status === col.dataset.col) return;
      const maxPos = Math.max(0, ...state.data.tasks.filter((x) => x.status === col.dataset.col).map((x) => x.position));
      await db.updateTask(id, { status: col.dataset.col, position: maxPos + 1 });
      await reloadProject();
    }));
  });
}

// ---------- notes ----------

function noteSheet(n) {
  const isNew = !n.id;
  openSheet(`
    <form class="stack" data-form="${isNew ? 'new-note' : 'edit-note'}" data-id="${n.id || ''}">
      <div class="sheet-head"><h2 id="sheet-title">${isNew ? 'Nouveau post-it' : 'Post-it'}</h2><button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">✕</button></div>
      <div class="sheet-note c-${n.color}" id="nf-paper"><textarea id="nf-text" name="text" maxlength="1000" placeholder="Une idée, un bug, une envie…" autofocus>${esc(n.text)}</textarea></div>
      <div class="swatches" role="radiogroup" aria-label="Couleur">${Object.entries(NOTE_COLORS).map(([k, l]) => `<button type="button" class="swatch c-${k}" data-action="note-color" data-v="${k}" aria-pressed="${k === n.color}" aria-label="${l}"></button>`).join('')}</div>
      <input type="hidden" name="color" value="${n.color}">
      ${isNew ? '' : `<p class="small muted">Par ${esc(n.author || 'un ancien membre')} · ${timeAgo(n.createdAt)} · 👍 ${n.votes}</p>`}
      <div class="row between">
        ${isNew ? '<span></span>' : `<div class="row"><button type="button" class="btn danger" data-action="delete-note" data-id="${n.id}">Supprimer</button>
          <button type="button" class="btn" data-action="note-to-task" data-id="${n.id}">→ En faire une tâche</button></div>`}
        <button class="btn primary" type="submit">${isNew ? 'Coller' : 'Enregistrer'}</button>
      </div>
    </form>`);
}

/** Picks a spot on the wall that doesn't cover another post-it, preferring the visible area. */
function freeSpot() {
  const wrap = $app.querySelector('.board-wrap');
  const notes = state.data?.notes || [];
  const free = (x, y) => notes.every((n) => Math.abs(n.x - x) > 200 || Math.abs(n.y - y) > 190);
  const vx = wrap ? wrap.scrollLeft : 0, vy = wrap ? wrap.scrollTop : 0;
  const vw = wrap ? wrap.clientWidth : 900, vh = wrap ? wrap.clientHeight : 600;
  for (const [ox, oy, w, h] of [[vx, vy, vw, vh], [0, 0, BOARD_W, BOARD_H]]) {
    for (let y = oy + 24; y + 180 <= Math.min(BOARD_H, oy + h); y += 200) {
      for (let x = ox + 24; x + 190 <= Math.min(BOARD_W, ox + w); x += 214) {
        if (free(x, y)) return { x, y };
      }
    }
  }
  return { x: vx + 40 + Math.round(Math.random() * 80), y: vy + 40 + Math.round(Math.random() * 80) };
}

/** Drag post-its on the wall with pointer events (mouse, touch and pen). A tap opens the note. */
function bindBoard(wrap) {
  let drag = null;
  wrap.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.note');
    if (!el || e.target.closest('.vote') || e.button > 0) return;
    drag = { el, id: Number(el.dataset.note), sx: e.clientX, sy: e.clientY, ox: el.offsetLeft, oy: el.offsetTop, moved: false, pid: e.pointerId };
    el.setPointerCapture(e.pointerId);
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pid) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    if (!drag.moved) { drag.moved = true; state.dragging = true; drag.el.classList.add('dragging'); }
    const x = Math.max(0, Math.min(BOARD_W - drag.el.offsetWidth, drag.ox + dx));
    const y = Math.max(10, Math.min(BOARD_H - drag.el.offsetHeight, drag.oy + dy));
    drag.el.style.left = `${x}px`; drag.el.style.top = `${y}px`;
    // Auto-scroll when dragging near the edges of the visible wall.
    const r = wrap.getBoundingClientRect(), m = 40;
    if (e.clientX > r.right - m) wrap.scrollLeft += 12; else if (e.clientX < r.left + m) wrap.scrollLeft -= 12;
    if (e.clientY > r.bottom - m) wrap.scrollTop += 12; else if (e.clientY < r.top + m) wrap.scrollTop -= 12;
  });
  const end = run(async (e) => {
    if (!drag || e.pointerId !== drag.pid) return;
    const d = drag; drag = null; state.dragging = false;
    d.el.classList.remove('dragging');
    const n = state.data.notes.find((x) => x.id === d.id);
    if (!d.moved) { if (e.type === 'pointerup' && n) noteSheet(n); return; }
    const x = parseFloat(d.el.style.left), y = parseFloat(d.el.style.top);
    const row = await db.updateNote(d.id, { x, y, front: true }, state.data.notes);
    Object.assign(n, row);
    d.el.style.zIndex = row.z;
  });
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', end);
  wrap.addEventListener('keydown', (e) => {
    const el = e.target.closest('.note');
    if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); noteSheet(state.data.notes.find((x) => x.id === Number(el.dataset.note))); }
  });
}

// ---------- account ----------

function accountSheet() {
  const me = state.me;
  const theme = store.get('theme', 'auto');
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  openSheet(`
    <div class="sheet-head"><div class="row">${avatar(me, 'lg')}<div><h2 id="sheet-title">${esc(me.displayName)}</h2><p class="small muted">@${esc(me.username)}</p></div></div>
      <button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">✕</button></div>
    ${!standalone ? `<div class="panel" style="background:var(--accent-soft);border-color:transparent">
      <h3>Installer l'app</h3>
      ${state.installPrompt ? '<p class="small">Ajoute Tool-Proj à ton écran d\'accueil pour l\'ouvrir comme une vraie app.</p><button class="btn primary" data-action="install">Installer</button>'
        : ios ? '<p class="small">Sur iPhone : touche <b>Partager</b> dans Safari, puis <b>Sur l\'écran d\'accueil</b>.</p>'
          : '<p class="small">Dans le menu du navigateur, choisis <b>Installer l\'application</b> ou <b>Ajouter à l\'écran d\'accueil</b>.</p>'}
    </div>` : ''}
    <div class="field"><span>Thème</span><div class="seg" style="margin:0">
      ${[['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']].map(([k, l]) => `<button type="button" data-action="theme" data-v="${k}" aria-pressed="${theme === k}">${l}</button>`).join('')}</div></div>
    <form class="stack" data-form="profile">
      <label class="field"><span>Nom affiché</span><input class="input" id="ac-name" name="displayName" value="${esc(me.displayName)}" maxlength="60" required></label>
      <label class="field"><span>Identifiant</span><input class="input" id="ac-user" name="username" value="${esc(me.username)}" maxlength="32" required autocapitalize="none" spellcheck="false"></label>
      <div class="row end"><button class="btn" type="submit">Enregistrer</button></div>
    </form>
    ${db.passkeysSupported() ? `<section class="stack" style="gap:10px">
      <h3>Clés d'accès</h3>
      <p class="small muted">Pour te connecter avec Face ID, ton empreinte ou le code de l'appareil. Crée une clé sur chaque appareil que tu utilises.</p>
      <div class="passkeys" id="pk-list"><p class="small muted">Chargement…</p></div>
      <button class="btn" data-action="passkey-add">${icon.key} Ajouter une clé sur cet appareil</button>
    </section>` : ''}
    <button class="btn danger" data-action="logout">Se déconnecter</button>`, () => { if (db.passkeysSupported()) loadPasskeys(); });
}

async function loadPasskeys() {
  const box = sheet.querySelector('#pk-list');
  if (!box) return;
  try {
    const keys = await db.listPasskeys();
    box.innerHTML = keys.length ? keys.map((k) => `
      <div class="passkey">${icon.key}<div class="grow"><strong>${esc(k.friendly_name || "Clé d'accès")}</strong>
        <span class="small muted">Créée ${timeAgo(k.created_at)}${k.last_used_at ? ` · utilisée ${timeAgo(k.last_used_at)}` : ''}</span></div>
        <button class="btn sm ghost" data-action="passkey-delete" data-id="${esc(k.id)}" aria-label="Supprimer cette clé">Supprimer</button></div>`).join('')
      : '<p class="small muted">Aucune clé pour le moment.</p>';
  } catch (e) {
    box.innerHTML = `<p class="small muted">${esc(e.message)}</p>`;
  }
}

// ---------- actions (event delegation) ----------

const formData = (form) => Object.fromEntries(new FormData(form));

const actions = {
  'auth-back': () => { state.authStep = 'email'; state.authError = ''; state.authInfo = ''; renderAuth(); },
  'auth-resend': async () => {
    try { await db.sendEmailLink(state.authEmail); state.authError = ''; state.authInfo = 'Nouvel email envoyé.'; }
    catch (e) { state.authError = e.message; state.authInfo = ''; }
    renderAuth();
  },
  'passkey-login': async () => {
    try { state.me = await db.signInWithPasskey(); signedIn(); }
    catch (e) { state.authError = e.message; state.authInfo = ''; renderAuth(); }
  },
  'passkey-add': async (el) => {
    await db.addPasskey();
    toast("Clé d'accès créée");
    if (el.dataset.then === 'close') closeSheet(); else loadPasskeys();
  },
  'passkey-delete': async (el) => {
    await db.deletePasskey(el.dataset.id);
    toast('Clé supprimée'); loadPasskeys();
  },
  close: closeSheet,
  account: accountSheet,
  filter: (el) => { state.filter = el.dataset.v; renderList(); },
  'new-project': () => projectForm(null),
  'edit-project': () => projectForm(state.data.project),
  'pick-emoji': (el) => { sheet.querySelector('#pf-emoji').value = el.dataset.v; },
  'pick-color': (el) => {
    sheet.querySelector('#pf-color').value = el.dataset.v;
    sheet.querySelectorAll('[data-action="pick-color"]').forEach((b) => b.setAttribute('aria-pressed', b === el));
  },
  'delete-project': async () => {
    const p = state.data.project;
    if (!(await confirmSheet(`Supprimer « ${p.name} » avec ses tâches et ses post-it ? C'est définitif.`))) return;
    await db.deleteProject(p.id);
    toast('Projet supprimé');
    state.data = null; location.hash = '#/';
  },
  'task-col': (el) => { state.taskCol = el.dataset.v; renderProject(); },
  'open-task': (el) => taskSheet(state.data.tasks.find((t) => t.id === Number(el.dataset.id))),
  'toggle-task': async (el) => {
    const t = state.data.tasks.find((x) => x.id === Number(el.dataset.id));
    await db.updateTask(t.id, { status: t.status === 'done' ? 'todo' : 'done' });
    await reloadProject();
  },
  'pick-status': (el) => {
    el.closest('form').elements.status.value = el.dataset.v;
    el.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === el));
  },
  'delete-task': async (el) => {
    await db.deleteTask(Number(el.dataset.id));
    closeSheet(); toast('Tâche supprimée'); await reloadProject();
  },
  'board-view': (el) => { state.boardView = el.dataset.v; store.set('boardView', el.dataset.v); renderProject(); },
  'new-note': () => noteSheet({ text: '', color: ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'][Math.floor(Math.random() * 6)], ...freeSpot() }),
  'open-note': (el) => noteSheet(state.data.notes.find((n) => n.id === Number(el.dataset.id))),
  'note-color': (el) => {
    const form = el.closest('form');
    form.elements.color.value = el.dataset.v;
    form.querySelector('#nf-paper').className = `sheet-note c-${el.dataset.v}`;
    form.querySelectorAll('[data-action="note-color"]').forEach((b) => b.setAttribute('aria-pressed', b === el));
  },
  vote: async (el) => {
    const note = state.data.notes.find((n) => n.id === Number(el.dataset.id));
    await db.toggleVote(note, state.me.id);
    note.votes += note.voted ? -1 : 1; note.voted = !note.voted;
    renderProject();
  },
  'delete-note': async (el) => {
    await db.deleteNote(Number(el.dataset.id));
    closeSheet(); toast('Post-it décollé'); await reloadProject();
  },
  'note-to-task': async (el) => {
    const note = state.data.notes.find((n) => n.id === Number(el.dataset.id));
    const title = await db.noteToTask(state.pid, note, state.data.tasks);
    closeSheet(); toast(`Tâche créée : ${title}`); await reloadProject();
  },
  'remove-member': async (el) => {
    const id = el.dataset.id;
    const self = id === state.me.id;
    const m = state.data.members.find((x) => x.id === id);
    if (!(await confirmSheet(self ? 'Quitter ce projet ? Tu n\'y auras plus accès.' : `Retirer ${m.displayName} du projet ?`, self ? 'Quitter' : 'Retirer'))) return;
    await db.removeMember(state.pid, id);
    if (self) { state.data = null; location.hash = '#/'; toast('Tu as quitté le projet'); return; }
    await reloadProject();
  },
  'pick-member': (el) => { $app.querySelector('#member-q').value = el.dataset.v; $app.querySelector('#member-suggest').innerHTML = ''; },
  theme: (el) => {
    store.set('theme', el.dataset.v); applyTheme();
    el.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === el));
  },
  install: async () => {
    const p = state.installPrompt; if (!p) return;
    p.prompt(); await p.userChoice; state.installPrompt = null; closeSheet();
  },
  logout: async () => {
    await db.signOut();
    closeSheet(); subscribe(null); state.me = null; state.authStep = 'email'; state.projects = []; state.data = null; state.pid = null;
    location.hash = '#/'; render();
  },
};

const forms = {
  async 'email-link'(f) {
    const email = formData(f).email.trim();
    state.authEmail = email;
    try { await db.sendEmailLink(email); state.authStep = 'code'; state.authError = ''; state.authInfo = ''; }
    catch (e) { state.authError = e.message; }
    renderAuth();
  },
  async 'email-code'(f) {
    try { state.me = await db.verifyEmailCode(state.authEmail, formData(f).code); signedIn(); }
    catch (e) { state.authError = e.message; state.authInfo = ''; renderAuth(); }
  },
  async welcome(f) {
    state.me = await db.completeOnboarding(state.me.id, formData(f));
    render();
    if (db.passkeysSupported()) passkeyOfferSheet(); else closeSheet();
  },
  async 'new-project'(f) {
    const id = await db.createProject(formData(f));
    closeSheet(); location.hash = `#/p/${id}`;
  },
  async 'edit-project'(f) {
    const body = formData(f);
    if (state.data.project.tasks.total) delete body.manualProgress;
    await db.updateProject(state.pid, body);
    closeSheet(); toast('Projet mis à jour'); await reloadProject();
  },
  async 'add-task'(f) {
    const title = f.elements.title.value.trim();
    if (!title) return;
    await db.addTask(state.pid, { title, status: isPhone() ? state.taskCol : 'todo' }, state.data.tasks);
    await reloadProject();
    $app.querySelector('#task-new')?.focus();
  },
  async 'edit-task'(f) {
    const b = formData(f);
    await db.updateTask(Number(f.dataset.id), { title: b.title, status: b.status, assigneeId: b.assigneeId || null });
    closeSheet(); await reloadProject();
  },
  async 'new-note'(f) {
    const b = formData(f);
    const spot = freeSpot();
    await db.addNote(state.pid, { text: b.text, color: b.color, ...spot }, state.data.notes);
    closeSheet(); await reloadProject();
  },
  async 'edit-note'(f) {
    const b = formData(f);
    await db.updateNote(Number(f.dataset.id), { text: b.text, color: b.color }, state.data.notes);
    closeSheet(); await reloadProject();
  },
  async 'add-member'(f) {
    const b = formData(f);
    if (!b.username.trim()) return;
    await db.addMember(state.pid, b.username.trim().replace(/^@/, ''), b.role);
    toast('Ajouté au projet'); await reloadProject();
  },
  async profile(f) {
    state.me = await db.updateProfile(state.me.id, formData(f));
    toast('Profil mis à jour'); closeSheet(); render();
  },
};

for (const root of [$app, sheet]) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || !root.contains(el)) return;
    // A button inside a clickable row (vote on a note, check on a task) must not also open the row.
    e.stopPropagation();
    if (el.tagName === 'A') return;
    e.preventDefault();
    run(actions[el.dataset.action])?.(el, e);
  });
  root.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form]');
    if (!f) return;
    e.preventDefault();
    const btn = f.querySelector('[type="submit"]');
    if (btn) btn.disabled = true;
    run(forms[f.dataset.form])(f).finally(() => { if (btn?.isConnected) btn.disabled = false; });
  });
}

$app.addEventListener('change', run(async (e) => {
  const el = e.target.closest('[data-change="role"]');
  if (!el) return;
  try { await db.setRole(state.pid, el.dataset.id, el.value); toast('Rôle mis à jour'); }
  finally { await reloadProject(); }
}));

// Member search suggestions.
let searchTimer;
$app.addEventListener('input', (e) => {
  if (e.target.id !== 'member-q') return;
  clearTimeout(searchTimer);
  const term = e.target.value.trim().replace(/^@/, '');
  const box = $app.querySelector('#member-suggest');
  if (term.length < 2) { box.innerHTML = ''; return; }
  searchTimer = setTimeout(run(async () => {
    const users = await db.searchUsers(term);
    const ids = new Set(state.data.members.map((m) => m.id));
    box.innerHTML = users.filter((u) => !ids.has(u.id)).map((u) => `<button type="button" data-action="pick-member" data-v="${esc(u.username)}">${avatar(u)}<span><b>${esc(u.displayName)}</b> <span class="muted small">@${esc(u.username)}</span></span></button>`).join('');
  }), 250);
});

// Safety net in case a live update was missed (phone asleep, network change).
setInterval(run(refreshIfIdle), 30000);
document.addEventListener('visibilitychange', run(async () => { if (!document.hidden) await refreshIfIdle(); }));

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); state.installPrompt = e; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

function signedIn() {
  state.authError = ''; state.authInfo = ''; state.authStep = 'email';
  if (location.href.endsWith('#')) history.replaceState(null, '', location.pathname + location.search);
  render();
  if (state.me && !state.me.onboarded) welcomeSheet();
}

// ---------- boot ----------

(async function boot() {
  applyTheme();
  if (!db.configured) {
    $app.innerHTML = `<main class="auth"><div class="auth-card panel stack">
      <h1>Presque prêt</h1>
      <p>Il manque la connexion à Supabase. Renseigne l'URL du projet et la clé publique dans <code>config.js</code>
      (ou dans les variables du dépôt GitHub), puis recharge la page. Tout est expliqué dans le README.</p></div></main>`;
    return;
  }
  $app.innerHTML = '<div class="loading">Chargement…</div>';
  // Signing in from another tab (email link) or signing out elsewhere updates this tab too.
  db.onAuth(run(async (event) => {
    if (event === 'SIGNED_OUT' && state.me) { state.me = null; subscribe(null); render(); }
    if (event === 'SIGNED_IN' && !state.me) { state.me = await db.currentUser(); if (state.me) signedIn(); }
  }));
  try { state.me = await db.currentUser(); } catch (e) { state.me = null; toast(e.message, true); }
  if (db.urlAuthError && !state.me) state.authError = db.urlAuthError;
  if (state.me) signedIn(); else render();
})();
