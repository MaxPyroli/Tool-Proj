// Tool Proj front-end: vanilla JS, hash router, event delegation. Data lives in Supabase (see data.js).
import * as db from './data.js';

const $app = document.getElementById('app');
const sheet = document.getElementById('sheet');

const STATUS = { idea: 'Idée', active: 'En cours', paused: 'En pause', done: 'Terminé' };
const TASK = { todo: 'À faire', doing: 'En cours', done: 'Fait' };
const TASK_COLOR = { todo: 'var(--muted)', doing: 'var(--st-paused)', done: 'var(--st-active)' };
const NOTE_COLORS = { yellow: 'Jaune', pink: 'Rose', blue: 'Bleu', green: 'Vert', orange: 'Orange', purple: 'Violet' };
const PROJECT_COLORS = ['#0d7c72', '#3b6fd8', '#7048c8', '#d6336c', '#e8590c', '#2b8a3e', '#5c6370'];
const EMOJIS = ['🚀', '📱', '💡', '🛠️', '🎮', '🛒', '📊', '🎨', '🤖', '🌱'];
// Drawn icons (follow the text colour): interface, project and profile pictures.
const ICON_PATHS = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  out: '<path d="M7 17L17 7M9 7h8v8"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  calendar: '<rect x="3.500" y="5" width="17" height="15.500" rx="3"/><path d="M3.500 10h17M8 3v4M16 3v4"/>',
  thumb: '<path d="M8 11v9H4.500a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1H8zm0 0l3.200-6.500A1.800 1.800 0 0 1 14.500 6l-.700 4H19a1.700 1.700 0 0 1 1.700 2.100l-1.400 6.200A2 2 0 0 1 17.400 20H8"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.300l2.900 2.900L16.200 9.500"/>',
  bug: '<path d="M9 8.500a3 3 0 0 1 6 0M8 9h8v5a4 4 0 0 1-8 0V9zM12 9v9M8 12H4M16 12h4M8.500 16.500L5.500 18.500M15.500 16.500l3 2M9 5.500L7.500 3.500M15 5.500l1.500-2"/>',
  bulb: '<path d="M9.500 17.500h5M10 20.500h4M12 3.500a6 6 0 0 0-3.500 10.900c.700.600 1 1.300 1 2.100h5c0-.800.300-1.500 1-2.100A6 6 0 0 0 12 3.500z"/>',
  spark: '<path d="M12 3.500l1.900 5.600 5.600 1.900-5.600 1.900L12 18.500l-1.900-5.600L4.500 11l5.600-1.900L12 3.500zM19 3v3M17.500 4.500h3"/>',
  folder: '<path d="M3.500 7.500a2 2 0 0 1 2-2H9l2 2.500h7.500a2 2 0 0 1 2 2V17.500a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10z"/>',
  note: '<path d="M5 5.500a1.500 1.500 0 0 1 1.500-1.500h11A1.500 1.500 0 0 1 19 5.500V14l-5 6H6.500A1.500 1.500 0 0 1 5 18.500v-13zM19 14h-4a1 1 0 0 0-1 1v5M8.500 8.500h7M8.500 12h4"/>',
  map: '<path d="M9 5L3.500 7v12L9 17l6 2 5.500-2V5L15 7 9 5zM9 5v12M15 7v12"/>',
  rocket: '<path d="M12 3c3 2 5 5.500 5 9.500L12 18l-5-5.500C7 8.500 9 5 12 3z"/><circle cx="12" cy="10" r="1.800"/><path d="M7 13.500L4.500 16l3 .500M17 13.500l2.500 2.500-3 .500M12 18v3"/>',
  phone: '<rect x="7" y="2.500" width="10" height="19" rx="2.500"/><path d="M11 18.500h2"/>',
  gear: '<circle cx="12" cy="12" r="3.200"/><path d="M12 3v2.500M12 18.500V21M3 12h2.500M18.500 12H21M5.600 5.600l1.800 1.800M16.600 16.600l1.800 1.800M5.600 18.400l1.800-1.800M16.600 7.400l1.800-1.800"/>',
  gamepad: '<path d="M7 8h10a4.500 4.500 0 0 1 4.400 5.400l-.800 4a2.200 2.200 0 0 1-3.800 1L15 16H9l-2.800 2.400a2.200 2.200 0 0 1-3.800-1l-.800-4A4.500 4.500 0 0 1 7 8z"/><path d="M8 10.500v3M6.500 12h3"/><path d="M15.500 11.500h.01M17.500 13h.01"/>',
  cart: '<path d="M3 4h2.500l2 11h10l2-8H6.500"/><circle cx="9" cy="19.500" r="1.300"/><circle cx="17" cy="19.500" r="1.300"/>',
  chart: '<path d="M5 20V11M12 20V4M19 20v-6"/>',
  palette: '<path d="M12 3.500a8.500 8.500 0 1 0 0 17c1.400 0 2-1 1.500-2.100-.600-1.300.100-2.400 1.500-2.400h2A3.500 3.500 0 0 0 20.500 12 8.500 8.500 0 0 0 12 3.500z"/><path d="M8 11h.01M12 7.800h.01M16 11h.01"/>',
  robot: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V4.500M3 13v2M21 13v2M9.500 13h.01M14.500 13h.01M10 16.500h4"/>',
  plant: '<path d="M12 20.500V11M12 11C12 7.500 9.500 5 6 5c0 3.500 2.500 6 6 6zM12 14c0-3 2-5 5.500-5 0 3-2.200 5-5.500 5zM8.500 20.500h7"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.800 2.600 3.500 5.700 3.500 9s-.700 6.400-3.500 9c-2.800-2.600-3.500-5.700-3.500-9S9.200 5.600 12 3z"/>',
  book: '<path d="M5 4.500h11.500a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2V4.500zM5 18a2 2 0 0 1 2-2h11.500"/>',
  camera: '<path d="M4 8h3l1.500-2.500h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.500"/>',
  music: '<path d="M9 17.500V6l10-2v11.500"/><circle cx="6.500" cy="17.500" r="2.500"/><circle cx="16.500" cy="15.500" r="2.500"/>',
  flag: '<path d="M5.500 21V4M5.500 4.500h11l-2 4 2 4h-11"/>',
  star: '<path d="M12 3.500l2.600 5.300 5.800.800-4.200 4.100 1 5.800L12 16.800l-5.200 2.700 1-5.800L3.600 9.600l5.800-.800L12 3.500z"/>',
  heart: '<path d="M12 20s-7.500-4.500-7.500-10A4.300 4.300 0 0 1 12 7.500 4.300 4.300 0 0 1 19.500 10c0 5.500-7.500 10-7.500 10z"/>',
  bolt: '<path d="M13 3L5 13.500h6L10 21l8-10.500h-6L13 3z"/>',
  flame: '<path d="M12 21a6.500 6.500 0 0 0 6.500-6.500c0-3.500-2.500-5.500-3.500-8-2 1-3 3-3 4.500C11 9.500 9 8.500 9 6.500 6.500 9 5.500 11.500 5.500 14.500A6.500 6.500 0 0 0 12 21z"/>',
  moon: '<path d="M19.500 14.500A8 8 0 0 1 9.500 4.500a8 8 0 1 0 10 10z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.500V5M12 19v2.500M2.500 12H5M19 12h2.500M5.300 5.300l1.800 1.800M16.900 16.900l1.800 1.800M5.300 18.700l1.800-1.800M16.900 7.100l1.800-1.800"/>',
  leaf: '<path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14zM5 19l7-7"/>',
  cloud: '<path d="M7 18.500a4.500 4.500 0 0 1-.500-9 6 6 0 0 1 11.500 1.500 3.800 3.800 0 0 1-.500 7.500H7z"/>',
  crown: '<path d="M4 18.500h16M4.500 17L3.500 7.500l5 4 3.500-6 3.500 6 5-4-1 9.500H4.500z"/>',
  diamond: '<path d="M6.500 4.500h11l3.500 5-9 10.500L3 9.500l3.500-5zM3 9.500h18"/>',
  ghost: '<path d="M5 20.500V11a7 7 0 0 1 14 0v9.500l-2.300-2-2.400 2-2.300-2-2.300 2-2.400-2L5 20.500z"/><path d="M9.500 11h.01M14.500 11h.01"/>',
  cat: '<path d="M5 20V6.500l4.500 3h5l4.500-3V20H5z"/><path d="M9.500 13.500h.01M14.500 13.500h.01M11 16.500h2"/>',
  paw: '<path d="M8 9h.01M16 9h.01M4.500 14h.01M19.500 14h.01" stroke-width="3.600"/><path d="M12 12.500c3 0 5.500 3 5.500 5.200 0 1.500-1.500 2-2.500 1.500-1-.500-2-.800-3-.800s-2 .300-3 .800c-1 .500-2.500 0-2.500-1.500 0-2.200 2.500-5.200 5.500-5.200z"/>',
  fish: '<path d="M3 12c3-5 8-6 12-3.500L21 6v12l-6-2.500C11 18 6 17 3 12z"/><path d="M8.500 11.500h.01"/>',
  planet: '<circle cx="12" cy="12" r="5"/><ellipse cx="12" cy="12" rx="10" ry="3.500" transform="rotate(-20 12 12)"/>',
  mountain: '<path d="M3 19.500l6.500-11 4 6 2-3 5.500 8H3z"/>',
  coffee: '<path d="M5 9h11v6a4.500 4.500 0 0 1-4.500 4.500h-2A4.500 4.500 0 0 1 5 15V9zM16 10.500h1.500a2.500 2.500 0 0 1 0 5H16M8 3.500v2M12 3.500v2"/>',
  anchor: '<circle cx="12" cy="5.500" r="2"/><path d="M12 7.500v13M7.500 11h9M4 14c.500 3.500 3.500 6.500 8 6.500s7.500-3 8-6.500"/>',
};
const ico = (n, size = 18) => `<svg class="ico" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[n]}</svg>`;
// Project and profile pictures are emoji; "i:<name>" values (drawn icons, briefly offered in 0.13.0) still show.
const glyphName = (v) => (typeof v === 'string' && v.startsWith('i:') && ICON_PATHS[v.slice(2)] ? v.slice(2) : '');
const glyph = (v, size = '1em') => (glyphName(v) ? ico(glyphName(v), size) : esc(v));
const BOARD_W = 3000, BOARD_H = 2400;
const APP_VERSION = '0.13.1';
const APP_BUILD = 'dev'; // replaced by the build number when GitHub deploys the site
document.documentElement.dataset.appv = `${APP_VERSION}+${APP_BUILD}`;

// Redrawing replaces the page content: remember where the reader was so the screen doesn't jump to the top.
let lastViewKey = null;
function redraw(key, draw) {
  const same = key === lastViewKey;
  const y = window.scrollY;
  const chips = document.querySelector('.chips')?.scrollLeft ?? 0;
  draw();
  lastViewKey = key;
  window.scrollTo(0, same ? y : 0);
  const c = document.querySelector('.chips');
  if (c && same) c.scrollLeft = chips;
}

const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

const state = {
  me: null, authStep: 'email', authEmail: '', authError: '', authInfo: '',
  projects: [], filter: 'all',
  pid: null, data: null, tab: 'apercu',
  activityOpen: store.get('activityOpen', '0') === '1',
  taskCol: 'todo', roadmapCol: 'now', taskView: store.get('taskView', 'list'), taskFilter: 'all', showDone: false,
  boardView: store.get('boardView', matchMedia('(max-width: 719px)').matches ? 'grid' : 'wall'),
  dragging: false, installPrompt: null,
};

// ---------- utils ----------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isPhone = () => matchMedia('(max-width: 719px)').matches;
const initials = (name = '?') => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const hue = (id) => [...String(id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
// Profile picture: the icon and colour each person picked, or their initials.
const AVATAR_EMOJIS = ['🦊', '🐼', '🐸', '🐙', '🦄', '🐱', '🐶', '🐻', '🐨', '🐯', '🦁', '🐵', '🐧', '🦉', '🐢', '🐳', '🦖', '🐝', '👾', '🤖', '👻', '🧙', '🥷', '🧑‍🚀', '🌵', '🍕', '🍩', '🚀', '⚡', '🌈', '🎧', '🎮', '🎸', '🍀', '🔥', '💎'];
const AVATAR_COLORS = ['#ffd8a8', '#ffc9c9', '#fcc2d7', '#eebefa', '#d0bfff', '#a5d8ff', '#99e9f2', '#96f2d7', '#b2f2bb', '#ffec99', '#dee2e6'];
const avatar = (u, cls = '') => {
  if (!u) return '';
  const style = u.avatarColor ? `--h:${hue(u.id)};background:${u.avatarColor};color:#1b2130` : `--h:${hue(u.id)}`;
  return `<span class="avatar ${cls}${u.avatarEmoji ? ' emoji' : ''}" style="${style}" title="${esc(u.displayName)}">${u.avatarEmoji ? glyph(u.avatarEmoji) : esc(initials(u.displayName))}</span>`;
};

/** Emoji + colour picker, used on the welcome screen and in Mon compte. */
function avatarPicker(me) {
  return `
  <div class="field avatar-picker"><span>Ton icône</span>
    <div class="row" style="gap:14px;align-items:center">
      <span id="av-preview">${avatar(me, 'xl')}</span>
      <p class="small muted grow">Choisis un emoji et une couleur. Sans emoji, ce sont tes initiales.</p>
    </div>
    <div class="emoji-grid" role="radiogroup" aria-label="Emoji">
      <button type="button" class="emoji-opt initials" data-action="pick-avatar-emoji" data-v="" aria-pressed="${!me.avatarEmoji}" aria-label="Initiales">${esc(initials(me.displayName))}</button>
      ${AVATAR_EMOJIS.map((e) => `<button type="button" class="emoji-opt" data-action="pick-avatar-emoji" data-v="${e}" aria-pressed="${me.avatarEmoji === e}">${e}</button>`).join('')}
    </div>
    <div class="swatches" role="radiogroup" aria-label="Couleur">
      <button type="button" class="swatch auto" data-action="pick-avatar-color" data-v="" aria-pressed="${!me.avatarColor}" aria-label="Couleur automatique" style="--note:hsl(${hue(me.id)} 55% 85%)">A</button>
      ${AVATAR_COLORS.map((c) => `<button type="button" class="swatch" data-action="pick-avatar-color" data-v="${c}" aria-pressed="${me.avatarColor === c}" aria-label="Couleur ${c}" style="--note:${c}"></button>`).join('')}
    </div>
    <input type="hidden" name="avatarEmoji" value="${esc(me.avatarEmoji)}"><input type="hidden" name="avatarColor" value="${esc(me.avatarColor)}">
  </div>`;
}

function refreshAvatarPreview(form) {
  const f = form.elements;
  const u = { ...state.me, displayName: f.displayName?.value || state.me.displayName, avatarEmoji: f.avatarEmoji.value, avatarColor: f.avatarColor.value };
  form.querySelector('#av-preview').innerHTML = avatar(u, 'xl');
  form.querySelector('.emoji-opt.initials').textContent = initials(u.displayName);
}
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

// Links: the kind (and icon) is guessed from the address.
const LINK_KINDS = [
  { id: 'github', name: 'GitHub', fill: true, test: /(^|\.)(github\.com|githubusercontent\.com)$/, glyph: '<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>' },
  { id: 'supabase', name: 'Supabase', fill: true, test: /(^|\.)supabase\.(com|co|io)$/, glyph: '<path d="M21.362 9.354H12V.396a.396.396 0 0 0-.716-.233L2.203 12.424l-.401.562a1.04 1.04 0 0 0 .836 1.659H12v8.959a.396.396 0 0 0 .716.233l9.081-12.261.401-.562a1.04 1.04 0 0 0-.836-1.66z"/>' },
  { id: 'claude', name: 'Claude', fill: true, test: /(^|\.)(claude\.ai|claude\.com|anthropic\.com)$/, glyph: '<path d="M12 1.5l2.2 7.3 7.3-2.2-5.3 5.4 5.3 5.4-7.3-2.2L12 22.5l-2.2-7.3-7.3 2.2 5.3-5.4-5.3-5.4 7.3 2.2z"/>' },
  { id: 'design', name: 'Maquette', test: /(^|\.)(figma\.com|canva\.com|penpot\.app|miro\.com)$/, glyph: '<path d="M12 19l7-7 3 3-7 7zM18 13l-1.5-7.5L2 2l3.5 14.5 7.5 1.5zM2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>' },
  { id: 'store', name: 'Store', test: /(^|\.)(apps\.apple\.com|testflight\.apple\.com|play\.google\.com|appstoreconnect\.apple\.com)$/, glyph: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/>' },
  { id: 'doc', name: 'Document', test: /(^|\.)(notion\.so|notion\.site|docs\.google\.com|drive\.google\.com|trello\.com|linear\.app)$/, glyph: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>' },
  { id: 'site', name: 'Site', test: /./, glyph: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>' },
];
const linkKind = (url) => {
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { /* keep generic */ }
  return LINK_KINDS.find((k) => k.test.test(host)) || LINK_KINDS.at(-1);
};
const linkIcon = (k) => `<svg viewBox="0 0 24 24" width="20" height="20" ${k.fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true">${k.glyph}</svg>`;
const linkLabel = (l) => l.label || `${linkKind(l.url).name}`;
const linkHost = (url) => { try { const u = new URL(url); return u.hostname.replace(/^www\./, '') + (u.pathname.length > 1 ? u.pathname.replace(/\/$/, '') : ''); } catch { return url; } };

const icon = {
  key: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.7-8.7M17 6l3 3M14.5 8.5l2 2"/></svg>',
  overview: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  tasks: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 7 2 2 4-4M4 17l2 2 4-4M13 7h8M13 17h8"/></svg>',
  notes: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 4h16v11l-5 5H4z"/><path d="M15 20v-5h5"/></svg>',
  team: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.8 3 2.6 3.5 5.2"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  gear: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
};

function toast(msg, err = false, action = null) {
  const el = document.createElement('div');
  el.className = `toast${err ? ' err' : ''}${action ? ' has-act' : ''}`;
  el.textContent = msg;
  if (action) {
    const b = document.createElement('button');
    b.className = 'toast-act'; b.textContent = action.label;
    b.addEventListener('click', () => { el.remove(); action.fn(); });
    el.append(b);
  }
  document.getElementById('toasts').append(el);
  setTimeout(() => el.remove(), err ? 4500 : action ? 9000 : 2500);
}

/** Wraps an async action: shows its error as a toast. */
const run = (fn) => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message, true); } };

function applyTheme() {
  const t = store.get('theme', 'auto');
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = t;
}

// ---------- sheet (modal) ----------

let sheetCleanup = null, sheetAt = 0;
function openSheet(html, onMount) {
  sheetCleanup?.();
  sheetCleanup = null;
  sheet.innerHTML = `<div class="sheet-body">${html}</div>`;
  if (!sheet.open) sheet.showModal();
  sheetAt = Date.now();
  sheetCleanup = onMount?.(sheet) || null;
  const auto = sheet.querySelector('[autofocus]');
  if (auto && !isPhone()) auto.focus();
}
function closeSheet() {
  sheetCleanup?.();
  sheetCleanup = null;
  if (sheet.open) sheet.close();
}
// the click that follows a tap lands on the backdrop right after opening: ignore it
sheet.addEventListener('click', (e) => { if (e.target === sheet && Date.now() - sheetAt > 450) closeSheet(); });
sheet.addEventListener('close', () => { sheetCleanup?.(); sheetCleanup = null; });
sheet.addEventListener('input', (e) => {
  const form = e.target.form;
  if (e.target.name?.startsWith('tc_') && form?.elements.taskStyle) refreshStylePreview(form);
  if (e.target.name === 'displayName' && form?.elements.avatarEmoji) refreshAvatarPreview(form);
});

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
  if (route().name !== 'project') { applyTaskStyle(null); wallApi = null; if (state.wall) state.wall.fs = false; document.documentElement.classList.remove('wall-open'); }
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
  if (sheet.open || state.dragging || state.panning || ($app.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) {
    clearTimeout(staleTimer); staleTimer = setTimeout(refreshIfIdle, 2000); // try again once idle
    return;
  }
  const fresh = await db.getProject(state.pid, state.me.id);
  if (JSON.stringify(fresh) !== JSON.stringify(state.data)) { state.data = fresh; renderProject(); }
}

// ---------- auth ----------

function renderAuth() {
  lastViewKey = null;
  const codeStep = state.authStep === 'code';
  const passkeys = db.passkeysSupported();
  $app.innerHTML = `
  <main class="auth">
    <div class="auth-card">
      <div class="auth-hero">
        <a class="brand" href="#/"><img src="icons/icon.svg" alt="">Tool Proj</a>
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
      ${avatarPicker(me)}
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
      <span class="emoji-badge">${glyph(p.emoji)}</span>
      <div class="grow stack" style="gap:4px">
        <h2>${esc(p.name)}</h2>
        <div class="row" style="gap:6px"><span class="pill ${p.status}">${STATUS[p.status]}</span>${p.role === 'admin' ? '<span class="role admin">admin</span>' : ''}</div>
      </div>
    </div>
    ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ''}
    <div class="pcard-progress">
      <div class="row between small"><span class="muted">Avancement</span><strong class="num">${p.progress} %</strong></div>
      <div class="progress"><i style="width:${p.progress}%"></i></div>
    </div>
    <div class="pcard-foot">
      <div class="stats"><span>${p.tasks.total - p.tasks.done} à faire</span><span>${p.noteCount} post-it</span><span>${timeAgo(p.updatedAt)}</span></div>
      <div class="avatars">${p.members.slice(0, 4).map((m) => avatar(m)).join('')}</div>
    </div>
  </a>`;
}

function renderList() {
  const counts = { all: state.projects.length };
  for (const s of Object.keys(STATUS)) counts[s] = state.projects.filter((p) => p.status === s).length;
  const shown = state.filter === 'all' ? state.projects : state.projects.filter((p) => p.status === state.filter);
  redraw(`list/${state.filter}`, () => { $app.innerHTML = `
  ${topbar(`<a class="brand" href="#/"><img src="icons/icon.svg" alt="">Tool Proj</a><span class="grow"></span>
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
      : `<div class="empty"><div class="big">${ico('folder', 44)}</div><p>${counts.all ? 'Aucun projet avec ce statut.' : "Aucun projet pour l'instant."}</p>
         ${counts.all ? '' : '<button class="btn primary" data-action="new-project">Créer un projet</button>'}</div>`}
  </main>
  <button class="fab hide-lg" data-action="new-project" aria-label="Nouveau projet">+ Projet</button>`; });
}

function topbar(inner) {
  return `<header class="topbar"><div class="topbar-inner">${inner}
    <button class="btn ghost icon" data-action="account" aria-label="Mon compte">${avatar(state.me)}</button></div></header>`;
}

// ---------- project form ----------

const SAMPLE_TASKS = { task: 'Écran de connexion', bug: 'Crash au lancement', idea: 'Et si on avait un mode sombre ?', improvement: 'Chargement plus rapide' };

function stylePreviewHtml(p) {
  const c = typeColors(p);
  const vars = TYPE_LIST.map((k) => `--c-${k}:${c[k]}`).join(';');
  return `<div class="style-preview items" data-tstyle="${styleOf(p)}" style="${vars}" aria-hidden="true">
    ${TYPE_LIST.map((k) => `<div class="task t-${k}"><span class="check"></span><div class="t-main"><span class="t-title">${esc(SAMPLE_TASKS[k])}</span>${typeTag({ type: k }) ? `<span class="t-meta">${typeTag({ type: k })}</span>` : ''}</div></div>`).join('')}
  </div>`;
}

/** Style presets + one colour per type, with a live preview. */
function taskStyleField(p) {
  const colors = typeColors(p);
  return `
  <div class="field style-field"><span>Style des tâches</span>
    <div class="style-grid" role="radiogroup" aria-label="Style">
      ${Object.entries(TASK_STYLES).map(([k, st]) => `<button type="button" class="style-card" data-action="pick-style" data-v="${k}" aria-pressed="${k === styleOf(p)}">
        <span class="style-dots">${TYPE_LIST.map((t) => `<i style="background:${st.colors[t]}"></i>`).join('')}</span><b>${st.name}</b><small>${st.hint}</small></button>`).join('')}
    </div>
    <input type="hidden" name="taskStyle" value="${styleOf(p)}">
    <span class="sub">Couleur de chaque type</span>
    <div class="type-colors">${TYPE_LIST.map((t) => `<label class="tc-pick"><input type="color" name="tc_${t}" value="${colors[t]}" aria-label="Couleur ${TYPES[t]}"><span>${typeLabel(t)}</span></label>`).join('')}</div>
    <button type="button" class="link-btn small" data-action="reset-type-colors" style="justify-self:start">Revenir aux couleurs du style</button>
    <div id="style-preview-box">${stylePreviewHtml(p)}</div>
  </div>`;
}

/** Reads the form's current style + colours and redraws the preview. */
function refreshStylePreview(form) {
  const f = form.elements;
  const p = { taskStyle: f.taskStyle.value, typeColors: Object.fromEntries(TYPE_LIST.map((t) => [t, f[`tc_${t}`].value])) };
  form.querySelector('#style-preview-box').innerHTML = stylePreviewHtml(p);
}
function setFormColors(form, style) {
  TYPE_LIST.forEach((t) => { form.elements[`tc_${t}`].value = TASK_STYLES[style].colors[t]; });
}

function projectForm(p) {
  const editing = !!p;
  p ||= { name: '', description: '', emoji: '🚀', color: PROJECT_COLORS[0], status: 'idea', manualProgress: 0, dueDate: '', tasks: { total: 0 } };
  openSheet(`
    <form class="stack" data-form="${editing ? 'edit-project' : 'new-project'}">
      <div class="sheet-head"><h2 id="sheet-title">${editing ? 'Paramètres du projet' : 'Nouveau projet'}</h2><button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">${ico('x')}</button></div>
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
        <label class="field"><span>Avancement : <b class="num" id="pf-prog-v">${p.manualProgress} %</b></span>
          <input type="range" id="pf-prog" name="manualProgress" min="0" max="100" step="5" value="${p.manualProgress}">
          <small class="muted">Ton estimation de l'avancement global. Les tâches ajoutées ne la changent pas.</small></label>
        ${taskStyleField(p)}` : ''}
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
  applyTaskStyle(p);
  const isAdmin = p.role === 'admin';
  const openTasks = d.tasks.filter((t) => t.status !== 'done').length;
  const tabs = [
    ['apercu', 'Aperçu', icon.overview, ''],
    ['taches', 'Tâches', icon.tasks, openTasks],
    ['idees', 'Post-it', icon.notes, d.notes.length],
    ['equipe', 'Équipe', icon.team, d.members.length],
  ];
  syncWallChrome();
  document.body.classList.add('with-tabbar');
  redraw(`p${p.id}/${state.tab}/${state.taskView}/${state.boardView}/${state.wall?.fs ? 'fs' : ''}`, () => { $app.innerHTML = `
  ${topbar(`
    <a class="btn ghost icon" href="#/" aria-label="Retour aux projets">${icon.back}</a>
    <div class="title" style="--pc:${esc(p.color)}"><span class="emoji-badge">${glyph(p.emoji)}</span><h1>${esc(p.name)}</h1><span class="pill ${p.status} hide-sm">${STATUS[p.status]}</span></div>
    ${isAdmin ? `<button class="btn ghost icon" data-action="edit-project" aria-label="Paramètres du projet">${icon.gear}</button>` : ''}`)}
  <nav class="tabs" aria-label="Sections du projet">
    ${tabs.map(([k, l, ic, n]) => `<a class="tab" href="#/p/${p.id}/${k}" ${state.tab === k ? 'aria-current="page"' : ''}><span class="ico">${ic}</span>${l}${n ? `<span class="count num">${n}</span>` : ''}</a>`).join('')}
  </nav>
  <main class="page" style="--pc:${esc(p.color)}">
    ${{ apercu: viewOverview, taches: viewTasks, idees: viewNotes, equipe: viewTeam }[state.tab](d)}
  </main>
  ${state.tab === 'idees' ? '<button class="fab hide-lg" data-action="new-note">+ Post-it</button>' : ''}
  ${state.tab === 'taches' ? '<button class="fab hide-lg" data-action="new-item">+ Ajouter</button>' : ''}`; });

  const wallEl = state.tab === 'idees' && state.boardView === 'wall' ? $app.querySelector('.board-wrap.wall') : null;
  if (wallEl) bindWall(wallEl); else wallApi = null;
  if (state.tab === 'taches') bindTaskDnD();
}

function linksBlock(d) {
  const admin = d.project.role === 'admin';
  if (!d.links.length && !admin) return '';
  return `<div class="stack" style="gap:8px">
    <div class="row between"><span class="label">Liens</span>${admin && d.links.length ? '<button class="link-btn small" data-action="manage-links">Gérer</button>' : ''}</div>
    ${d.links.length ? `<div class="links">${d.links.map((l) => { const k = linkKind(l.url); return `
      <a class="link-chip lk-${k.id}" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">
        <span class="lk-ico">${linkIcon(k)}</span>
        <span class="lk-text"><b>${esc(linkLabel(l))}</b><small>${esc(linkHost(l.url))}</small></span>
        <span class="lk-out" aria-hidden="true">${ico('out', 16)}</span>
      </a>`; }).join('')}</div>`
      : `<button class="btn wrap-text" data-action="manage-links">+ Ajouter un lien <span class="muted small">GitHub, Supabase, Claude…</span></button>`}
  </div>`;
}

/** Admin sheet: list, add, edit and remove the project's links. */
function linksSheet(editId = null) {
  const d = state.data;
  const cur = d.links.find((l) => l.id === editId) || { label: '', url: '' };
  openSheet(`
    <div class="sheet-head"><h2 id="sheet-title">Liens du projet</h2><button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">${ico('x')}</button></div>
    ${d.links.length ? `<div class="members">${d.links.map((l) => { const k = linkKind(l.url); return `
      <div class="member lk-${k.id}"><span class="lk-ico">${linkIcon(k)}</span>
        <div class="grow"><strong>${esc(linkLabel(l))}</strong><span class="small muted lk-url">${esc(linkHost(l.url))}</span></div>
        <button class="btn sm ghost" data-action="edit-link" data-id="${l.id}">Modifier</button>
        <button class="btn sm ghost" data-action="delete-link" data-id="${l.id}" aria-label="Supprimer ${esc(linkLabel(l))}">Supprimer</button></div>`; }).join('')}</div>` : '<p class="small muted">Aucun lien pour le moment.</p>'}
    <form class="stack panel" data-form="save-link" data-id="${editId || ''}" novalidate>
      <h3>${editId ? 'Modifier le lien' : 'Ajouter un lien'}</h3>
      <label class="field"><span>Adresse</span><input class="input" id="lk-url" name="url" type="url" inputmode="url" autocapitalize="none" spellcheck="false" value="${esc(cur.url)}" placeholder="github.com/toi/mon-app" ${editId ? '' : 'autofocus'}></label>
      <label class="field"><span>Nom <small class="muted">(facultatif : sinon GitHub, Supabase, Claude…)</small></span><input class="input" id="lk-label" name="label" maxlength="80" value="${esc(cur.label)}" placeholder="ex. Code, Base de données, Conversation de départ"></label>
      <p class="small muted">Colle l'adresse d'un dépôt GitHub, d'un projet Supabase, d'une conversation Claude, d'une maquette Figma, du site en ligne ou de la fiche sur le store.</p>
      <div class="row end">${editId ? '<button type="button" class="btn ghost" data-action="manage-links">Annuler</button>' : ''}<button class="btn primary" type="submit">${editId ? 'Enregistrer' : 'Ajouter'}</button></div>
    </form>`);
}

function viewOverview(d) {
  const p = d.project;
  const top = [...d.notes].filter((n) => n.votes > 0).sort((a, b) => b.votes - a.votes).slice(0, 3);
  const todo = d.tasks.filter((t) => t.status === 'todo').length;
  const bugs = d.tasks.filter((t) => t.type === 'bug' && t.status !== 'done').length;
  const now = d.epics.filter((e) => e.horizon === 'now').sort(sortEpics);
  const nowItems = d.tasks.filter((t) => now.some((e) => e.id === t.epicId));
  const nowDone = nowItems.filter((t) => t.status === 'done').length;
  const nowPr = { done: nowDone, total: nowItems.length, pct: nowItems.length ? Math.round((nowDone / nowItems.length) * 100) : 0 };
  return `
  <div class="overview">
    <section class="panel">
      <div class="hero">
        <div class="ring" style="--p:${p.progress}" role="img" aria-label="Avancement ${p.progress} %"><div><div><strong class="num">${p.progress}%</strong><small>avancement</small></div></div></div>
        <div class="stack grow" style="gap:8px">
          <div class="row"><span class="pill ${p.status}">${STATUS[p.status]}</span><span class="role ${p.role}">${p.role === 'admin' ? 'tu es admin' : 'tu es membre'}</span></div>
          ${p.role === 'admin' ? `<label class="prog-edit"><span class="small muted">Ajuster l'avancement</span>
            <input type="range" id="ov-prog" min="0" max="100" step="5" value="${p.progress}" data-change="progress" aria-label="Avancement du projet"></label>`
            : '<p class="muted small">Avancement estimé par les admins du projet.</p>'}
          ${nowPr.total ? `<div class="now-progress"><div class="row between small"><span class="muted">Chantiers « Maintenant »</span><span class="num"><b>${nowPr.done}/${nowPr.total}</b> faits · ${nowPr.pct} %</span></div>
            <div class="progress"><i style="width:${nowPr.pct}%"></i></div></div>` : ''}
          <div class="meta">
            ${p.dueDate ? `<span class="with-ico">${ico('calendar', 15)} ${esc(dueLabel(p.dueDate))}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="kv">
        <div><span class="label">À faire</span><strong class="num">${todo}</strong></div>
        <div><span class="label">En cours</span><strong class="num">${p.tasks.doing}</strong></div>
        <div><span class="label">Fait</span><strong class="num">${p.tasks.done}</strong></div>
        <div class="${bugs ? 'warn' : ''}"><span class="label">Bugs ouverts</span><strong class="num">${bugs}</strong></div>
      </div>
      ${linksBlock(d)}
      ${p.description ? `<div class="stack" style="gap:6px"><span class="label">Description</span><p class="description">${esc(p.description)}</p></div>`
        : p.role === 'admin' ? '<p class="muted small">Pas encore de description. <button class="link-btn" data-action="edit-project">En ajouter une</button></p>' : ''}
    </section>
    <div class="stack" style="gap:16px">
      <section class="panel">
        <div class="row between"><h3>Chantiers en cours</h3><button class="link-btn small" data-action="goto-roadmap">Feuille de route</button></div>
        ${now.length ? `<div class="stack" style="gap:12px">${now.map((e) => { const pr = epicProgress(d, e.id); return `
          <button class="now-epic" data-action="open-epic" data-id="${e.id}"><span class="row between"><b>${esc(e.title)}</b><span class="small muted num">${pr.done}/${pr.total}</span></span>
          <span class="progress"><i style="width:${pr.pct}%"></i></span></button>`; }).join('')}</div>`
          : '<p class="muted small">Aucun chantier dans « Maintenant ». Range tes grandes idées dans la feuille de route.</p>'}
      </section>
      <section class="panel">
        <div class="row between"><h3>Idées les plus votées</h3><a class="small" href="#/p/${p.id}/idees">Voir le mur</a></div>
        ${top.length ? `<div class="top-ideas">${top.map((n) => `<button class="mini-note c-${n.color}" data-action="open-note" data-id="${n.id}"><span>${esc(n.text.split('\n')[0] || 'Post-it vide')}</span><span class="num with-ico">${ico('thumb', 13)} ${n.votes}</span></button>`).join('')}</div>`
          : `<p class="muted small">Vote pour les post-it avec le pouce ${ico('thumb', 14)} : les favoris apparaîtront ici.</p>`}
      </section>
      <section class="panel activity">
        <button class="panel-toggle" data-action="toggle-activity" aria-expanded="${state.activityOpen}">
          <h3>Activité récente</h3>${d.activity.length ? `<span class="count num">${d.activity.length}</span>` : ''}<span class="chev" aria-hidden="true">${state.activityOpen ? '▴' : '▾'}</span>
        </button>
        ${!d.activity.length ? '<p class="muted small">Rien pour le moment.</p>'
          : state.activityOpen ? `<ul class="feed">${d.activity.map((a) => `<li><span class="grow"><b>${esc(a.user || 'Quelqu\'un')}</b> ${esc(a.message)}<time>${timeAgo(a.createdAt)}</time></span></li>`).join('')}</ul>
            <p class="small muted">Les plus anciens disparaissent tout seuls (20 au plus, 14 jours).</p>`
          : `<p class="small muted act-last"><b>${esc(d.activity[0].user || 'Quelqu\'un')}</b> ${esc(d.activity[0].message)} · ${timeAgo(d.activity[0].createdAt)}</p>`}
      </section>
    </div>
  </div>`;
}

function noteHtml(n, wall) {
  const rot = (((n.id * 37) % 7) - 3) * 0.7;
  return `
  <article class="note c-${n.color}" data-note="${n.id}" ${wall ? '' : `data-action="open-note" data-id="${n.id}"`}
    style="--rot:${rot}deg;${wall ? `left:${n.x}px;top:${n.y}px;z-index:${n.z}` : ''}" tabindex="0" aria-label="Post-it : ${esc(n.text.slice(0, 60))}">
    <div class="n-text">${esc(n.text)}</div>
    <div class="n-foot"><span class="who">${esc(n.author || '')}</span>
      <button class="vote ${n.voted ? 'on' : ''}" data-action="vote" data-id="${n.id}" aria-pressed="${n.voted}" aria-label="Voter">${ico('thumb', 14)} <span class="num">${n.votes}</span></button></div>
  </article>`;
}

function viewNotes(d) {
  const wall = state.boardView === 'wall';
  const sorted = wall ? d.notes : [...d.notes].sort((a, b) => b.votes - a.votes || a.id - b.id);
  return `
  <div class="board-tools">
    <button class="btn primary hide-sm" data-action="new-note">+ Post-it</button>
    <div class="seg" style="margin:0">
      <button data-action="board-view" data-v="wall" aria-pressed="${wall}">Mur</button>
      <button data-action="board-view" data-v="grid" aria-pressed="${!wall}">Grille</button>
    </div>
    <p class="muted small grow">${wall ? 'Glisse le fond pour te déplacer, pince (ou Ctrl + molette) pour zoomer, touche un post-it pour le modifier.' : 'Les plus votés d\'abord, puis par ordre d\'ajout.'}</p>
  </div>
  ${!d.notes.length ? `<div class="empty"><div class="big">${ico('note', 44)}</div><p>Aucun post-it. Note ici les idées, les bugs à régler, les envies…</p><button class="btn primary" data-action="new-note">Coller un post-it</button></div>`
    : wall ? `<div class="board-wrap wall${state.wall?.fs ? ' fs' : ''}" tabindex="0" aria-label="Plan de travail des post-it">
        <div class="board" style="width:${BOARD_W}px;height:${BOARD_H}px">${sorted.map((n) => noteHtml(n, true)).join('')}</div>
        <div class="wall-top"><button class="btn sm" data-action="wall-exit">${ico('x', 15)} Fermer</button><span class="wall-title">Post-it · ${d.notes.length}</span><button class="btn sm primary" data-action="new-note">+ Post-it</button></div>
        <div class="minimap" aria-hidden="true"></div>
        <div class="wall-bar" role="toolbar" aria-label="Zoom et rangement">
          <button class="wb" data-action="wall-zoom" data-v="out" aria-label="Dézoomer">−</button>
          <button class="wb zoom-val" data-action="wall-100" aria-label="Revenir à 100 %">100 %</button>
          <button class="wb" data-action="wall-zoom" data-v="in" aria-label="Zoomer">+</button>
          <button class="wb txt" data-action="wall-fit">Tout voir</button>
          <button class="wb txt" data-action="wall-arrange">Ranger</button>
          ${state.wall?.fs ? '' : `<button class="wb" data-action="wall-fs" aria-label="Plein écran">${ico('expand', 20)}</button>`}
        </div>
      </div>`
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

// ---------- tasks: chantiers + items (tâche / bug / amélioration), three views ----------

const TYPES = { task: 'Tâche', bug: 'Bug', idea: 'Idée', improvement: 'Amélioration' };
const TYPE_ICON_NAME = { task: 'check', bug: 'bug', idea: 'bulb', improvement: 'spark' };
const typeIcon = (k, size = 15) => ico(TYPE_ICON_NAME[k], size);
const TYPE_LIST = Object.keys(TYPES);
const typeLabel = (k) => `<span class="with-ico">${typeIcon(k)} ${TYPES[k]}</span>`;
const NEW_TITLE = { task: 'Nouvelle tâche', bug: 'Nouveau bug', idea: 'Nouvelle idée', improvement: 'Nouvelle amélioration' };

// Task look per project: a style (the shape of cards and tags) and one colour per type, editable by admins.
const TASK_STYLES = {
  classic: { name: 'Classique', hint: 'Sobre, un liseré de couleur.', colors: { task: '#868e96', bug: '#e03131', idea: '#f59f00', improvement: '#7048c8' } },
  candy: { name: 'Bonbon', hint: 'Pastel et tout rond.', colors: { task: '#63e6be', bug: '#ff6b9a', idea: '#ffd43b', improvement: '#9775fa' } },
  neon: { name: 'Néon', hint: 'Ça brille dans le noir.', colors: { task: '#69db7c', bug: '#ff3860', idea: '#ffe600', improvement: '#00c8e6' } },
  paper: { name: 'Papier', hint: 'Des petits papiers collés.', colors: { task: '#adb5bd', bug: '#f76707', idea: '#fab005', improvement: '#4dabf7' } },
  pixel: { name: 'Pixel', hint: 'Rétro, façon jeu 8 bits.', colors: { task: '#51cf66', bug: '#fa5252', idea: '#fcc419', improvement: '#339af0' } },
  sticker: { name: 'Autocollant', hint: 'Gros contours, un peu de travers.', colors: { task: '#38d9a9', bug: '#ff6b6b', idea: '#ffa94d', improvement: '#da77f2' } },
};
const styleOf = (p) => (TASK_STYLES[p?.taskStyle] ? p.taskStyle : 'classic');
const typeColors = (p) => ({ ...TASK_STYLES[styleOf(p)].colors, ...(p?.typeColors || {}) });

/** Puts the project's task style and colours on <body>; null clears them (project list, login). */
function applyTaskStyle(p) {
  const b = document.body;
  if (!p) { delete b.dataset.tstyle; TYPE_LIST.forEach((k) => b.style.removeProperty(`--c-${k}`)); return; }
  b.dataset.tstyle = styleOf(p);
  const c = typeColors(p);
  TYPE_LIST.forEach((k) => b.style.setProperty(`--c-${k}`, c[k]));
}
const PRIORITY = { high: 'Haute', normal: 'Normale', low: 'Basse' };
const HORIZON = { now: 'Maintenant', next: 'Ensuite', later: 'Plus tard', done: 'Terminé' };
const STATUS_ORDER = { doing: 0, todo: 1, done: 2 };
const PRIO_ORDER = { high: 0, normal: 1, low: 2 };
const HORIZON_ORDER = { now: 0, next: 1, later: 2, done: 3 };

const CHECK_SVG = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.800l4.600 4.600L19 7.200"/></svg>';
const typeTag = (t) => (t.type === 'task' ? '' : `<span class="type-tag ty-${t.type}"><i aria-hidden="true">${typeIcon(t.type, 13)}</i>${TYPES[t.type]}</span>`);
const prioTag = (t) => (t.priority === 'high' ? '<span class="prio high" title="Priorité haute">Prioritaire</span>' : t.priority === 'low' ? '<span class="prio low" title="Priorité basse">Basse</span>' : '');
const sortItems = (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority] || a.position - b.position;
const sortEpics = (a, b) => HORIZON_ORDER[a.horizon] - HORIZON_ORDER[b.horizon] || a.position - b.position;

function epicProgress(d, epicId) {
  const items = d.tasks.filter((t) => t.epicId === epicId);
  const done = items.filter((t) => t.status === 'done').length;
  return { items, done, total: items.length, pct: items.length ? Math.round((done / items.length) * 100) : 0 };
}

function matchesFilter(t) {
  const f = state.taskFilter;
  return f === 'all' || (f === 'mine' ? t.assigneeId === state.me.id : t.type === f);
}

function taskRow(t, byId, { draggable = false, showEpic = null } = {}) {
  return `
  <div class="task t-${t.type} ${t.status === 'done' ? 'is-done' : ''}" data-action="open-task" data-id="${t.id}" ${draggable ? 'draggable="true" data-drag="task"' : ''}>
    <button class="check ${t.status}" data-action="toggle-task" data-id="${t.id}" aria-label="${t.status === 'done' ? 'Remettre à faire' : 'Marquer comme fait'}">${t.status === 'done' ? CHECK_SVG : t.status === 'doing' ? '<i class="dot-doing"></i>' : ''}</button>
    <div class="t-main">
      <span class="t-title">${esc(t.title)}</span>
      ${typeTag(t) || prioTag(t) || t.description || showEpic ? `<span class="t-meta">${typeTag(t)}${prioTag(t)}${t.description ? '<span class="has-desc" title="A une description">≡ détails</span>' : ''}${showEpic ? `<span class="t-epic">${esc(showEpic)}</span>` : ''}</span>` : ''}
    </div>
    ${avatar(byId[t.assigneeId])}
  </div>`;
}

function viewTasks(d) {
  const view = state.taskView;
  const open = d.tasks.filter((t) => t.status !== 'done');
  const filters = [['all', 'Tout', open.length], ['bug', 'Bugs', open.filter((t) => t.type === 'bug').length],
    ['idea', 'Idées', open.filter((t) => t.type === 'idea').length],
    ['improvement', 'Améliorations', open.filter((t) => t.type === 'improvement').length], ['task', 'Tâches', open.filter((t) => t.type === 'task').length],
    ['mine', 'À moi', open.filter((t) => t.assigneeId === state.me.id).length]];
  return `
  <div class="task-tools">
    <div class="seg views" role="tablist" aria-label="Affichage">
      ${[['roadmap', 'Feuille de route'], ['list', 'Liste'], ['board', 'Tableau']].map(([k, l]) => `<button data-action="task-view" data-v="${k}" aria-pressed="${view === k}">${l}</button>`).join('')}
    </div>
    <button class="btn primary hide-sm" data-action="new-item">+ Ajouter</button>
  </div>
  ${view !== 'roadmap' ? `<div class="chips" role="toolbar" aria-label="Filtrer">${filters.map(([k, l, n]) => `<button class="chip ${TYPES[k] ? `chip-t ty-${k}` : ''}" data-action="task-filter" data-v="${k}" aria-pressed="${state.taskFilter === k}">${l}<span class="num">${n}</span></button>`).join('')}</div>` : ''}
  ${{ roadmap: viewRoadmap, list: viewList, board: viewBoard }[view](d)}`;
}

function viewRoadmap(d) {
  const draggable = matchMedia('(pointer: fine)').matches;
  const cols = ['now', 'next', 'later'].map((h) => [h, d.epics.filter((e) => e.horizon === h).sort(sortEpics)]);
  const done = d.epics.filter((e) => e.horizon === 'done');
  const loose = d.tasks.filter((t) => !t.epicId && t.status !== 'done').length;
  if (!d.epics.length) {
    return `<div class="empty"><div class="big">${ico('map', 44)}</div><p>Aucun grand chantier pour l'instant.<br>Un chantier regroupe une grosse idée et toutes ses tâches, bugs et améliorations.</p>
      <button class="btn primary" data-action="new-epic">Créer un chantier</button></div>`;
  }
  const card = (e) => {
    const pr = epicProgress(d, e.id);
    const bugs = pr.items.filter((t) => t.type === 'bug' && t.status !== 'done').length;
    return `<article class="epic-card" data-action="open-epic" data-id="${e.id}" ${draggable ? 'draggable="true" data-drag="epic"' : ''}>
      <h3>${esc(e.title)}</h3>
      ${e.description ? `<p class="desc">${esc(e.description)}</p>` : ''}
      <div class="progress"><i style="width:${pr.pct}%"></i></div>
      <div class="row between small muted"><span class="num">${pr.total ? `${pr.done}/${pr.total} fait${pr.done > 1 ? 's' : ''}` : 'Aucun élément'}</span>${bugs ? `<span class="type-tag ty-bug">${bugs} bug${bugs > 1 ? 's' : ''}</span>` : ''}</div>
    </article>`;
  };
  return `
  <div class="seg hide-lg">${cols.map(([h, list]) => `<button data-action="roadmap-col" data-v="${h}" aria-pressed="${state.roadmapCol === h}">${HORIZON[h]} <span class="num muted">${list.length}</span></button>`).join('')}</div>
  <div class="columns">
    ${cols.map(([h, list]) => `
      <section class="col ${state.roadmapCol === h ? 'shown' : ''}" data-drop-horizon="${h}" aria-label="${HORIZON[h]}">
        <div class="col-head"><h3><span class="dot" style="--c:var(--h-${h})"></span>${HORIZON[h]}</h3><span class="muted num small">${list.length}</span></div>
        ${list.map(card).join('') || `<p class="col-empty">${h === 'now' ? 'Rien en cours. Glisse un chantier ici.' : 'Aucun chantier.'}</p>`}
      </section>`).join('')}
  </div>
  ${done.length ? `<details class="done-epics"><summary>${done.length} chantier${done.length > 1 ? 's' : ''} terminé${done.length > 1 ? 's' : ''}</summary><div class="stack" style="gap:8px;margin-top:10px">${done.map(card).join('')}</div></details>` : ''}
  ${loose ? `<p class="small muted" style="margin-top:14px">${loose} élément${loose > 1 ? 's' : ''} ouvert${loose > 1 ? 's' : ''} hors chantier. <button class="link-btn" data-action="task-view" data-v="list">Voir la liste</button></p>` : ''}`;
}

function viewList(d) {
  const byId = Object.fromEntries(d.members.map((m) => [m.id, m]));
  const items = d.tasks.filter(matchesFilter);
  const groups = [...d.epics].sort(sortEpics).map((e) => [e, items.filter((t) => t.epicId === e.id)]);
  groups.push([null, items.filter((t) => !t.epicId)]);
  const filtering = state.taskFilter !== 'all';
  const doneCount = items.filter((t) => t.status === 'done').length;
  const shown = groups.filter(([e, list]) => (filtering ? list.some((t) => state.showDone || t.status !== 'done')
    : e ? (e.horizon !== 'done' || state.showDone || list.some((t) => t.status !== 'done')) : list.length));
  return `
  <form class="quick-add" data-form="add-task">
    <input class="input" id="task-new" name="title" maxlength="200" placeholder="Ajouter une tâche rapide…" autocomplete="off" enterkeyhint="done">
    <button class="btn primary" type="submit">Ajouter</button>
  </form>
  ${shown.length ? shown.map(([e, list]) => {
    const visible = list.filter((t) => state.showDone || t.status !== 'done').sort(sortItems);
    const pr = e ? epicProgress(d, e.id) : null;
    return `<section class="group">
      <header class="group-head">
        ${e ? `<button class="group-title" data-action="open-epic" data-id="${e.id}"><h3>${esc(e.title)}</h3><span class="hz ${e.horizon}">${HORIZON[e.horizon]}</span></button>
          <span class="small muted num">${pr.done}/${pr.total}</span>` : '<h3 class="group-title">Hors chantier</h3>'}
        <button class="btn sm ghost" data-action="new-item" ${e ? `data-epic="${e.id}"` : ''} aria-label="Ajouter dans ${e ? esc(e.title) : 'hors chantier'}">+ Ajouter</button>
      </header>
      ${visible.length ? `<div class="items">${visible.map((t) => taskRow(t, byId)).join('')}</div>` : `<p class="col-empty">${list.length ? 'Tout est fait.' : 'Rien ici pour le moment.'}</p>`}
    </section>`;
  }).join('') : `<div class="empty"><p>${filtering ? 'Rien ne correspond à ce filtre.' : 'Aucune tâche pour le moment. Ajoute la première au-dessus.'}</p></div>`}
  ${doneCount ? `<button class="link-btn" data-action="toggle-done">${state.showDone ? 'Masquer' : 'Afficher'} les ${doneCount} élément${doneCount > 1 ? 's' : ''} terminé${doneCount > 1 ? 's' : ''}</button>` : ''}`;
}

function viewBoard(d) {
  const byId = Object.fromEntries(d.members.map((m) => [m.id, m]));
  const epicName = Object.fromEntries(d.epics.map((e) => [e.id, e.title]));
  const draggable = matchMedia('(pointer: fine)').matches;
  const cols = Object.keys(TASK).map((s) => [s, d.tasks.filter((t) => t.status === s && matchesFilter(t)).sort(sortItems)]);
  return `
  <form class="quick-add" data-form="add-task">
    <input class="input" id="task-new" name="title" maxlength="200" placeholder="Ajouter une tâche${isPhone() ? ` (${TASK[state.taskCol].toLowerCase()})` : ''}…" autocomplete="off" enterkeyhint="done">
    <button class="btn primary" type="submit">Ajouter</button>
  </form>
  <div class="seg hide-lg">${cols.map(([s, list]) => `<button data-action="task-col" data-v="${s}" aria-pressed="${state.taskCol === s}">${TASK[s]} <span class="num muted">${list.length}</span></button>`).join('')}</div>
  <div class="columns">
    ${cols.map(([s, list]) => `
      <section class="col ${state.taskCol === s ? 'shown' : ''}" data-drop-status="${s}" aria-label="${TASK[s]}">
        <div class="col-head"><h3><span class="dot" style="--c:${TASK_COLOR[s]}"></span>${TASK[s]}</h3><span class="muted num small">${list.length}</span></div>
        ${list.map((t) => taskRow(t, byId, { draggable, showEpic: epicName[t.epicId] })).join('') || `<p class="col-empty">${s === 'done' ? 'Rien de terminé pour le moment.' : 'Aucune tâche.'}</p>`}
      </section>`).join('')}
  </div>`;
}

const segField = (name, options, value, label, cls = '') => `
  <div class="field"><span>${label}</span>
    <div class="seg ${cls ? 'wrap' : ''}" style="margin:0" data-seg="${name}">${Object.entries(options).map(([k, l]) => `<button type="button" class="${cls ? `${cls} ${cls}-${k}` : ''}" data-action="pick-seg" data-v="${k}" aria-pressed="${k === value}">${l}</button>`).join('')}</div>
    <input type="hidden" name="${name}" value="${value}"></div>`;

/** Create or edit an item (tâche, bug, amélioration). */
function taskSheet(t) {
  const d = state.data;
  const isNew = !t.id;
  t = { title: '', description: '', status: 'todo', type: 'task', priority: 'normal', epicId: null, assigneeId: null, ...t };
  openSheet(`
    <form class="stack" data-form="${isNew ? 'new-task' : 'edit-task'}" data-id="${t.id || ''}">
      <div class="sheet-head"><h2 id="sheet-title">${isNew ? NEW_TITLE[t.type] : TYPES[t.type]}</h2><button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">${ico('x')}</button></div>
      ${segField('type', Object.fromEntries(TYPE_LIST.map((k) => [k, typeLabel(k)])), t.type, 'Type', 'type-opt')}
      <label class="field"><span>Titre</span><input class="input" id="tf-title" name="title" maxlength="200" required value="${esc(t.title)}" placeholder="${t.type === 'bug' ? 'ex. Crash quand on ouvre la carte' : 'ex. Écran de connexion'}" autofocus></label>
      <label class="field"><span>Description <small class="muted">(facultatif)</small></span><textarea class="input" id="tf-desc" name="description" maxlength="5000" placeholder="${t.type === 'bug' ? 'Comment le reproduire, sur quel appareil…' : 'Détails, étapes, liens…'}">${esc(t.description)}</textarea></label>
      ${segField('status', TASK, t.status, 'Statut')}
      ${segField('priority', PRIORITY, t.priority, 'Priorité')}
      <label class="field"><span>Chantier</span><select class="input" id="tf-epic" name="epicId"><option value="">Hors chantier</option>
        ${[...d.epics].sort(sortEpics).map((e) => `<option value="${e.id}" ${e.id === t.epicId ? 'selected' : ''}>${esc(e.title)}${e.horizon === 'done' ? ' (terminé)' : ''}</option>`).join('')}</select></label>
      <label class="field"><span>Assignée à</span><select class="input" id="tf-assignee" name="assigneeId"><option value="">Personne</option>
        ${d.members.map((m) => `<option value="${m.id}" ${m.id === t.assigneeId ? 'selected' : ''}>${esc(m.displayName)}</option>`).join('')}</select></label>
      ${isNew ? '' : `<p class="small muted">Créée ${timeAgo(t.createdAt)}${t.doneAt ? ` · terminée ${timeAgo(t.doneAt)}` : ''}</p>`}
      <div class="row ${isNew ? 'end' : 'between'}">${isNew ? '' : `<button type="button" class="btn danger" data-action="delete-task" data-id="${t.id}">Supprimer</button>`}<button class="btn primary" type="submit">${isNew ? 'Ajouter' : 'Enregistrer'}</button></div>
    </form>`);
}

/** Create or edit a grand chantier. */
function epicSheet(e) {
  const d = state.data;
  const isNew = !e.id;
  e = { title: '', description: '', horizon: state.taskView === 'roadmap' && isPhone() ? state.roadmapCol : 'next', ...e };
  const byId = Object.fromEntries(d.members.map((m) => [m.id, m]));
  const items = isNew ? [] : d.tasks.filter((t) => t.epicId === e.id).sort(sortItems);
  openSheet(`
    <form class="stack" data-form="${isNew ? 'new-epic' : 'edit-epic'}" data-id="${e.id || ''}">
      <div class="sheet-head"><h2 id="sheet-title">${isNew ? 'Nouveau chantier' : 'Chantier'}</h2><button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">${ico('x')}</button></div>
      <label class="field"><span>Titre</span><input class="input" id="ef-title" name="title" maxlength="200" required value="${esc(e.title)}" placeholder="ex. Mode hors-ligne" autofocus></label>
      <label class="field"><span>Description</span><textarea class="input" id="ef-desc" name="description" maxlength="5000" style="min-height:130px" placeholder="L'idée, pourquoi, les grandes étapes…&#10;- point 1&#10;- point 2">${esc(e.description)}</textarea></label>
      ${segField('horizon', HORIZON, e.horizon, 'Quand ?')}
      ${isNew ? '' : `<div class="stack" style="gap:8px">
        <div class="row between"><h3>${items.length} élément${items.length > 1 ? 's' : ''}</h3><button type="button" class="btn sm" data-action="new-item" data-epic="${e.id}">+ Ajouter</button></div>
        ${items.length ? `<div class="items">${items.map((t) => taskRow(t, byId)).join('')}</div>` : '<p class="small muted">Ajoute les tâches, bugs et améliorations de ce chantier.</p>'}
      </div>`}
      <div class="row ${isNew ? 'end' : 'between'}">${isNew ? '' : `<button type="button" class="btn danger" data-action="delete-epic" data-id="${e.id}">Supprimer</button>`}<button class="btn primary" type="submit">${isNew ? 'Créer le chantier' : 'Enregistrer'}</button></div>
    </form>`);
}

/** "Ajouter" without context: pick what to create. */
function chooserSheet({ title = 'Ajouter', action = 'choose-new', noteId = '' } = {}) {
  const choices = [
    ['epic', 'Grand chantier', 'Une grosse idée qui regroupera plusieurs tâches.'],
    ['task', 'Tâche', 'Quelque chose à faire.'],
    ['bug', 'Bug', 'Un problème à corriger.'],
    ['idea', 'Idée', 'Une piste à creuser, pas encore décidée.'],
    ['improvement', 'Amélioration', "Rendre mieux ce qui existe déjà."],
  ];
  openSheet(`
    <div class="sheet-head"><h2 id="sheet-title">${title}</h2><button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">${ico('x')}</button></div>
    <div class="chooser">${choices.map(([k, l, hint]) => `<button class="choice ch-${k}" data-action="${action}" data-v="${k}" data-id="${noteId}"><strong>${l}</strong><span>${hint}</span></button>`).join('')}</div>`);
}

/** Desktop drag and drop: items between status columns, chantiers between horizons. */
function bindTaskDnD() {
  if (!matchMedia('(pointer: fine)').matches) return;
  let drag = null;
  $app.querySelectorAll('[data-drag]').forEach((el) => {
    el.addEventListener('dragstart', (e) => { drag = { kind: el.dataset.drag, id: Number(el.dataset.id) }; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', el.dataset.id); });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));
  });
  $app.querySelectorAll('[data-drop-status], [data-drop-horizon]').forEach((col) => {
    const accepts = col.dataset.dropStatus ? 'task' : 'epic';
    col.addEventListener('dragover', (e) => { if (drag?.kind === accepts) { e.preventDefault(); col.classList.add('drop'); } });
    col.addEventListener('dragleave', () => col.classList.remove('drop'));
    col.addEventListener('drop', run(async (e) => {
      e.preventDefault(); col.classList.remove('drop');
      if (!drag || drag.kind !== accepts) return;
      const { id } = drag; drag = null;
      if (accepts === 'task') {
        const t = state.data.tasks.find((x) => x.id === id);
        if (!t || t.status === col.dataset.dropStatus) return;
        const maxPos = Math.max(0, ...state.data.tasks.map((x) => x.position));
        await db.updateTask(id, { status: col.dataset.dropStatus, position: maxPos + 1 });
      } else {
        const ep = state.data.epics.find((x) => x.id === id);
        if (!ep || ep.horizon === col.dataset.dropHorizon) return;
        const maxPos = Math.max(0, ...state.data.epics.map((x) => x.position));
        await db.updateEpic(id, { horizon: col.dataset.dropHorizon, position: maxPos + 1 });
      }
      await reloadProject();
    }));
  });
}

// ---------- notes ----------

function noteSheet(n) {
  const isNew = !n.id;
  openSheet(`
    <form class="stack" data-form="${isNew ? 'new-note' : 'edit-note'}" data-id="${n.id || ''}">
      <div class="sheet-head"><h2 id="sheet-title">${isNew ? 'Nouveau post-it' : 'Post-it'}</h2><button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">${ico('x')}</button></div>
      <div class="sheet-note c-${n.color}" id="nf-paper"><textarea id="nf-text" name="text" maxlength="1000" placeholder="Une idée, un bug, une envie…" autofocus>${esc(n.text)}</textarea></div>
      <div class="swatches" role="radiogroup" aria-label="Couleur">${Object.entries(NOTE_COLORS).map(([k, l]) => `<button type="button" class="swatch c-${k}" data-action="note-color" data-v="${k}" aria-pressed="${k === n.color}" aria-label="${l}"></button>`).join('')}</div>
      <input type="hidden" name="color" value="${n.color}">
      ${isNew ? `<input type="hidden" name="x" value="${n.x ?? ''}"><input type="hidden" name="y" value="${n.y ?? ''}">` : ''}
      ${isNew ? '' : `<p class="small muted">Par ${esc(n.author || 'un ancien membre')} · ${timeAgo(n.createdAt)} · <span class="with-ico">${ico('thumb', 13)} ${n.votes}</span></p>`}
      <div class="row between">
        ${isNew ? '<span></span>' : `<div class="row"><button type="button" class="btn danger" data-action="delete-note" data-id="${n.id}">Supprimer</button>
          <button type="button" class="btn" data-action="note-convert" data-id="${n.id}">Transformer en…</button></div>`}
        <button class="btn primary" type="submit">${isNew ? 'Coller' : 'Enregistrer'}</button>
      </div>
    </form>`);
}

// ---------- post-it wall: a big work surface you can zoom and move around ----------

const WALL = { minK: 0.1, maxK: 2.5, noteW: 190, noteH: 190 };
const wallState = () => (state.wall ||= { fs: false, cam: null, fit: true, spawn: null, pid: null });
const clampK = (k) => Math.max(WALL.minK, Math.min(WALL.maxK, k));
let wallApi = null; // functions of the wall currently on screen

function loadCam(pid) {
  try { const c = JSON.parse(store.get(`wall:${pid}`, 'null')); if (c && [c.x, c.y, c.k].every(Number.isFinite)) return c; } catch { /* ignore */ }
  return null;
}
let saveCamTimer = null;
function saveCam() {
  clearTimeout(saveCamTimer);
  saveCamTimer = setTimeout(() => { const w = wallState(); if (w.cam && w.pid) store.set(`wall:${w.pid}`, JSON.stringify(w.cam)); }, 400);
}

/** Keeps the fullscreen class on <html> in sync with what is on screen. */
function syncWallChrome() {
  const w = wallState();
  const on = w.fs && state.tab === 'idees' && state.boardView === 'wall' && !!state.pid;
  document.documentElement.classList.toggle('wall-open', on);
  if (!on) w.fs = false;
}

function setWallFullscreen(on) {
  const w = wallState();
  if (on === w.fs) return;
  w.fs = on;
  if (on) history.pushState({ wallfs: 1 }, '');
  else if (history.state?.wallfs) history.back();
  syncWallChrome();
  renderProject();
}
window.addEventListener('popstate', () => { const w = wallState(); if (w.fs) { w.fs = false; if (isPhone()) { state.boardView = 'grid'; store.set('boardView', 'grid'); } syncWallChrome(); renderProject(); } });

function noteBox(n) { return { x: n.x, y: n.y, w: WALL.noteW, h: WALL.noteH }; }

/** Camera that shows every post-it (never zoomed in beyond 100 %). */
function fitCamera(wrap, notes) {
  const W = wrap.clientWidth, H = wrap.clientHeight;
  if (!notes.length) return { x: 24, y: 24, k: 1 };
  const x0 = Math.min(...notes.map((n) => n.x)), y0 = Math.min(...notes.map((n) => n.y));
  const x1 = Math.max(...notes.map((n) => n.x + WALL.noteW)), y1 = Math.max(...notes.map((n) => n.y + WALL.noteH));
  const padX = 28, padTop = state.wall?.fs ? 64 : 28, padBottom = 76;
  const k = clampK(Math.min(1, (W - 2 * padX) / (x1 - x0), (H - padTop - padBottom) / (y1 - y0)));
  return { k, x: (W - (x1 - x0) * k) / 2 - x0 * k, y: padTop + (H - padTop - padBottom - (y1 - y0) * k) / 2 - y0 * k };
}

/** Free spot for a new post-it inside the part of the wall you are looking at. */
function freeSpot() {
  const w = wallState();
  const wrap = $app.querySelector('.board-wrap.wall');
  const notes = state.data?.notes || [];
  if (w.spawn) { const s = w.spawn; w.spawn = null; return s; }
  const free = (x, y) => notes.every((n) => Math.abs(n.x - x) > 200 || Math.abs(n.y - y) > 190);
  let view = { x: 0, y: 0, w: 900, h: 600 };
  if (wrap && w.cam) view = { x: -w.cam.x / w.cam.k, y: -w.cam.y / w.cam.k, w: wrap.clientWidth / w.cam.k, h: wrap.clientHeight / w.cam.k };
  const bounded = (r) => ({ x: Math.max(0, r.x), y: Math.max(10, r.y), w: Math.min(r.w, BOARD_W), h: Math.min(r.h, BOARD_H) });
  const v = bounded(view);
  for (const r of [v, { x: 0, y: 10, w: BOARD_W, h: BOARD_H }]) {
    for (let y = r.y + 24; y + 180 <= Math.min(BOARD_H, r.y + r.h); y += 200) {
      for (let x = r.x + 24; x + WALL.noteW <= Math.min(BOARD_W, r.x + r.w); x += 214) if (free(x, y)) return { x: Math.round(x), y: Math.round(y) };
    }
  }
  return { x: Math.round(v.x + 40 + Math.random() * 80), y: Math.round(v.y + 40 + Math.random() * 80) };
}

/** Moves the view so a post-it is in the middle (used after adding one). */
function centerOnNote(id) {
  const n = state.data.notes.find((x) => x.id === id);
  if (n && wallApi) wallApi.centerOn(n.x + WALL.noteW / 2, n.y + WALL.noteH / 2);
}

/** Neat grid. mode: 'color' | 'votes' | 'date'. Returns [{id, x, y}]. */
function arrangeLayout(notes, mode) {
  const colors = Object.keys(NOTE_COLORS);
  const list = [...notes];
  if (mode === 'votes') list.sort((a, b) => b.votes - a.votes || a.id - b.id);
  else if (mode === 'date') list.sort((a, b) => a.id - b.id);
  else list.sort((a, b) => colors.indexOf(a.color) - colors.indexOf(b.color) || b.votes - a.votes || a.id - b.id);
  const X0 = 40, Y0 = 70, STEP = 214, maxRows = Math.floor((BOARD_H - Y0 - 30) / STEP);
  const place = (cols) => {
    let row = 0, col = 0, prev = null; const out = [];
    for (const n of list) {
      if (mode === 'color' && prev && n.color !== prev && col > 0) { row++; col = 0; }
      prev = n.color;
      out.push({ id: n.id, x: X0 + col * STEP, y: Y0 + row * STEP });
      if (++col >= cols) { col = 0; row++; }
    }
    return { out, rows: row + (col ? 1 : 0) };
  };
  let cols = Math.max(3, Math.min(10, Math.ceil(Math.sqrt(list.length * 1.6))));
  let res = place(cols);
  while (res.rows > maxRows && cols < 13) res = place(++cols);
  return res.out;
}

function arrangeSheet() {
  openSheet(`
    <div class="sheet-head"><h2 id="sheet-title">Ranger les post-it</h2><button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">${ico('x')}</button></div>
    <p class="small muted">Les post-it sont alignés en grille, pour tout le monde. Tu pourras annuler juste après.</p>
    <div class="chooser">
      <button class="choice ch-task" data-action="wall-arrange-do" data-v="color"><strong>Par couleur</strong><span>Une ligne par couleur de post-it.</span></button>
      <button class="choice ch-idea" data-action="wall-arrange-do" data-v="votes"><strong>Par votes</strong><span>Les plus votés en premier.</span></button>
      <button class="choice ch-epic" data-action="wall-arrange-do" data-v="date"><strong>Par ordre d'ajout</strong><span>Du plus ancien au plus récent.</span></button>
    </div>`);
}

function bindWall(wrap) {
  const w = wallState();
  const board = wrap.querySelector('.board');
  const label = wrap.querySelector('.zoom-val');
  const mm = wrap.querySelector('.minimap');
  const view = () => ({ W: wrap.clientWidth, H: wrap.clientHeight });
  const noteEls = () => [...board.querySelectorAll('.note')];
  let raf = 0;

  // First time on this project: restore the last view, or show everything.
  if (w.pid !== state.pid) { w.pid = state.pid; w.cam = loadCam(state.pid); w.fit = !w.cam; }
  if (!w.cam || w.fit) w.cam = fitCamera(wrap, state.data.notes);

  function clampCam() {
    const { W, H } = view(), c = w.cam;
    c.k = clampK(c.k);
    // never show the empty area around the board, except the room taken by the floating bars
    const lim = (pos, size, room, lo, hi) => (size <= room - lo - hi ? lo + (room - lo - hi - size) / 2 : Math.min(lo, Math.max(room - hi - size, pos)));
    c.x = lim(c.x, BOARD_W * c.k, W, 0, 0);
    c.y = lim(c.y, BOARD_H * c.k, H, w.fs ? 64 : 0, 76);
  }
  function apply(animate = false) {
    clampCam();
    board.classList.toggle('animating', animate);
    board.style.transform = `translate(${w.cam.x}px, ${w.cam.y}px) scale(${w.cam.k})`;
    if (label) label.textContent = `${Math.round(w.cam.k * 100)} %`;
    if (animate) setTimeout(() => board.classList.remove('animating'), 320);
    queueMini(); saveCam();
  }
  const queueMini = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; drawMini(); }); };

  // ---- mini map ----
  let mmMap = null;
  function drawMini() {
    if (!mm) return;
    const { W, H } = view(), c = w.cam;
    const vis = { x: -c.x / c.k, y: -c.y / c.k, w: W / c.k, h: H / c.k };
    const boxes = noteEls().map((el) => ({ x: el.offsetLeft, y: el.offsetTop, color: [...el.classList].find((k) => k.startsWith('c-')) }));
    // the map always shows the whole wall, so it matches the world the view moves in
    const MW = mm.clientWidth, MH = mm.clientHeight, s = Math.min(MW / BOARD_W, MH / BOARD_H);
    const ox = (MW - BOARD_W * s) / 2, oy = (MH - BOARD_H * s) / 2;
    mmMap = { s, ox, oy };
    mm.innerHTML = `<b class="mm-world" style="left:${ox}px;top:${oy}px;width:${BOARD_W * s}px;height:${BOARD_H * s}px"></b>` + boxes.map((b) => `<i class="mm-note ${b.color}" style="left:${b.x * s + ox}px;top:${b.y * s + oy}px;width:${Math.max(3, WALL.noteW * s)}px;height:${Math.max(3, WALL.noteH * s)}px"></i>`).join('')
      + `<b class="mm-view" style="left:${vis.x * s + ox}px;top:${vis.y * s + oy}px;width:${vis.w * s}px;height:${vis.h * s}px"></b>`;
  }
  function miniTo(e) {
    if (!mmMap) return;
    const r = mm.getBoundingClientRect();
    const wx = (e.clientX - r.left - mmMap.ox) / mmMap.s, wy = (e.clientY - r.top - mmMap.oy) / mmMap.s;
    const { W, H } = view();
    w.fit = false; w.cam.x = W / 2 - wx * w.cam.k; w.cam.y = H / 2 - wy * w.cam.k; apply();
  }
  if (mm) {
    mm.addEventListener('pointerdown', (e) => { e.stopPropagation(); mm.setPointerCapture(e.pointerId); miniTo(e); mm.dataset.on = '1'; });
    mm.addEventListener('pointermove', (e) => { if (mm.dataset.on) miniTo(e); });
    mm.addEventListener('pointerup', () => { delete mm.dataset.on; });
    mm.addEventListener('pointercancel', () => { delete mm.dataset.on; });
  }

  // ---- camera helpers (also exposed to the toolbar buttons) ----
  const toWorld = (cx, cy) => { const r = wrap.getBoundingClientRect(); return { x: (cx - r.left - w.cam.x) / w.cam.k, y: (cy - r.top - w.cam.y) / w.cam.k }; };
  function zoomAt(cx, cy, k2, animate = false) {
    const r = wrap.getBoundingClientRect(), p = toWorld(cx, cy);
    k2 = clampK(k2); w.fit = false;
    w.cam.k = k2; w.cam.x = cx - r.left - p.x * k2; w.cam.y = cy - r.top - p.y * k2; apply(animate);
    // zoom while a finger/mouse is moving the view: carry on from the new view (no jump), held post-it follow
    if (pan) { const q = ptrs.get(pan.pid); if (q) { pan.sx = q.x; pan.sy = q.y; pan.cx = w.cam.x; pan.cy = w.cam.y; } }
    keepHeldNotes();
  }
  wallApi = {
    zoom(f) { const r = wrap.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, w.cam.k * f, true); },
    zoomTo(k) { const r = wrap.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, k, true); },
    fit() { w.fit = true; w.cam = fitCamera(wrap, state.data.notes); apply(true); },
    centerOn(wx, wy) {
      const { W, H } = view(), c = w.cam, sx = wx * c.k + c.x, sy = wy * c.k + c.y;
      if (sx > 40 && sx < W - 40 && sy > 70 && sy < H - 90) return;
      w.fit = false; c.x = W / 2 - wx * c.k; c.y = H / 2 - wy * c.k; apply(true);
    },
    refit() { if (w.fit) { w.cam = fitCamera(wrap, state.data.notes); apply(); } else apply(); },
  };

  // ---- gestures ----
  //  one finger on the background: move the view      one finger on a post-it: move it (a tap opens it)
  //  two fingers: zoom + move the view (also when they land on post-it)
  //  holding a post-it with one finger: another finger on the background moves the view, on another post-it moves it too
  const ptrs = new Map();   // every finger down: pointerId -> {x, y}
  const drags = new Map();  // pointerId -> post-it being moved by that finger
  let pan = null, pinch = null, edge = 0;
  const ignore = (t) => t.closest('.wall-bar, .wall-top, .minimap, .vote');

  function posNote(d, cx, cy) {
    const p = toWorld(cx, cy);
    const x = Math.max(0, Math.min(BOARD_W - WALL.noteW, p.x - d.gx)), y = Math.max(10, Math.min(BOARD_H - WALL.noteH, p.y - d.gy));
    d.el.style.left = `${x}px`; d.el.style.top = `${y}px`;
  }
  // after the view moved, post-it held by a finger stay under that finger
  function keepHeldNotes() { for (const [id, d] of drags) { const q = ptrs.get(id); if (d.moved && q) posNote(d, q.x, q.y); } queueMini(); }
  const refreshFlags = () => { state.dragging = [...drags.values()].some((d) => d.moved); state.panning = ptrs.size > 0; };
  function dropDrag(d, restore) {
    if (restore && d.moved) { d.el.style.left = `${d.ox}px`; d.el.style.top = `${d.oy}px`; }
    d.el.classList.remove('dragging');
  }
  function resetGestures() { // forget fingers that never reported "up" (system gesture, lost event…)
    for (const d of drags.values()) dropDrag(d, true);
    drags.clear(); ptrs.clear(); pan = null; pinch = null;
    if (edge) { cancelAnimationFrame(edge); edge = 0; }
    refreshFlags();
  }
  function startDrag(e, el) {
    const p = toWorld(e.clientX, e.clientY);
    drags.set(e.pointerId, { el, id: Number(el.dataset.note), sx: e.clientX, sy: e.clientY, ox: el.offsetLeft, oy: el.offsetTop, gx: p.x - el.offsetLeft, gy: p.y - el.offsetTop, moved: false });
    try { el.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
  }
  function startPan(e) {
    pan = { pid: e.pointerId, sx: e.clientX, sy: e.clientY, cx: w.cam.x, cy: w.cam.y };
    try { wrap.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
  }
  function startPinch(ids) {
    const [a, b] = ids.map((i) => ptrs.get(i));
    const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
    pinch = { ids, d0: c.d, k0: w.cam.k, p: toWorld(c.x, c.y) };
  }
  function edgeLoop() { // a single post-it dragged near the edge makes the view follow
    edge = 0;
    const only = drags.size === 1 ? [...drags.entries()][0] : null;
    if (!only || !only[1].moved || pan) return;
    const q = ptrs.get(only[0]); if (!q) return;
    const r = wrap.getBoundingClientRect(), m = 48, sp = 14;
    let dx = 0, dy = 0;
    if (q.x > r.right - m) dx = -sp; else if (q.x < r.left + m) dx = sp;
    if (q.y > r.bottom - m - 60) dy = -sp; else if (q.y < r.top + m + (w.fs ? 44 : 0)) dy = sp;
    if (dx || dy) { w.cam.x += dx; w.cam.y += dy; w.fit = false; apply(); keepHeldNotes(); edge = requestAnimationFrame(edgeLoop); }
  }

  wrap.addEventListener('pointerdown', (e) => {
    if (ignore(e.target) || (e.pointerType === 'mouse' && e.button > 0)) return;
    if (e.isPrimary) resetGestures(); // a first finger means no other one can be down
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    refreshFlags();
    const el = e.target.closest('.note');
    if (ptrs.size === 1) { if (el) startDrag(e, el); else startPan(e); return; }
    if (ptrs.size === 3) { // one finger holds a post-it, the two others pinch the view
      const free = [...ptrs.keys()].filter((i) => !(drags.get(i)?.moved));
      if (free.length === 2 && [...drags.values()].some((d) => d.moved)) { pan = null; for (const i of free) drags.delete(i); startPinch(free); refreshFlags(); }
      return;
    }
    if (ptrs.size !== 2) return;
    const first = [...ptrs.keys()][0], held = drags.get(first);
    if (held && held.moved) { // the first finger is carrying a post-it
      if (el && !drags.has(e.pointerId)) startDrag(e, el); else startPan(e);
      return;
    }
    // otherwise it is a zoom / move-the-view gesture, even if the fingers landed on post-it
    for (const d of drags.values()) dropDrag(d, true);
    drags.clear(); pan = null; refreshFlags();
    startPinch([...ptrs.keys()]);
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch) {
      if (!pinch.ids.includes(e.pointerId)) return;
      const [a, b] = pinch.ids.map((i) => ptrs.get(i)); if (!a || !b) return;
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const r = wrap.getBoundingClientRect(), k2 = clampK(pinch.k0 * d / pinch.d0);
      w.fit = false; w.cam.k = k2; w.cam.x = cx - r.left - pinch.p.x * k2; w.cam.y = cy - r.top - pinch.p.y * k2; apply(); keepHeldNotes();
      return;
    }
    const d = drags.get(e.pointerId);
    if (d) {
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
      if (!d.moved) { d.moved = true; d.el.classList.add('dragging'); refreshFlags(); }
      posNote(d, e.clientX, e.clientY); queueMini();
      if (!edge) edge = requestAnimationFrame(edgeLoop);
    } else if (pan && pan.pid === e.pointerId) {
      const dx = e.clientX - pan.sx, dy = e.clientY - pan.sy;
      if (!pan.moved && Math.hypot(dx, dy) < 3) return;
      pan.moved = true; w.fit = false; w.cam.x = pan.cx + dx; w.cam.y = pan.cy + dy; apply(); keepHeldNotes();
    }
  });
  const end = run(async (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (pinch && pinch.ids.includes(e.pointerId)) { // one finger of the pinch left: the other carries on moving the view
      const other = pinch.ids.find((i) => i !== e.pointerId); pinch = null;
      const q = ptrs.get(other);
      if (q) pan = { pid: other, sx: q.x, sy: q.y, cx: w.cam.x, cy: w.cam.y, moved: true };
      refreshFlags(); return;
    }
    const d = drags.get(e.pointerId);
    if (pan && pan.pid === e.pointerId) pan = null;
    if (!d) { refreshFlags(); return; }
    drags.delete(e.pointerId);
    if (edge && !drags.size) { cancelAnimationFrame(edge); edge = 0; }
    const n = state.data.notes.find((x) => x.id === d.id);
    refreshFlags();
    if (!d.moved) { d.el.classList.remove('dragging'); if (e.type === 'pointerup' && n && !ptrs.size) noteSheet(n); return; }
    // Put the note in front right away, locally: otherwise it drops behind the others until the save comes back.
    const x = Math.round(parseFloat(d.el.style.left)), y = Math.round(parseFloat(d.el.style.top));
    const z = Math.max(0, ...state.data.notes.map((o) => o.z)) + 1;
    d.el.style.zIndex = z; d.el.classList.remove('dragging');
    if (n) Object.assign(n, { x, y, z });
    queueMini();
    await db.updateNote(d.id, { x, y, z }, state.data.notes);
  });
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', end);
  // iOS: stop Safari from zooming/scrolling the page while fingers are on the wall
  for (const t of ['gesturestart', 'gesturechange', 'gestureend']) wrap.addEventListener(t, (e) => e.preventDefault());
  wrap.addEventListener('touchmove', (e) => { if (!ignore(e.target)) e.preventDefault(); }, { passive: false });
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetGestures(); });

  // mouse wheel: scroll moves the wall, Ctrl/⌘ + scroll (or a trackpad pinch) zooms
  wrap.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey && !w.fs) return; // small frame: the page keeps scrolling normally
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, w.cam.k * Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.01)));
    else { w.fit = false; w.cam.x -= e.deltaX; w.cam.y -= e.deltaY; apply(); }
  }, { passive: false });
  // double click on the background: new post-it right there
  wrap.addEventListener('dblclick', (e) => {
    if (ignore(e.target) || e.target.closest('.note')) return;
    const p = toWorld(e.clientX, e.clientY);
    w.spawn = { x: Math.round(Math.max(0, Math.min(BOARD_W - WALL.noteW, p.x - WALL.noteW / 2))), y: Math.round(Math.max(10, Math.min(BOARD_H - WALL.noteH, p.y - 60))) };
    actions['new-note']();
  });
  wrap.addEventListener('keydown', (e) => {
    const el = e.target.closest('.note');
    if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); noteSheet(state.data.notes.find((x) => x.id === Number(el.dataset.note))); return; }
    if (el || e.target.closest('input, textarea, select')) return;
    const step = 80;
    if (e.key === '+' || e.key === '=') wallApi.zoom(1.25);
    else if (e.key === '-' || e.key === '_') wallApi.zoom(0.8);
    else if (e.key === '0') wallApi.fit();
    else if (e.key === 'ArrowLeft') { w.cam.x += step; w.fit = false; apply(); }
    else if (e.key === 'ArrowRight') { w.cam.x -= step; w.fit = false; apply(); }
    else if (e.key === 'ArrowUp') { w.cam.y += step; w.fit = false; apply(); }
    else if (e.key === 'ArrowDown') { w.cam.y -= step; w.fit = false; apply(); }
    else if (e.key === 'Escape' && w.fs) setWallFullscreen(false);
    else return;
    e.preventDefault();
  });
  new ResizeObserver(() => wallApi?.refit()).observe(wrap);
  apply();
}

// ---------- account ----------

function accountSheet() {
  const me = state.me;
  const theme = store.get('theme', 'auto');
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  openSheet(`
    <div class="sheet-head"><div class="row">${avatar(me, 'lg')}<div><h2 id="sheet-title">${esc(me.displayName)}</h2><p class="small muted">@${esc(me.username)}</p></div></div>
      <button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">${ico('x')}</button></div>
    ${!standalone ? `<div class="panel" style="background:var(--accent-soft);border-color:transparent">
      <h3>Installer l'app</h3>
      ${state.installPrompt ? '<p class="small">Ajoute Tool Proj à ton écran d\'accueil pour l\'ouvrir comme une vraie app.</p><button class="btn primary" data-action="install">Installer</button>'
        : ios ? '<p class="small">Sur iPhone : touche <b>Partager</b> dans Safari, puis <b>Sur l\'écran d\'accueil</b>.</p>'
          : '<p class="small">Dans le menu du navigateur, choisis <b>Installer l\'application</b> ou <b>Ajouter à l\'écran d\'accueil</b>.</p>'}
    </div>` : ''}
    <div class="field"><span>Thème</span><div class="seg" style="margin:0">
      ${[['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']].map(([k, l]) => `<button type="button" data-action="theme" data-v="${k}" aria-pressed="${theme === k}">${l}</button>`).join('')}</div></div>
    <form class="stack" data-form="profile">
      <label class="field"><span>Nom affiché</span><input class="input" id="ac-name" name="displayName" value="${esc(me.displayName)}" maxlength="60" required></label>
      <label class="field"><span>Identifiant</span><input class="input" id="ac-user" name="username" value="${esc(me.username)}" maxlength="32" required autocapitalize="none" spellcheck="false"></label>
      ${avatarPicker(me)}
      <div class="row end"><button class="btn primary" type="submit">Enregistrer</button></div>
    </form>
    ${db.passkeysSupported() ? `<section class="stack" style="gap:10px">
      <h3>Clés d'accès</h3>
      <p class="small muted">Pour te connecter avec Face ID, ton empreinte ou le code de l'appareil. Crée une clé sur chaque appareil que tu utilises.</p>
      <div class="passkeys" id="pk-list"><p class="small muted">Chargement…</p></div>
      <button class="btn" data-action="passkey-add">${icon.key} Ajouter une clé sur cet appareil</button>
    </section>` : ''}
    <button class="btn danger" data-action="logout">Se déconnecter</button>
    <p class="small muted" style="text-align:center">Tool Proj · version ${APP_VERSION} <span title="Numéro de mise en ligne">(build ${APP_BUILD})</span></p>`, () => { if (db.passkeysSupported()) loadPasskeys(); });
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
  'roadmap-col': (el) => { state.roadmapCol = el.dataset.v; renderProject(); },
  'task-view': (el) => { state.taskView = el.dataset.v; store.set('taskView', el.dataset.v); renderProject(); },
  'goto-roadmap': () => { state.taskView = 'roadmap'; store.set('taskView', 'roadmap'); location.hash = `#/p/${state.pid}/taches`; },
  'task-filter': (el) => { state.taskFilter = el.dataset.v; renderProject(); },
  'toggle-done': () => { state.showDone = !state.showDone; renderProject(); },
  'new-item': (el) => {
    if (el.dataset.epic) return taskSheet({ epicId: Number(el.dataset.epic) });
    if (state.taskView === 'roadmap') return epicSheet({});
    chooserSheet();
  },
  'new-epic': () => epicSheet({}),
  'manage-links': () => linksSheet(),
  'edit-link': (el) => linksSheet(Number(el.dataset.id)),
  'delete-link': async (el) => {
    await db.deleteLink(Number(el.dataset.id));
    toast('Lien supprimé'); await reloadProject(); linksSheet();
  },
  'choose-new': (el) => (el.dataset.v === 'epic' ? epicSheet({}) : taskSheet({ type: el.dataset.v, status: state.taskView === 'board' && isPhone() ? state.taskCol : 'todo' })),
  'open-epic': (el) => epicSheet(state.data.epics.find((e) => e.id === Number(el.dataset.id))),
  'delete-epic': async (el) => {
    const e = state.data.epics.find((x) => x.id === Number(el.dataset.id));
    if (!(await confirmSheet(`Supprimer le chantier « ${e.title} » ? Ses tâches sont gardées, hors chantier.`))) return;
    await db.deleteEpic(e.id);
    toast('Chantier supprimé'); await reloadProject();
  },
  'pick-avatar-emoji': (el) => {
    const form = el.closest('form');
    form.elements.avatarEmoji.value = el.dataset.v;
    form.querySelectorAll('.emoji-opt').forEach((b) => b.setAttribute('aria-pressed', b === el));
    refreshAvatarPreview(form);
  },
  'pick-avatar-color': (el) => {
    const form = el.closest('form');
    form.elements.avatarColor.value = el.dataset.v;
    form.querySelectorAll('[data-action="pick-avatar-color"]').forEach((b) => b.setAttribute('aria-pressed', b === el));
    refreshAvatarPreview(form);
  },
  'pick-style': (el) => {
    const form = el.closest('form');
    form.elements.taskStyle.value = el.dataset.v;
    form.querySelectorAll('.style-card').forEach((b) => b.setAttribute('aria-pressed', b === el));
    setFormColors(form, el.dataset.v);
    refreshStylePreview(form);
  },
  'reset-type-colors': (el) => {
    const form = el.closest('form');
    setFormColors(form, form.elements.taskStyle.value);
    refreshStylePreview(form);
  },
  'toggle-activity': () => { state.activityOpen = !state.activityOpen; store.set('activityOpen', state.activityOpen ? '1' : '0'); renderProject(); },
  'pick-seg': (el) => {
    const seg = el.closest('[data-seg]');
    el.closest('form').elements[seg.dataset.seg].value = el.dataset.v;
    seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === el));
  },
  'note-convert': (el) => chooserSheet({ title: 'Transformer le post-it en…', action: 'note-convert-to', noteId: el.dataset.id }),
  'note-convert-to': async (el) => {
    const note = state.data.notes.find((n) => n.id === Number(el.dataset.id));
    const title = await db.convertNote(state.pid, note, el.dataset.v, state.data);
    closeSheet();
    const kind = el.dataset.v;
    toast(`${kind === 'epic' ? 'Chantier' : TYPES[kind]} créé${kind === 'bug' || kind === 'epic' ? '' : 'e'} : ${title}`);
    await reloadProject();
  },
  'open-task': (el) => taskSheet(state.data.tasks.find((t) => t.id === Number(el.dataset.id))),
  'toggle-task': async (el) => {
    const t = state.data.tasks.find((x) => x.id === Number(el.dataset.id));
    await db.updateTask(t.id, { status: t.status === 'done' ? 'todo' : 'done' });
    await reloadProject();
  },
  'delete-task': async (el) => {
    await db.deleteTask(Number(el.dataset.id));
    closeSheet(); toast('Supprimé'); await reloadProject();
  },
  'board-view': (el) => {
    state.boardView = el.dataset.v; store.set('boardView', el.dataset.v);
    if (el.dataset.v === 'wall' && isPhone()) setWallFullscreen(true); else renderProject(); // on a phone the wall needs the whole screen
  },
  'wall-fs': () => setWallFullscreen(true),
  'wall-exit': () => { if (isPhone()) { state.boardView = 'grid'; store.set('boardView', 'grid'); } setWallFullscreen(false); },
  'wall-zoom': (el) => wallApi?.zoom(el.dataset.v === 'in' ? 1.25 : 0.8),
  'wall-100': () => wallApi?.zoomTo(1),
  'wall-fit': () => wallApi?.fit(),
  'wall-arrange': () => arrangeSheet(),
  'wall-arrange-do': async (el) => {
    closeSheet();
    const notes = state.data.notes;
    const before = notes.map((n) => ({ id: n.id, x: n.x, y: n.y }));
    const apply = (list) => { for (const a of list) Object.assign(notes.find((n) => n.id === a.id) || {}, { x: a.x, y: a.y }); renderProject(); wallApi?.fit(); };
    const after = arrangeLayout(notes, el.dataset.v);
    await db.moveNotes(after); apply(after);
    toast('Post-it rangés', false, { label: 'Annuler', fn: run(async () => { await db.moveNotes(before); apply(before); }) });
  },
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
    const base = TASK_STYLES[body.taskStyle]?.colors;
    if (base) {
      body.typeColors = {};
      for (const t of TYPE_LIST) { const v = (body[`tc_${t}`] || '').toLowerCase(); if (v && v !== base[t].toLowerCase()) body.typeColors[t] = v; }
    }
    TYPE_LIST.forEach((t) => delete body[`tc_${t}`]);
    // Only send the style when it changed, so saving other settings never depends on the style columns existing.
    const cur = state.data.project;
    const same = body.taskStyle === styleOf(cur) && JSON.stringify(Object.entries(body.typeColors || {}).sort()) === JSON.stringify(Object.entries(cur.typeColors || {}).sort());
    if (same) { delete body.taskStyle; delete body.typeColors; }
    await db.updateProject(state.pid, body);
    closeSheet(); toast('Projet mis à jour'); await reloadProject();
  },
  async 'add-task'(f) {
    const title = f.elements.title.value.trim();
    if (!title) return;
    await db.addTask(state.pid, { title, status: state.taskView === 'board' && isPhone() ? state.taskCol : 'todo' }, state.data.tasks);
    await reloadProject();
    $app.querySelector('#task-new')?.focus();
  },
  async 'new-task'(f) {
    await db.addTask(state.pid, formData(f), state.data.tasks);
    closeSheet(); toast('Ajouté'); await reloadProject();
  },
  async 'edit-task'(f) {
    await db.updateTask(Number(f.dataset.id), formData(f));
    closeSheet(); await reloadProject();
  },
  async 'save-link'(f) {
    const b = formData(f);
    if (f.dataset.id) await db.updateLink(Number(f.dataset.id), b);
    else await db.addLink(state.pid, b, state.data.links);
    toast(f.dataset.id ? 'Lien modifié' : 'Lien ajouté'); await reloadProject(); linksSheet();
  },
  async 'new-epic'(f) {
    await db.addEpic(state.pid, formData(f), state.data.epics);
    closeSheet(); toast('Chantier créé'); await reloadProject();
  },
  async 'edit-epic'(f) {
    await db.updateEpic(Number(f.dataset.id), formData(f));
    closeSheet(); await reloadProject();
  },
  async 'new-note'(f) {
    const b = formData(f);
    const spot = b.x !== '' && b.x !== undefined ? { x: Number(b.x), y: Number(b.y) } : freeSpot();
    await db.addNote(state.pid, { text: b.text, color: b.color, ...spot }, state.data.notes);
    closeSheet(); await reloadProject();
    // Show where the new post-it landed (end of the grid, or its spot on the wall).
    const newest = Math.max(...state.data.notes.map((n) => n.id));
    const el = $app.querySelector(`[data-note="${newest}"]`);
    if (state.boardView === 'wall') centerOnNote(newest); else el?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    el?.classList.add('just-added');
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
  if (e.target.dataset.change === 'progress') {
    await db.updateProject(state.pid, { manualProgress: e.target.value });
    toast(`Avancement : ${e.target.value} %`); await reloadProject();
    return;
  }
  const el = e.target.closest('[data-change="role"]');
  if (!el) return;
  try { await db.setRole(state.pid, el.dataset.id, el.value); toast('Rôle mis à jour'); }
  finally { await reloadProject(); }
}));

// Move the ring while the admin drags the progress slider.
$app.addEventListener('input', (e) => {
  if (e.target.id !== 'ov-prog') return;
  const ring = $app.querySelector('.ring');
  ring.style.setProperty('--p', e.target.value);
  ring.querySelector('strong').textContent = `${e.target.value}%`;
});

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

// The bottom bar and the round button jump above the keyboard on phones: hide them while typing.
const TYPING = 'input:not([type=range]):not([type=color]):not([type=checkbox]):not([type=radio]), textarea, select';
document.addEventListener('focusin', (e) => { if (e.target.matches?.(TYPING) && !e.target.closest('dialog')) document.body.classList.add('kbd'); });
document.addEventListener('focusout', () => setTimeout(() => { if (!document.activeElement?.matches?.(TYPING)) document.body.classList.remove('kbd'); }, 80));
// Keep bottom sheets above the keyboard (iOS keeps the layout the same size and covers the bottom).
if (window.visualViewport) {
  const sync = () => {
    const vv = window.visualViewport;
    const root = document.documentElement.style;
    root.setProperty('--vvh', `${Math.round(vv.height)}px`);
    root.setProperty('--kb', `${Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))}px`);
  };
  window.visualViewport.addEventListener('resize', sync);
  window.visualViewport.addEventListener('scroll', sync);
  sync();
}

window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); state.installPrompt = e; });
if ('serviceWorker' in navigator) {
  // When a new version takes over, reload once so the screen runs the new code (not while typing or in a sheet).
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    if (sheet.open || document.activeElement?.matches?.('input, textarea, select')) return; // it will load next time
    reloaded = true; location.reload();
  });
  navigator.serviceWorker.register('sw.js').then((reg) => reg.update()).catch(() => {});
  document.addEventListener('visibilitychange', () => { if (!document.hidden) navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => {}); });
}

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
