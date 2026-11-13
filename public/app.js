// Tool Proj front-end: vanilla JS, hash router, event delegation. Data lives in Supabase (see data.js).
import * as db from './data.js';
import * as fx from './fx.js';

const $app = document.getElementById('app');
const sheet = document.getElementById('sheet');

const STATUS = { idea: 'Idée', active: 'En cours', paused: 'En pause', done: 'Terminé' };
const TASK = { todo: 'À faire', done: 'Terminé' };
const TASK_COLOR = { todo: 'var(--muted)', done: 'var(--st-active)' };
const NOTE_COLORS = { yellow: 'Jaune', pink: 'Rose', blue: 'Bleu', green: 'Vert', orange: 'Orange', purple: 'Violet' };
const PROJECT_COLORS = ['#0d7c72', '#3b6fd8', '#7048c8', '#d6336c', '#e8590c', '#2b8a3e', '#5c6370'];
const EMOJIS = ['🚀', '📱', '💡', '🛠️', '🎮', '🛒', '📊', '🎨', '🤖', '🌱'];
// Drawn icons (follow the text colour): interface, project and profile pictures.
const ICON_PATHS = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  trash: '<path d="M4.500 7h15M9.500 7V4.500h5V7M6.500 7l1 13h9l1-13M10.500 11v5.500M13.500 11v5.500"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  image: '<rect x="3.500" y="5" width="17" height="14" rx="2.500"/><path d="M3.500 16l4.500-4.500 4 4 3-3 5.500 5.500M15.500 9.500h.01"/>',
  bell: '<path d="M6 16.500V11a6 6 0 0 1 12 0v5.500l1.500 2h-15l1.500-2zM10 20.500a2 2 0 0 0 4 0"/>',
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
// Emoji are drawn in an SVG and re-centred from their real ink bounds (fonts place emoji differently: they never sit in the middle of a round badge by themselves).
const EMOJI_FONT = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
const emojiPos = {};
function emojiSvg(e) {
  if (!emojiPos[e]) {
    let x = 50, y = 50, ok = false;
    try { // draw it once off-screen and find where the visible pixels really are
      const c = (emojiSvg.ctx ||= document.createElement('canvas').getContext('2d', { willReadFrequently: true }));
      const W = 240, ox = 70, oy = 160;
      c.canvas.width = W; c.canvas.height = W;
      c.font = `80px ${EMOJI_FONT}`; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.clearRect(0, 0, W, W); c.fillText(e, ox, oy);
      const px = c.getImageData(0, 0, W, W).data;
      let x0 = W, x1 = -1, y0 = W, y1 = -1;
      for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) if (px[(j * W + i) * 4 + 3] > 24) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
      if (x1 >= 0) { x = 50 - ((x0 + x1) / 2 - ox); y = 50 - ((y0 + y1) / 2 - oy); ok = true; }
    } catch { /* no canvas: fall back to the font's own centring */ }
    emojiPos[e] = { x, y, ok };
  }
  const { x, y, ok } = emojiPos[e];
  return `<svg class="emo" viewBox="0 0 100 100" aria-hidden="true"><text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="80" font-family="${EMOJI_FONT}" ${ok ? '' : 'text-anchor="middle" dominant-baseline="central"'}>${esc(e)}</text></svg>`;
}
const glyph = (v, size = '1em') => (glyphName(v) ? ico(glyphName(v), size) : emojiSvg(String(v ?? '')));
const BOARD_W = 3000, BOARD_H = 2400;
const APP_VERSION = '0.22.0';
const APP_BUILD = 'dev'; // replaced by the build number when GitHub deploys the site
/** Chargement : « Chargement... » s'écrit à la machine à écrire (voir .tw dans styles.css). */
const LOADING = '<span class="tw" role="status"><span>Chargement...</span><i></i></span>';
document.documentElement.dataset.appv = `${APP_VERSION}+${APP_BUILD}`;

// Redrawing replaces the page content: remember where the reader was so the screen doesn't jump to the top.
let lastViewKey = null;
// BÊTA téléphone : la barre d'ajout vit dans <body>, pas dans la page : les animations de page ne la déplacent plus, et elle suit le clavier toute seule.
let composerHost = null, composerFor = null;
function mountComposer() {
  const inline = $app.querySelector('.composer');
  if (!isBeta() || !inline) { composerHost?.remove(); composerHost = null; composerFor = null; document.body.classList.remove('has-composer'); document.documentElement.classList.remove('qa-side'); return; }
  document.body.classList.add('has-composer');
  if (!composerHost) { composerHost = document.createElement('div'); composerHost.id = 'composer-host'; document.body.append(composerHost); bindActions(composerHost); }
  const active = document.activeElement;
  if (composerHost.firstElementChild && composerHost.contains(active) && active.matches('input, textarea, select')) inline.remove(); // on tape : on garde la barre en place (pas de perte du clavier)
  else { composerHost.replaceChildren(inline); document.documentElement.classList.toggle('qa-open', !!state.composerOpen); }
  if (composerFor !== state.pid) { // arrivée dans un projet : la barre monte doucement (une seule fois)
    composerFor = state.pid;
    const bar = composerHost.firstElementChild;
    if (bar && !matchMedia('(prefers-reduced-motion: reduce)').matches) bar.animate([{ transform: 'translateY(30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, delay: 120, easing: 'cubic-bezier(.25, .9, .3, 1)', fill: 'backwards' });
  }
}
function redraw(key, draw) {
  const same = key === lastViewKey, prevKey = lastViewKey;
  const y = window.scrollY;
  const chips = document.querySelector('.chips')?.scrollLeft ?? 0;
  const before = same ? fx.snapshot() : null; // les éléments qui bougent glissent, les nouveaux se collent
  const tabs = same ? null : fx.tabSnapshot(); // la barre d'onglets : ancien état, pour le fondre dans le nouveau
  const snap = same ? null : fx.pageSnap(); // l'ancienne page, pour un fondu enchaîné (pas d'écran vide au clic)
  draw();
  mountComposer();
  packLists(); // listes sur plusieurs colonnes : on répartit les blocs avant d'animer (les positions mesurées doivent être les bonnes)
  lastViewKey = key;
  window.scrollTo(0, same ? y : 0);
  const c = document.querySelector('.chips');
  if (c && same) c.scrollLeft = chips;
  if (before) fx.play(before); else fx.view(prevKey, key, tabs, snap);
}

/** Liste des tâches sur ordinateur (plusieurs colonnes) : chaque bloc (chantier, tâche, titre…) occupe autant de « cases » invisibles (lignes de 6 px)
 *  que sa hauteur, et la grille « dense » les range au mieux pour ne laisser aucun trou. Sur téléphone (une colonne), rien n'est fait. */
const PACK_ROW = 6, PACK_GAP = 12;
let packRO = null, packRAF = 0;
const packSeen = new Set();
function packLists() {
  const boxes = [...$app.querySelectorAll('.columns.one > .col, .done-list')];
  // un bloc change de taille (police chargée, texte…) : on répartit de nouveau ; on ignore la première notification d'un bloc qui vient d'être observé
  packRO ||= new ResizeObserver((entries) => {
    if (!entries.some((e) => e.target._ph !== undefined && Math.abs(e.target.getBoundingClientRect().height - e.target._ph) > 1)) return;
    cancelAnimationFrame(packRAF); packRAF = requestAnimationFrame(packLists);
  });
  for (const k of packSeen) if (!k.isConnected) { packRO.unobserve(k); packSeen.delete(k); }
  for (const box of boxes) {
    const kids = [...box.children];
    kids.forEach((k) => { k.style.gridRowEnd = ''; });
    if (getComputedStyle(box).gridTemplateColumns.split(' ').length < 2) continue;
    const hs = kids.map((k) => k.getBoundingClientRect().height);
    kids.forEach((k, i) => { k._ph = hs[i]; k.style.gridRowEnd = `span ${Math.max(1, Math.ceil((hs[i] + PACK_GAP) / PACK_ROW))}`; if (!packSeen.has(k)) { packSeen.add(k); packRO.observe(k); } });
  }
}
window.addEventListener('resize', () => { cancelAnimationFrame(packRAF); packRAF = requestAnimationFrame(packLists); });

const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

const state = {
  quickType: store.get('quickType', 'task'),
  me: null, authStep: 'email', authEmail: '', authError: '', authInfo: '',
  projects: [], filter: 'all',
  pid: null, data: null, tab: 'apercu',
  activityOpen: store.get('activityOpen', '0') === '1',
  boardGroup: store.get('boardGroup', 'status'), taskFilter: 'all', showDone: false, epicDone: new Set(), epicOpen: new Set(), showLater: false, justDone: null, justDoneFrom: 'todo', justUndone: null,
  boardView: store.get('boardView', matchMedia('(max-width: 719px)').matches ? 'grid' : 'wall'),
  dragging: false, installPrompt: null,
};

// ---------- utils ----------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Escaped text with light markdown: **bold**, *italic* / _italic_, __underline__, ==highlight== (one line at a time). */
const md = (text) => esc(text)
  .replace(/==(?=[^\s=])([^\n=]+?)(?<=[^\s=])==/g, '<mark>$1</mark>')
  .replace(/\*\*(?=\S)([^\n]+?)(?<=\S)\*\*/g, '<strong>$1</strong>')
  .replace(/(?<!_)__(?=\S)([^\n]+?)(?<=\S)__(?!_)/g, '<u>$1</u>')
  .replace(/(?<![\w*])\*(?=[^\s*])([^\n*]+?)(?<=[^\s*])\*(?![\w*])/g, '<em>$1</em>')
  .replace(/(?<![\w_])_(?=[^\s_])([^\n_]+?)(?<=[^\s_])_(?![\w_])/g, '<em>$1</em>');
const MD_HINT = '<small class="muted md-hint">**gras** · *italique* · __souligné__ · ==surligné==</small>';
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

// ---------- mode bêta : une 2ᵉ copie de l'app (adresse …/beta/, installable à part), cachée ----------
// Hors de vue : on la débloque en touchant 7 fois « version x.y.z » dans Mon compte. Ensuite un bouton passe de l'une à l'autre
// (Mon compte dans l'app normale ; la languette « BÊTA » ou Mon compte dans la bêta). Même compte, mêmes données.
// Une nouveauté pas encore officielle s'écrit `if (isBeta()) { … }` : visible seulement dans la copie bêta.
// (Hors http, par exemple le fichier de test ouvert en double-clic, il n'y a pas d'adresse /beta/ : un réglage local fait office de bêta.)
const onWeb = /^https?:$/.test(location.protocol);
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* stockage bloqué */ } };
const isBeta = () => (onWeb ? /\/beta\//.test(location.pathname) : lsGet('tp-beta') === '1');
const betaUnlocked = () => lsGet('tp-beta-ok') === '1';
// L'app se souvient de la dernière version utilisée (normale ou bêta) et s'ouvre dessus au lancement.
const MODE_KEY = 'tp-mode';
if (onWeb) {
  if (isBeta() && !betaUnlocked()) { lsSet(MODE_KEY, 'stable'); location.replace('../'); } // le dossier /beta/ ne s'ouvre que si l'interrupteur a été débloqué sur cet appareil
  else if (isBeta()) lsSet(MODE_KEY, 'beta');
  else if (lsGet(MODE_KEY) === 'beta' && betaUnlocked()) location.replace(`beta/${location.hash}`); // dernière fois : bêta
}
const betaSwitch = (toBeta) => {
  if (onWeb) { lsSet(MODE_KEY, toBeta ? 'beta' : 'stable'); location.href = toBeta ? 'beta/' : '../'; return; }
  lsSet('tp-beta', toBeta ? '1' : null); document.body.classList.toggle('beta', toBeta); drawBetaTab(); accountSheet();
};
function drawBetaTab() {
  document.querySelector('.beta-tab')?.remove();
  if (!isBeta()) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'beta-tab'; b.textContent = 'BÊTA'; b.title = 'Ce qu’il y a dans la bêta';
  b.addEventListener('click', betaMenu); document.body.append(b);
}
document.body.classList.toggle('beta', isBeta()); drawBetaTab();
// Petit menu de la bêta : ce qu'elle a de plus que l'app normale (public/beta.json, à tenir à jour à la main : une entrée {title, text} par nouveauté cachée derrière `isBeta()`, retirée quand elle devient officielle).
async function betaMenu() {
  let list = [];
  try { const r = await fetch('beta.json', { cache: 'no-cache' }); if (r.ok) list = await r.json(); } catch { /* hors ligne : liste vide */ }
  list = Array.isArray(list) ? list.filter((x) => x && x.title) : [];
  openSheet(`
    <div class="stack">
      <div class="sheet-head"><h2 id="sheet-title">Version bêta</h2><button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">${ico('x')}</button></div>
      <p class="small muted">Ce qu’il y a ici en plus de l’app normale :</p>
      ${list.length ? `<ul class="beta-list">${list.map((x) => `<li><strong>${esc(x.title)}</strong>${x.text ? `<span class="small muted">${esc(x.text)}</span>` : ''}</li>`).join('')}</ul>`
        : '<p class="muted">Rien de plus pour l’instant : la bêta est identique à l’app normale.</p>'}
      <button type="button" class="btn" data-action="beta-stable">Revenir à l’app normale</button>
    </div>`);
}
let verTaps = 0, verTapAt = 0;

// BÊTA : un tampon seulement pour une action ponctuelle (valider, envoyer, copier). Suppressions (déjà animées), modifications et curseurs : plus de tampon.
const quiet = (msg) => { if (!isBeta()) toast(msg); };
function toast(msg, err = false, action = null) {
  const box = document.getElementById('toasts');
  if (!err && !action) { // message tout simple : un tampon encreur le pose sur l'écran
    const el = document.createElement('div');
    el.className = 'toast st-toast';
    el.innerHTML = `<span class="st-ink"></span><i class="st-tool" aria-hidden="true"><b></b></i>`;
    el.querySelector('.st-ink').textContent = msg;
    box.append(el);
    fx.stamp(el).then(() => setTimeout(() => { const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: 'forwards' }); a.finished.then(() => el.remove(), () => el.remove()); }, 1500));
    return;
  }
  const el = document.createElement('div');
  el.className = `toast${err ? ' err' : ''}${action ? ' has-act' : ''}`;
  el.textContent = msg;
  if (action) {
    const b = document.createElement('button');
    b.className = 'toast-act'; b.textContent = action.label;
    b.addEventListener('click', () => { el.remove(); action.fn(); });
    el.append(b);
  }
  box.append(el);
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

let sheetCleanup = null, sheetAt = 0, sheetToken = 0;
// Le bouton « retour » (Android, geste) ferme la feuille au lieu de quitter l'écran : une entrée d'historique est ajoutée à l'ouverture et retirée à la fermeture.
let sheetPushed = false, skipPop = false;
const dropSheetEntry = (navigating) => {
  if (!sheetPushed) return;
  sheetPushed = false;
  try {
    if (navigating) history.replaceState(null, ''); // on part ailleurs tout de suite : l'entrée reste mais ne sert plus
    else if (history.state?.sheet) { skipPop = true; history.back(); }
  } catch { /* page sans historique (aperçu isolé) */ }
};
window.addEventListener('popstate', (e) => {
  if (skipPop) { skipPop = false; e.stopImmediatePropagation(); return; }
  if (sheetPushed) { sheetPushed = false; e.stopImmediatePropagation(); closeSheet(); }
});
function openSheet(html, onMount) {
  sheetToken++;
  if (!sheet.open && !sheetPushed) { try { history.pushState({ sheet: 1 }, ''); sheetPushed = true; } catch { /* page sans historique (aperçu isolé) */ } }
  sheetCleanup?.();
  sheetCleanup = null;
  sheet.classList.remove('badge-sheet');
  sheet.innerHTML = `<div class="sheet-body">${html}</div>`;
  if (!sheet.open) { sheet.showModal(); fx.sheetIn(sheet.querySelector('.sheet-body')); }
  sheet.querySelectorAll('textarea').forEach(mdPreview);
  sheet.querySelectorAll('textarea.input').forEach(autoGrow);
  sheetAt = Date.now();
  sheetCleanup = onMount?.(sheet) || null;
  const auto = sheet.querySelector('[autofocus]');
  if (auto && !isPhone()) auto.focus();
}
function closeSheet(opt) {
  sheetCleanup?.();
  sheetCleanup = null;
  dropSheetEntry(opt?.navigating);
  if (!sheet.open) return;
  const t = ++sheetToken;
  fx.sheetOut(sheet.querySelector('.sheet-body')).then(() => { if (t === sheetToken && sheet.open) sheet.close(); });
}
// the click that follows a tap lands on the backdrop right after opening: ignore it
sheet.addEventListener('click', (e) => { if (e.target === sheet && Date.now() - sheetAt > 450) closeSheet(); });
sheet.addEventListener('close', () => { sheetCleanup?.(); sheetCleanup = null; dropSheetEntry(false); });
// Live preview of **bold** / *italic* / __underline__ under long text fields (only when there is some markup).
/** Textareas of a sheet grow with their text (no resize handle). */
function autoGrow(ta) {
  if (!ta?.matches?.('textarea.input')) return;
  ta.style.height = 'auto';
  ta.style.height = `${Math.min(ta.scrollHeight + 2, Math.round(innerHeight * .5))}px`;
}
function mdPreview(ta) {
  const box = ta.closest('.field')?.querySelector('.md-preview');
  if (!box) return;
  const html = md(ta.value);
  box.hidden = html === esc(ta.value);
  if (!box.hidden) box.innerHTML = html;
}
sheet.addEventListener('input', (e) => {
  if (e.target.tagName === 'TEXTAREA') { mdPreview(e.target); autoGrow(e.target); }
  if (e.target.id === 'pf-color') syncProjectColor();
  const form = e.target.form;
  if (e.target.name?.startsWith('tc_') && form?.elements.tc_task) { refreshStylePreview(form); syncTypeColors(form); }
  if (e.target.name === 'displayName' && form?.elements.avatarEmoji) refreshAvatarPreview(form);
  if (form?.dataset.form === 'profile' && (e.target.name === 'displayName' || e.target.name === 'username')) queueProfileSave(form);
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
window.addEventListener('hashchange', () => { closeSheet({ navigating: true }); render(); });

async function render() {
  document.body.classList.remove('with-tabbar');
  if (route().name !== 'project') { applyTaskStyle(null); wallApi = null; if (state.wall) state.wall.fs = false; document.documentElement.classList.remove('wall-open'); }
  if (!state.me) return renderAuth();
  const r = route();
  if (r.name === 'project') {
    state.tab = ['apercu', 'taches', 'idees', 'equipe'].includes(r.tab) ? r.tab : 'apercu';
    if (state.pid !== r.id || !state.data) {
      state.pid = r.id; state.data = null;
      $app.innerHTML = `<div class="loading">${LOADING}</div>`;
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

/** Confirmation de suppression d'un chantier : une case pour supprimer aussi ses tâches (sinon elles sont gardées, hors chantier). */
function confirmEpicSheet(e, n) {
  return new Promise((resolve) => {
    openSheet(`
      <h2 id="sheet-title">Supprimer ce chantier ?</h2>
      <p>« ${esc(e.title)} »</p>
      ${n ? `<label class="check-row"><input type="checkbox" id="de-tasks"><span><b>Supprimer aussi ses ${n} tâche${n > 1 ? 's' : ''}</b><small>Décoché : elles sont gardées, hors chantier.</small></span></label>` : '<p class="small muted">Ce chantier est vide.</p>'}
      <div class="row end"><button class="btn ghost" data-r="0">Annuler</button><button class="btn danger solid" data-r="1">Supprimer</button></div>`,
    (root) => {
      const onClick = (ev) => { const b = ev.target.closest('[data-r]'); if (b) { resolve(b.dataset.r === '1' ? { withTasks: !!root.querySelector('#de-tasks')?.checked } : null); closeSheet(); } };
      root.addEventListener('click', onClick);
      return () => { root.removeEventListener('click', onClick); resolve(null); };
    });
  });
}

/** Joue l'animation de suppression (corbeille ou déchiqueteuse) en même temps que la suppression ; si elle échoue, l'élément réapparaît. */
/** Les tâches à l'écran glissent vers leur nouvelle place quand l'une d'elles part (sinon les suivantes sautent). */
const noteKeys = () => [...$app.querySelectorAll('.note-grid [data-fx^="note:"]')].map((e) => e.dataset.fx); // les post-it restants se recalent en glissant
const taskKeys = (id) => [`task:${id}`, ...[...$app.querySelectorAll('[data-fx^="task:"]')].map((e) => e.dataset.fx)];

/** Vue « Liste » : la tâche terminée s'envole vers « Terminées » (en bas de la liste), puis la section fait un petit bond.
 *  À appeler AVANT le redessin ; la fonction rendue se lance APRÈS (la section « Terminées » n'existe qu'à ce moment-là). */
function flyDone(id) {
  if (state.boardGroup === 'epic') return null;
  const el = $app.querySelector(`.task[data-id="${id}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return () => fx.flyTo(el, () => $app.querySelector('.done-head'), r);
}

async function removeWith(effect, node, remove, html, opts) {
  let ok = false;
  const show = (effect === 'shred' ? fx.shred(node, html) : fx.trash(node, opts)).catch(() => {});
  try { await Promise.all([remove(), show]); ok = true; } finally { if (!ok && node) node.style.visibility = ''; }
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
  if (sheet.open || state.dragging || state.panning || state.justDone || state.justUndone || ($app.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) {
    clearTimeout(staleTimer); staleTimer = setTimeout(refreshIfIdle, 2000); // try again once idle
    return;
  }
  const fresh = await db.getProject(state.pid, state.me.id).catch(() => null); // projet supprimé entre-temps : on laisse tomber
  if (fresh && JSON.stringify(fresh) !== JSON.stringify(state.data)) { state.data = fresh; renderProject(); }
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
        <button class="btn" type="button" data-action="passkey-login">${icon.key} Utiliser une clé d'accès</button>
        ${passkeysMoved() ? '<p class="small muted">Ta clé ne marche plus ? Le site a changé d\'adresse : connecte-toi avec le lien reçu par email, puis crée une nouvelle clé.</p>' : ''}` : ''}
        <p class="small muted">Pas de mot de passe ici. ${db.allowSignup ? 'Première visite ? Le lien reçu par email crée ton compte.' : "Pas de compte ? Demande à un admin de t'inviter."}${passkeys ? " Une fois connecté, tu pourras créer une clé d'accès pour entrer en un geste (Face ID, empreinte…)." : ''}</p>`}
        <p class="small muted legal-line"><a href="confidentialite.html" target="_blank" rel="noopener">Confidentialité</a> · © 2026 Paname Dev</p>
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

// The site moved to its own domain: passkeys are tied to the address, so the old ones stop working.
const NEW_HOST = 'toolproj.panamedev.fr';
const passkeysMoved = () => location.hostname === NEW_HOST && db.passkeysSupported();

function passkeyMovedSheet() {
  openSheet(`
    <div class="stack">
      <div class="key-badge" aria-hidden="true">${icon.key}</div>
      <h2 id="sheet-title">Nouvelle adresse, nouvelle clé d'accès</h2>
      <p>Le site a changé d'adresse (<b>${NEW_HOST}</b>). Les clés d'accès créées avant ne fonctionnent plus : c'est normal, elles sont liées à l'ancienne adresse.</p>
      <p class="small muted">Crée-en une nouvelle pour entrer en un geste. Tu pourras supprimer les anciennes dans <b>Mon compte</b>. Sans clé, le lien reçu par email marche toujours.</p>
      <div class="row end"><button class="btn ghost" data-action="close">Plus tard</button><button class="btn primary" data-action="passkey-add" data-then="close">Créer une nouvelle clé</button></div>
    </div>`);
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
  <a data-fx="proj:${p.id}" class="pcard" href="#/p/${p.id}" style="--pc:${esc(p.color)}">
    <span class="pc-back" aria-hidden="true"></span>
    <span class="pc-sheet" aria-hidden="true"></span>
    <span class="pc-tab"><i class="pc-dot st-${p.status}"></i>${STATUS[p.status]}</span>
    <div class="pc-front">
      <span class="pc-sticker">${glyph(p.emoji)}</span>
      <h2 class="pc-name">${esc(p.name)}</h2>
      ${p.role === 'admin' ? '<span class="pc-role">admin</span>' : ''}
      ${p.description ? `<p class="desc">${md(p.description)}</p>` : ''}
      <div class="pc-progress">
        <div class="row between small"><span>Avancement</span><strong class="num">${p.progress} %</strong></div>
        <div class="progress"><i style="width:${p.progress}%"></i></div>
      </div>
      <div class="pcard-foot">
        <div class="stats"><span>${p.tasks.total - p.tasks.done} à faire</span><span>${p.noteCount} post-it</span><span>${timeAgo(p.updatedAt)}</span></div>
        <div class="avatars">${p.members.slice(0, 4).map((m) => avatar(m)).join('')}</div>
      </div>
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
    <button class="btn ghost icon" data-action="account" aria-label="Mon compte${hasNews() ? ' (nouveautés)' : ''}">${avatar(state.me)}${hasNews() ? '<i class="news-dot"></i>' : ''}</button></div></header>`;
}

// ---------- project form ----------

const SAMPLE_TASKS = { task: 'Écran de connexion', bug: 'Crash au lancement', idea: 'Et si on avait un mode sombre ?', improvement: 'Chargement plus rapide' };

const COLOR_PRESETS = ['#e03131', '#f76707', '#fab005', '#94d82d', '#2f9e44', '#12b886', '#15aabf', '#4dabf7', '#4c6ef5', '#7048c8', '#e64980', '#adb5bd'];

function stylePreviewHtml(p) {
  const c = typeColors(p);
  const vars = TYPE_LIST.map((k) => `--c-${k}:${c[k]}`).join(';');
  return `<div class="style-preview items" style="${vars}" aria-hidden="true">
    ${TYPE_LIST.map((k) => `<div class="task t-${k}"><span class="check"></span><div class="t-main"><span class="t-title">${esc(SAMPLE_TASKS[k])}</span>${typeTag({ type: k }) ? `<span class="t-meta">${typeTag({ type: k })}</span>` : ''}</div></div>`).join('')}
  </div>`;
}

/** One colour per task type, with a live preview. */
function taskStyleField(p) {
  const colors = typeColors(p);
  return `
  <div class="field style-field"><span>Couleur de chaque type de tâche</span>
    <div class="type-colors">${TYPE_LIST.map((t) => {
      const cur = colors[t].toLowerCase(), custom = !COLOR_PRESETS.includes(cur);
      return `<div class="tc-row"><div class="tc-name">${typeLabel(t)}</div>
        <div class="tc-swatches" role="radiogroup" aria-label="Couleur ${TYPES[t]}">
          ${COLOR_PRESETS.map((c) => `<button type="button" class="tc-sw" data-action="pick-type-color" data-t="${t}" data-v="${c}" style="--sw:${c}" aria-pressed="${c === cur}" aria-label="${c}"></button>`).join('')}
          <label class="tc-sw tc-custom" ${custom ? `style="--sw:${cur}"` : ''} aria-pressed="${custom}" title="Autre couleur"><input type="color" name="tc_${t}" value="${colors[t]}" aria-label="Autre couleur pour ${TYPES[t]}"></label>
        </div></div>`;
    }).join('')}</div>
    <button type="button" class="link-btn small" data-action="reset-type-colors" style="justify-self:start">Revenir aux couleurs d'origine</button>
    <div id="style-preview-box">${stylePreviewHtml(p)}</div>
  </div>`;
}

/** Reads the form's current style + colours and redraws the preview. */
function refreshStylePreview(form) {
  const f = form.elements;
  const p = { typeColors: Object.fromEntries(TYPE_LIST.map((t) => [t, f[`tc_${t}`].value])) };
  form.querySelector('#style-preview-box').innerHTML = stylePreviewHtml(p);
}
/** Keeps the colour swatches in step with the (hidden) colour fields. */
/** Project colour swatches follow the colour field ("other" shows a custom colour). */
function syncProjectColor() {
  const input = sheet.querySelector('#pf-color'); if (!input) return;
  const cur = input.value.toLowerCase(); let hit = false;
  sheet.querySelectorAll('[data-action="pick-color"]').forEach((b) => { const on = b.dataset.v.toLowerCase() === cur; if (on) hit = true; b.setAttribute('aria-pressed', on); });
  const c = input.closest('.tc-custom'); c.setAttribute('aria-pressed', !hit);
  if (hit) { c.style.removeProperty('--sw'); c.style.removeProperty('--note'); } else { c.style.setProperty('--sw', cur); c.style.setProperty('--note', cur); }
}
function syncTypeColors(form) {
  for (const t of TYPE_LIST) {
    const cur = form.elements[`tc_${t}`].value.toLowerCase(), row = form.elements[`tc_${t}`].closest('.tc-row');
    let hit = false;
    row.querySelectorAll('button.tc-sw').forEach((b) => { const on = b.dataset.v === cur; if (on) hit = true; b.setAttribute('aria-pressed', on); });
    const c = row.querySelector('.tc-custom'); c.setAttribute('aria-pressed', !hit); c.style.setProperty('--sw', hit ? '' : cur);
    if (hit) c.style.removeProperty('--sw');
  }
}
function setFormColors(form) {
  TYPE_LIST.forEach((t) => { form.elements[`tc_${t}`].value = TYPE_COLOR_DEFAULTS[t]; });
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
        <label class="swatch tc-custom" ${PROJECT_COLORS.includes(p.color) ? '' : `style="--sw:${esc(p.color)};--note:${esc(p.color)}"`} aria-pressed="${!PROJECT_COLORS.includes(p.color)}" title="Autre couleur"><input type="color" id="pf-color" name="color" value="${esc(p.color)}" aria-label="Autre couleur"></label></div>
      </div>
      <label class="field"><span>Statut</span><select class="input" id="pf-status" name="status">${Object.entries(STATUS).map(([k, l]) => `<option value="${k}" ${k === p.status ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Description</span><textarea class="input" id="pf-desc" name="description" maxlength="2000" placeholder="Le but de l'app, pour qui, la stack…">${esc(p.description)}</textarea>${MD_HINT}<div class="md-preview description" hidden></div></label>
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
  redraw(`p${p.id}/${state.tab}/${state.boardGroup}/${state.boardView}/${state.wall?.fs ? 'fs' : ''}`, () => { $app.innerHTML = `
  ${topbar(`
    <a class="btn ghost icon" href="#/" aria-label="Retour aux projets">${icon.back}</a>
    <div class="title" style="--pc:${esc(p.color)}"><span class="emoji-badge">${glyph(p.emoji)}</span><h1>${esc(p.name)}</h1><span class="pill ${p.status} hide-sm">${STATUS[p.status]}</span></div>
    ${isAdmin ? `<button class="btn ghost icon" data-action="edit-project" aria-label="Paramètres du projet">${icon.gear}</button>` : ''}`)}
  <nav class="tabs" data-active="${state.tab}" aria-label="Sections du projet">
    ${tabs.map(([k, l, ic, n]) => `<a class="tab" data-k="${k}" href="#/p/${p.id}/${k}" ${state.tab === k ? 'aria-current="page"' : ''}><span class="ico">${ic}</span>${l}${n ? `<span class="count num">${n}</span>` : ''}</a>`).join('')}
  </nav>
  <div class="tab-band" data-k="${state.tab}" aria-hidden="true"></div>
  <main class="page" style="--pc:${esc(p.color)}">
    ${{ apercu: viewOverview, taches: viewTasks, idees: viewNotes, equipe: viewTeam }[state.tab](d)}
  </main>
  ${state.tab === 'idees' ? '<button class="fab hide-lg" data-action="new-note">+ Post-it</button>' : ''}
  ${state.tab === 'taches' && !isBeta() ? '<button class="fab hide-lg" data-action="new-item">+ Ajouter</button>' : ''}
  ${isBeta() && state.tab !== 'taches' ? composer('Ajouter une tâche…', true) : ''}`; }); // BÊTA : sur téléphone la barre d'ajout en bas remplace le bouton flottant

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
        <div><span class="label">Terminé</span><strong class="num">${p.tasks.done}</strong></div>
        <div class="${bugs ? 'warn' : ''}"><span class="label">Bugs ouverts</span><strong class="num">${bugs}</strong></div>
      </div>
      ${linksBlock(d)}
      ${p.description ? `<div class="stack" style="gap:6px"><span class="label">Description</span><p class="description">${md(p.description)}</p></div>`
        : p.role === 'admin' ? '<p class="muted small">Pas encore de description. <button class="link-btn" data-action="edit-project">En ajouter une</button></p>' : ''}
    </section>
    <div class="stack" style="gap:16px">
      <section class="panel">
        <div class="row between"><h3>Chantiers en cours</h3><button class="link-btn small" data-action="goto-roadmap">Voir les chantiers</button></div>
        ${now.length ? `<div class="stack" style="gap:12px">${now.map((e) => { const pr = epicProgress(d, e.id); return `
          <button class="now-epic" data-action="open-epic" data-id="${e.id}"><span class="row between"><b>${esc(e.title)}</b><span class="small muted num">${pr.done}/${pr.total}</span></span>
          <span class="progress"><i style="width:${pr.pct}%"></i></span></button>`; }).join('')}</div>`
          : '<p class="muted small">Aucun chantier dans « Maintenant ». Range tes grandes idées dans des chantiers.</p>'}
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
  <article class="note c-${n.color}" data-note="${n.id}" data-fx="note:${n.id}" ${wall ? '' : `data-action="open-note" data-id="${n.id}"`}
    style="--rot:${rot}deg;${wall ? `left:${n.x}px;top:${n.y}px;z-index:${n.z}` : ''}" tabindex="0" aria-label="Post-it : ${esc(n.text.slice(0, 60))}">
    <div class="n-text">${md(n.text)}</div>
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
        <div class="wall-bin" role="img" aria-label="Corbeille : lâche un post-it ici pour le jeter">${fx.binHtml('wl')}</div>
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
          <div class="member bd-${m.role} ${m.id === state.me.id ? 'is-me' : ''}">
            <span class="badge-role">${m.role === 'admin' ? 'Admin' : 'Membre'}</span>
            ${avatar(m, 'lg')}
            <div class="grow"><strong>${esc(m.displayName)}${m.id === state.me.id ? ' (toi)' : ''}</strong><span class="small muted">@${esc(m.username)}</span></div>
            ${isAdmin ? `<select aria-label="Rôle de ${esc(m.displayName)}" data-change="role" data-id="${m.id}">
                <option value="member" ${m.role === 'member' ? 'selected' : ''}>Membre</option><option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Admin</option></select>` : ''}
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
// Quick-add bar: the type button cycles through the types; what is typed is kept (per project) when you change tab.
let addingTask = false; // un ajout rapide est en cours d'envoi
const quickType = () => (TYPES[state.quickType] ? state.quickType : 'task');
const quickTypeBtn = () => { const k = quickType(); return `<button type="button" class="qa-type ty-${k}" data-action="quick-type" aria-label="Type : ${TYPES[k]} (toucher pour changer)">${isBeta() ? `<span class="qa-pg" aria-hidden="true">${typeIcon(k, 22)}<b class="qa-pgname">${TYPES[k]}</b></span><span class="qa-rings" aria-hidden="true"></span><span class="qa-d">` : ''}${typeIcon(k, 18)}<span class="qa-lbl">${TYPE_LIST.map((t) => `<span ${t === k ? '' : 'aria-hidden="true" class="off"'}>${TYPES[t]}</span>`).join('')}</span>${isBeta() ? '</span>' : ''}</button>`; };
// BÊTA : le même mini bloc-note, en large et avec le nom du type, dans la feuille complète (un toucher = page suivante)
const typeBook = () => { const k = quickType(); return `<button type="button" class="qa-book ty-${k}" data-action="quick-type" aria-label="Type : ${TYPES[k]} (toucher pour passer au suivant)"><span class="qa-pg" aria-hidden="true">${typeIcon(k, 24)}<b>${TYPES[k]}</b><i class="qa-dots">${TYPE_LIST.map((t) => `<i${t === k ? ' class="on"' : ''}></i>`).join('')}</i></span><span class="qa-rings" aria-hidden="true"></span></button>`; };
const draftKey = () => `draft:${state.pid}`;
// ---------- menu complet de la ligne d'ajout ----------
// Téléphone (comme Reminder de Samsung) : on tire la petite barre vers le haut, le champ de texte monte avec le doigt jusqu'en haut de l'écran
// et un menu de tâche complet se déploie derrière lui. --p va de 0 (barre en bas) à 1 (menu ouvert). Ordinateur : « Plus de détails ».
const isMobile = () => matchMedia('(max-width: 719px)').matches;
if (isBeta()) { // la page se redimensionne avec le clavier : une barre « fixée en bas » le suit toute seule, sans attendre un événement
  const m = document.querySelector('meta[name="viewport"]');
  if (m && !/interactive-widget/.test(m.content)) m.content += ', interactive-widget=resizes-content';
}
const topField = () => (isMobile() ? 104 : 80); // où le champ se range, en haut du menu ouvert (px)
let composerCloseT = 0;
let composerVars = {}; // mesures de la barre fermée, gardées quand la page se redessine
function composerMeasure(f) {
  if (f.classList.contains('open') || f.classList.contains('dragging') || f.classList.contains('closing')) return;
  const row = f.querySelector('.qa-row');
  const rr = row.getBoundingClientRect();
  composerVars = { '--ry0': `${Math.round(rr.top)}px`, '--rx0': `${Math.round(rr.left)}px`, '--rw0': `${Math.round(rr.width)}px` };
  for (const [k, v] of Object.entries(composerVars)) f.style.setProperty(k, v);
}
function refreshRy0(f) { // où la barre se range quand elle est fermée, MAINTENANT (le clavier, lui, bouge)
  const s = f?.querySelector('.qa-slot'); if (!s || getComputedStyle(s).display === 'none') return;
  const v = `${Math.round(s.getBoundingClientRect().top)}px`;
  if (f.style.getPropertyValue('--ry0') !== v) f.style.setProperty('--ry0', v);
}
window.visualViewport?.addEventListener('resize', () => { const f = document.querySelector('.composer.closing'); if (f) refreshRy0(f); });
function setComposerOpen(on, { focus = false, keepFocus = false, measure = true } = {}) {
  state.composerOpen = !!on;
  const f = document.querySelector('.composer'); if (!f) return;
  const wasOpen = f.classList.contains('open');
  if (on && measure) composerMeasure(f);
  clearTimeout(composerCloseT);
  if (!state.composerOpen) { f.classList.add('closing'); composerCloseT = setTimeout(() => f.classList.remove('closing'), 520); } else f.classList.remove('closing');
  f.classList.toggle('open', state.composerOpen);
  if (!state.composerOpen) { // la barre revient à sa place DU MOMENT (le clavier et la barre d'onglets bougent pendant ce temps) : on la suit à chaque image
    const t0 = performance.now(), tick = () => { refreshRy0(f); if (f.isConnected && f.classList.contains('closing') && performance.now() - t0 < 560) requestAnimationFrame(tick); };
    tick();
  }
  document.documentElement.classList.toggle('qa-open', state.composerOpen && isMobile());
  document.documentElement.classList.toggle('qa-side', state.composerOpen && !isMobile()); // ordinateur : la page se serre pour laisser la place à la feuille sur le côté
  f.querySelector('.qa-handle')?.setAttribute('aria-expanded', String(state.composerOpen));
  const title = f.querySelector('#task-new');
  if (on && focus) setTimeout(() => title?.focus({ preventScroll: true }), 80);
  if (!on && wasOpen && !keepFocus && f.contains(document.activeElement) && isMobile()) document.activeElement.blur(); // on ne ferme le clavier qu'en refermant un menu ouvert
}
let hdrag = null, swallowH = 0;
document.addEventListener('pointerdown', (e) => {
  const h = e.target.closest?.('.composer .qa-handle');
  if (!h || !e.isPrimary || !isMobile()) return; // sur ordinateur, la poignée se clique (pas de glisser)
  const f = h.closest('.composer');
  hdrag = { f, h, id: e.pointerId, y: e.clientY, ly: e.clientY, on: false, p: state.composerOpen ? 1 : 0, start: state.composerOpen ? 1 : 0, range: 400 };
  try { h.setPointerCapture(e.pointerId); } catch { /* pas grave */ }
});
document.addEventListener('pointermove', (e) => {
  if (!hdrag || e.pointerId !== hdrag.id) return;
  const dy = e.clientY - hdrag.y;
  if (!hdrag.on) {
    if (Math.abs(dy) < 6) return;
    hdrag.on = true; composerMeasure(hdrag.f); hdrag.f.classList.add('dragging');
    hdrag.range = Math.max(160, (parseFloat(hdrag.f.style.getPropertyValue('--ry0')) || 500) - topField()); // distance que parcourt le champ
  }
  hdrag.dir = e.clientY < hdrag.ly ? 'up' : e.clientY > hdrag.ly ? 'down' : hdrag.dir; hdrag.ly = e.clientY; // sens du dernier mouvement
  hdrag.p = Math.max(0, Math.min(1, hdrag.start - dy / hdrag.range));
  hdrag.f.style.setProperty('--p', hdrag.p.toFixed(3));
});
const endHDrag = () => {
  const d = hdrag; hdrag = null;
  if (!d) return;
  swallowH = Date.now() + 400;
  if (!d.on) { setComposerOpen(!state.composerOpen); return; } // simple toucher
  d.f.classList.remove('dragging'); d.f.style.removeProperty('--p');
  // Un petit geste suffit : on regarde surtout le SENS dans lequel le doigt allait quand il s'est levé, et le menu finit le trajet tout seul.
  const open = d.start ? !(d.dir === 'down' ? d.p < 0.95 : d.p < 0.5) : (d.dir === 'up' ? d.p > 0.025 : d.p > 0.5);
  setComposerOpen(open, { measure: false }); // mesuré au début du glissé
};
document.addEventListener('pointerup', endHDrag);
document.addEventListener('pointercancel', endHDrag);
document.addEventListener('click', (e) => { if (Date.now() < swallowH && e.target.closest?.('.composer .qa-handle')) { e.stopPropagation(); e.preventDefault(); } }, true);
// toucher la pastille du type ou la poignée ne doit JAMAIS fermer le clavier : on empêche le champ de perdre le focus
document.addEventListener('click', (e) => { if (e.target.classList?.contains('composer') && state.composerOpen) setComposerOpen(false); }); // toucher le fond assombri referme
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.composerOpen && document.querySelector('.composer.open')) { e.preventDefault(); setComposerOpen(false); } });
document.addEventListener('mousedown', (e) => { if (e.target.closest?.('.composer .qa-type, .composer .qa-book, .composer .qa-handle, .composer .qa-send')) e.preventDefault(); });

// BÊTA : un seul endroit pour ajouter (type, titre, détails, chantier, priorité). La ligne rapide se déploie quand on la touche.
const composer = (placeholder, extra = false) => {
  const d = state.data, k = draftKey();
  const desc = store.get(`${k}:desc`, ''), epic = store.get(`${k}:epic`, ''), prio = store.get(`${k}:prio`, 'normal');
  if (compImg.pid !== state.pid) { for (const i of compImg.items) { if (i.blobs) { URL.revokeObjectURL(i.thumb); URL.revokeObjectURL(i.full); } } compImg.items = []; compImg.pid = state.pid; compImg.queue = Promise.resolve(); }
  const has = !!(store.get(k, '') || desc || compImg.items.length);
  const epics = [...d.epics].filter((e) => e.horizon !== 'done').sort(sortEpics);
  return `
  <form class="quick-add composer${extra ? ' composer-x' : ''}${state.composerOpen ? ' open' : ''}" data-form="add-task" style="${Object.entries(composerVars).map(([k, v]) => `${k}:${v}`).join(';')}">
    <div class="qa-slot" aria-hidden="true"></div>
    <div class="qa-row">
      ${quickTypeBtn()}
      <input class="input" id="task-new" name="title" maxlength="200" placeholder="Ajouter une tâche…" value="${esc(store.get(k, ''))}" autocomplete="off" enterkeyhint="done">
      <button class="btn primary qa-send" type="submit" aria-label="Ajouter"><span class="qa-long">Ajouter</span><span class="qa-short" aria-hidden="true">+</span></button>
    </div>
    <button type="button" class="qa-handle" data-action="composer-more" aria-expanded="${!!state.composerOpen}" aria-label="Plus de détails"><span class="qa-handle-bar" aria-hidden="true"></span><span class="qa-handle-txt">Plus de détails</span></button>
    <div class="qa-sheet"><div class="qa-sheet-body">
      <div class="sheet-head qa-sheet-head"><h2>Nouvelle tâche</h2><button type="button" class="btn ghost icon qa-x" data-action="composer-close" aria-label="Fermer">${ico('x')}</button></div>
      <div class="qa-more"><div class="qa-more-in">
        <div class="field qa-type-field"><span>Type</span>${typeBook()}</div>
        <div class="field"><span>Détails <small class="muted">(facultatif)</small></span>
          <div class="desc-box"><textarea class="input" id="task-desc" name="description" maxlength="5000" rows="3" aria-label="Détails" placeholder="Comment le reproduire, détails, liens…">${esc(desc)}</textarea>
            <div class="img-strip composer-imgs" id="task-images">${imgGridHtml(compImg)}</div></div></div>
        ${segField('priority', PRIORITY, prio, 'Priorité')}
        <label class="field"><span>Chantier</span><select class="input" id="task-epic" name="epicId"><option value="">Hors chantier</option>${epics.map((e) => `<option value="${e.id}" ${String(e.id) === String(epic) ? 'selected' : ''}>${esc(e.title)}${e.horizon === 'later' ? ' (plus tard)' : ''}</option>`).join('')}</select></label>
        <button type="button" class="link-btn" data-action="new-epic">+ Nouveau chantier</button>
      </div></div>
      <div class="qa-sheet-actions"><button type="button" class="btn" data-action="composer-close">Annuler</button><button type="submit" class="btn primary">Ajouter</button></div>
    </div></div>
  </form>`;
};

const quickAdd = (placeholder) => isBeta() ? composer(placeholder) : `
  <form class="quick-add" data-form="add-task">
    ${quickTypeBtn()}
    <input class="input" id="task-new" name="title" maxlength="200" placeholder="${placeholder}" value="${esc(store.get(draftKey(), ''))}" autocomplete="off" enterkeyhint="done">
    <button class="btn primary" type="submit">Ajouter</button>
  </form>`;

const typeLabel = (k) => `<span class="with-ico">${typeIcon(k)} ${TYPES[k]}</span>`;
const NEW_TITLE = { task: 'Nouvelle tâche', bug: 'Nouveau bug', idea: 'Nouvelle idée', improvement: 'Nouvelle amélioration' };

// Task look: one style for everyone (little pieces of paper); each project can change the colour of every type.
const TYPE_COLOR_DEFAULTS = { task: '#adb5bd', bug: '#f76707', idea: '#fab005', improvement: '#4dabf7' };
const typeColors = (p) => ({ ...TYPE_COLOR_DEFAULTS, ...(p?.typeColors || {}) });

/** Puts the project's type colours on <body>; null clears them (project list, login). */
function applyTaskStyle(p) {
  const b = document.body;
  if (!p) { TYPE_LIST.forEach((k) => b.style.removeProperty(`--c-${k}`)); return; }
  const c = typeColors(p);
  TYPE_LIST.forEach((k) => b.style.setProperty(`--c-${k}`, c[k]));
}
const PRIORITY = { high: 'Haute', normal: 'Normale', low: 'Basse' };
const HORIZON = { now: 'Maintenant', later: 'Plus tard', done: 'Terminé' };
const STATUS_ORDER = { todo: 0, done: 1 };
const PRIO_ORDER = { high: 0, normal: 1, low: 2 };
const HORIZON_ORDER = { now: 0, later: 1, done: 2 };

const CHECK_SVG = '<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="M7.500 16.500Q10.500 19.800 13 24Q18 12.500 27 5.500"/></svg>';
const typeTag = (t) => (t.type === 'task' ? '' : `<span class="type-tag ty-${t.type}"><i aria-hidden="true">${typeIcon(t.type, 13)}</i>${TYPES[t.type]}</span>`);
const prioTag = (t) => (t.priority === 'high' ? '<span class="stamp" title="Priorité haute">Urgent</span>' : t.priority === 'low' ? '<span class="prio low" title="Priorité basse">Basse</span>' : '');
// la tâche qu'on vient de cocher garde sa place (son ancien statut) le temps de l'animation
const sortStatus = (t) => (t.id === state.justDone ? state.justDoneFrom : t.id === state.justUndone ? 'done' : t.status);
const sortItems = (a, b) => STATUS_ORDER[sortStatus(a)] - STATUS_ORDER[sortStatus(b)] || PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority] || a.position - b.position;
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
  <div data-fx="task:${t.id}" class="task t-${t.type} ${t.status === 'done' ? 'is-done' : ''} ${state.justDone === t.id ? 'just-done' : ''} ${state.justUndone === t.id ? 'just-undone' : ''}" data-action="open-task" data-id="${t.id}" data-drag="task" ${draggable ? 'draggable="true"' : ''}>
    <button class="check ${t.status}" data-action="toggle-task" data-id="${t.id}" aria-label="${t.status === 'done' ? 'Remettre à faire' : 'Marquer comme fait'}">${t.status === 'done' ? CHECK_SVG : ''}</button>
    <div class="t-main">
      <span class="t-title"><span class="t-txt">${esc(t.title)}</span></span>
      ${typeTag(t) || prioTag(t) || t.description || t.images?.length || showEpic ? `<span class="t-meta">${typeTag(t)}${prioTag(t)}${t.description ? '<span class="has-desc" title="A une description">≡ détails</span>' : ''}${t.images?.length ? `<span class="has-desc with-ico" title="${t.images.length} image${t.images.length > 1 ? 's' : ''}">${ico('image', 13)} ${t.images.length}</span>` : ''}${showEpic ? `<span class="t-epic">${esc(showEpic)}</span>` : ''}</span>` : ''}
    </div>
    ${avatar(byId[t.assigneeId])}
  </div>`;
}

function viewTasks(d) {
  const byEpic = state.boardGroup === 'epic';
  const open = d.tasks.filter((t) => t.status !== 'done');
  const filters = [['all', 'Tout', open.length], ['bug', 'Bugs', open.filter((t) => t.type === 'bug').length],
    ['idea', 'Idées', open.filter((t) => t.type === 'idea').length],
    ['improvement', 'Améliorations', open.filter((t) => t.type === 'improvement').length], ['task', 'Tâches', open.filter((t) => t.type === 'task').length],
    ['mine', 'À moi', open.filter((t) => t.assigneeId === state.me.id).length]];
  return `
  ${isBeta() ? '' : `<div class="task-tools"> <!-- BÊTA : plus de ligne d'outils (la ligne d'ajout suffit, et la vue « Par chantier » n'existe plus) -->
    <div class="seg views" role="tablist" aria-label="Affichage">
      ${[['status', 'Liste'], ['epic', 'Par chantier']].map(([k, l]) => `<button data-action="board-group" data-v="${k}" aria-pressed="${(k === 'epic') === byEpic}">${l}</button>`).join('')}
    </div>
    <button class="btn primary hide-sm" data-action="new-item">+ Ajouter</button>
  </div>`}
  ${`<div class="chips" role="toolbar" aria-label="Filtrer">${filters.map(([k, l, n]) => `<button class="chip ${TYPES[k] ? `chip-t ty-${k}` : ''}" data-action="task-filter" data-v="${k}" aria-pressed="${state.taskFilter === k}">${l}<span class="num">${n}</span></button>`).join('')}</div>`}
  ${viewBoard(d)}`;
}

/** « ✓ 3 terminées » line under a chantier (or under the loose tasks): tap to show or hide the finished items. */
function doneLine(key, doneItems, byId, draggable) {
  if (!doneItems.length) return '';
  const open = state.epicDone.has(key), n = doneItems.length;
  return `<button class="ep-done" data-action="epic-done" data-id="${key}" aria-expanded="${open}">${ico('check', 13)} ${n} terminé${n > 1 ? 's' : ''} <span class="ep-chev" aria-hidden="true">${open ? '▴' : '▾'}</span></button>
    ${open ? `<div class="ep-stack ep-stack-done">${doneItems.map((t) => taskRow(t, byId, { draggable })).join('')}</div>` : ''}`;
}

/** BÊTA : un chantier « Plus tard » en vrai carnet fermé : couverture colorée, reliure à spirale, étiquette avec le titre, tranche de pages. */
const BOOK_COVERS = ['--pi-purple', '--pi-blue', '--pi-green', '--pi-pink', '--pi-yellow', '--pi-orange'];
function epicBook(e, openCount, doneCount, draggable) {
  const cv = BOOK_COVERS[e.id % BOOK_COVERS.length];
  return `<button class="ep-book" data-fx="book:${e.id}" style="--cv:var(${cv})" data-action="epic-toggle" data-id="${e.id}" data-drop-epic="${e.id}" ${draggable ? 'data-drag="epic" draggable="true"' : ''} aria-expanded="false" aria-label="Ouvrir le carnet ${esc(e.title)}">
    <span class="ep-spiral" aria-hidden="true"></span>
    <span class="ep-book-tag">Plus tard</span>
    <span class="ep-book-label"><span class="ep-book-title">${esc(e.title)}</span><span class="ep-book-count">${openCount ? `${openCount} à faire` : doneCount ? 'tout fait' : 'vide'}</span></span>
    <span class="ep-chev" aria-hidden="true">▾</span>
  </button>`;
}

/** A « Plus tard » chantier folded as a closed notepad: spiral + title only, tap to open it. */
function epicClosed(e, openCount, doneCount, draggable) {
  return `<button class="ep-closed hz-${e.horizon}" data-action="epic-toggle" data-id="${e.id}" data-drop-epic="${e.id}" ${draggable ? 'data-drag="epic" draggable="true"' : ''} aria-expanded="false">
    <span class="ep-spiral" aria-hidden="true"></span>
    <span class="ep-closed-title">${esc(e.title)}</span>
    <span class="ep-closed-count">${openCount ? `${openCount} à faire` : doneCount ? 'tout fait' : 'vide'}</span>
    <span class="ep-chev" aria-hidden="true">▾</span>
  </button>`;
}

/** A chantier drawn as a big post-it with its tasks stuck on top of it. */
function epicNote(d, e, items, byId, draggable, dragEpic = false, doneItems = [], foldable = false) {
  const pr = epicProgress(d, e.id);
  const doneOpen = state.epicDone.has(e.id);
  return `<article class="ep-sheet hz-${e.horizon}" ${isBeta() && e.horizon === 'later' ? `data-fx="book:${e.id}"` : ''} ${state.boardGroup === 'epic' ? `data-drop-epic="${e.id}"` : ''} data-id="${e.id}" ${draggable && dragEpic ? 'data-drag="epic" draggable="true"' : ''}>
    <span class="ep-spiral" aria-hidden="true"></span>
    <header class="ep-head">
      <button class="ep-title" data-action="open-epic" data-id="${e.id}"><h4>${esc(e.title)}</h4><span class="hz ${e.horizon}">${HORIZON[e.horizon]}</span></button>
      <span class="ep-count num">${pr.done}/${pr.total}</span>
      ${foldable ? `<button class="ep-fold" data-action="epic-toggle" data-id="${e.id}" aria-label="Replier ${esc(e.title)}">▴</button>` : ''}
      <button class="btn sm primary ep-add" data-action="new-item" data-epic="${e.id}" aria-label="Ajouter dans ${esc(e.title)}">+</button>
    </header>
    <div class="progress ep-bar"><i style="width:${pr.pct}%"></i></div>
    <div class="ep-stack">${items.map((t) => taskRow(t, byId, { draggable })).join('')}</div>
    ${doneLine(e.id, doneItems, byId, draggable)}
  </article>`;
}

/** Items of one board column, grouped by chantier (chantiers in roadmap order, loose items last). */
function boardGroups(d, list) {
  const groups = [...d.epics].sort(sortEpics).map((e) => [e, list.filter((t) => t.epicId === e.id)]).filter(([, l]) => l.length);
  const loose = list.filter((t) => !d.epics.some((e) => e.id === t.epicId));
  if (loose.length) groups.push([null, loose]);
  return groups;
}

function viewBoard(d) {
  const byId = Object.fromEntries(d.members.map((m) => [m.id, m]));
  const draggable = matchMedia('(pointer: fine)').matches;
  const byEpic = !isBeta() && state.boardGroup === 'epic';
  const group = (list) => boardGroups(d, list).map(([e, items]) => (e ? epicNote(d, e, items, byId, draggable)
    : items.map((t) => taskRow(t, byId, { draggable })).join(''))).join(''); // tâches sans chantier : directement dans la liste, à côté des chantiers (pas de séparation)
  if (byEpic) {
    const mine = d.tasks.filter(matchesFilter).sort(sortItems);
    // la tâche qu'on vient de cocher reste en place le temps de l'animation, puis passe dans « terminées »
    const isFini = (t) => (t.id === state.justUndone ? true : t.status === 'done' && t.id !== state.justDone);
    const open = mine.filter((t) => !isFini(t)), fini = mine.filter(isFini);
    // chantiers rangés par moment ; un filtre ne garde que les chantiers qui ont des éléments correspondants
    const bucket = (h) => d.epics.filter((e) => e.horizon === h).sort(sortEpics)
      .map((e) => [e, open.filter((t) => t.epicId === e.id), fini.filter((t) => t.epicId === e.id)])
      .filter(([, l, f]) => state.taskFilter === 'all' || l.length || f.length);
    const isLoose = (t) => !d.epics.some((e) => e.id === t.epicId);
    const loose = open.filter(isLoose), looseDone = fini.filter(isLoose);
    const finished = bucket('done');
    const note = ([e, l, f]) => epicNote(d, e, l, byId, draggable, true, f);
    // « Plus tard » : calepins fermés (titre seulement), on les ouvre au toucher
    const laterItem = ([e, l, f]) => (state.epicOpen.has(e.id) ? epicNote(d, e, l, byId, draggable, true, f, true) : epicClosed(e, l.length, f.length, draggable));
    return `
  ${quickAdd('Ajouter une tâche rapide…')}
  <div class="columns rm" style="--n:2">
    ${['now', 'later'].map((h) => { const list = bucket(h); return `
      <section class="col shown" data-drop-horizon="${h}" aria-label="${HORIZON[h]}">
        <div class="col-head"><h3><span class="dot" style="--c:var(--h-${h})"></span>${HORIZON[h]}</h3><span class="muted num small">${list.length}</span></div>
        ${list.map(h === 'later' ? laterItem : note).join('') || `<p class="col-empty">${h === 'now' ? 'Rien en cours. Glisse un chantier ici, ou change son moment.' : 'Aucun chantier.'}</p>`}
      </section>`; }).join('')}
  </div>
  ${loose.length || looseDone.length ? `<section class="ep-loose-wrap">
    <div class="col-head"><h3>Sans chantier</h3><span class="muted num small">${loose.length}</span></div>
    <p class="small muted ep-loose-hint">Pas dans un chantier : glisse-les sur un chantier pour les ranger.</p>
    <div class="ep-loose" data-drop-epic="0">${loose.map((t) => taskRow(t, byId, { draggable })).join('')}${doneLine(0, looseDone, byId, draggable)}</div>
  </section>` : ''}
  ${finished.length ? `<details class="done-epics"><summary>${finished.length} chantier${finished.length > 1 ? 's' : ''} terminé${finished.length > 1 ? 's' : ''}</summary><div class="ep-grid">${finished.map(note).join('')}</div></details>` : ''}`;
  }
  // la tâche qu'on vient de cocher reste à sa place (« à faire ») le temps de l'animation, puis passe dans « Terminées »
  const colOf = (t) => (t.id === state.justDone ? 'todo' : t.id === state.justUndone ? 'done' : t.status);
  const laterIds = new Set(d.epics.filter((e) => e.horizon === 'later').map((e) => e.id));
  const parked = d.tasks.filter((t) => laterIds.has(t.epicId) && matchesFilter(t));
  const beta = isBeta(); // BÊTA : les chantiers « Plus tard » sont des carnets fermés dans la liste (plus de lien « Afficher les tâches rangées »)
  const visible = (t) => (beta ? !laterIds.has(t.epicId) : state.showLater || !laterIds.has(t.epicId));
  const books = beta ? d.epics.filter((e) => e.horizon === 'later').sort(sortEpics)
    .map((e) => [e, d.tasks.filter((t) => t.epicId === e.id && t.status !== 'done' && matchesFilter(t)).sort(sortItems), d.tasks.filter((t) => t.epicId === e.id && t.status === 'done' && matchesFilter(t)).sort(sortItems)])
    .filter(([, l, f]) => state.taskFilter === 'all' || l.length || f.length)
    .map(([e, l, f]) => (state.epicOpen.has(e.id) ? epicNote(d, e, l, byId, draggable, false, f, true) : epicBook(e, l.length, f.length, draggable))).join('') : '';
  const pick = (s) => d.tasks.filter((t) => colOf(t) === s && matchesFilter(t) && visible(t)).sort(sortItems);
  const todoList = pick('todo'), doneList = pick('done');
  return `
  ${quickAdd('Ajouter une tâche rapide…')}
  <div class="columns one">
    <section class="col shown" aria-label="${TASK.todo}">
      <div class="col-head"><h3><span class="dot" style="--c:${TASK_COLOR.todo}"></span>${TASK.todo}</h3><span class="muted num small">${todoList.length}</span></div>
      ${group(todoList) || (books ? '' : '<p class="col-empty">Rien à faire pour le moment.</p>')}${books}
    </section>
  </div>
  ${doneList.length ? `<section class="done-box">
    <button class="done-head" data-action="toggle-done" aria-expanded="${state.showDone}"><span>${TASK.done}es · ${doneList.length}</span><span class="chev" aria-hidden="true">${state.showDone ? '▴' : '▾'}</span></button>
    ${state.showDone ? `<div class="done-list">${group(doneList)}</div>` : ''}
  </section>` : ''}
  ${parked.length && !beta ? `<button class="link-btn" data-action="toggle-later">${state.showLater ? 'Masquer' : 'Afficher'} les ${parked.length} tâche${parked.length > 1 ? 's' : ''} rangée${parked.length > 1 ? 's' : ''} dans des chantiers « Plus tard »</button>` : ''}`;
}

const segField = (name, options, value, label, cls = '') => `
  <div class="field"><span>${label}</span>
    <div class="seg ${cls ? 'wrap' : ''}" style="margin:0" data-seg="${name}">${Object.entries(options).map(([k, l]) => `<button type="button" class="${cls ? `${cls} ${cls}-${k}` : ''}" data-action="pick-seg" data-v="${k}" aria-pressed="${k === value}">${l}</button>`).join('')}</div>
    <input type="hidden" name="${name}" value="${value}"></div>`;

/** Create or edit an item (tâche, bug, amélioration). */
// ---------- images des tâches ----------
const IMG_MAX = 8;
const sheetImg = { pid: null, taskId: null, items: [], queue: Promise.resolve() }; // images de la fiche d'une tâche
const compImg = { pid: null, taskId: null, items: [], queue: Promise.resolve() }; // BÊTA : images de la ligne d'ajout (gardées jusqu'au bouton « Ajouter »)
let imgState = sheetImg; // celle des deux qu'on est en train de remplir

/** Shrinks a picture in the browser: a 1600 px JPEG (2 MB at most, no hidden location data) and a small thumbnail. */
async function prepareImage(file) {
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { throw new Error('Cette image ne peut pas être lue.'); }
  const draw = (max, q) => new Promise((resolve, reject) => {
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Cette image ne peut pas être lue.'))), 'image/jpeg', q);
  });
  let full = await draw(1600, 0.82);
  for (let q = 0.7; full.size > 1.9 * 1024 * 1024 && q > 0.3; q -= 0.15) full = await draw(1600, q);
  const thumb = await draw(360, 0.75);
  bmp.close?.();
  return { full, thumb };
}

function renderImageGrid() {
  const box = imgState === compImg ? document.querySelector('#task-images') : sheet.querySelector('#tf-images');
  if (!box) return;
  box.innerHTML = imgGridHtml(imgState);
}
function imgGridHtml(S) {
  return S.items.map((it, i) => `<div class="img-th">
      <button type="button" class="img-open" data-action="img-open" data-i="${i}" aria-label="Agrandir l'image">${it.thumb ? `<img src="${esc(it.thumb)}" alt="">` : '<span class="img-wait"></span>'}</button>
      <button type="button" class="img-del" data-action="img-del" data-i="${i}" aria-label="Retirer l'image">${ico('x', 14)}</button></div>`).join('')
    + (S.items.length < IMG_MAX ? `<button type="button" class="img-add" data-action="img-pick" title="Ajouter une image (ou colle-la dans le texte)" aria-label="Ajouter une image">${ico('image', 20)}<span aria-hidden="true">+</span></button><input type="file" accept="image/*" multiple hidden data-img-input>` : '');
}

function initTaskImages(t, isNew) {
  imgState = sheetImg;
  imgState.pid = state.pid; imgState.taskId = isNew ? null : t.id; imgState.queue = Promise.resolve();
  imgState.items = (t.images || []).map((i) => ({ id: i.id, path: i.path, thumb: '' }));
  renderImageGrid();
  const saved = imgState.items.filter((i) => i.path);
  if (saved.length) {
    db.signImages(saved.map((i) => i.path)).then((urls) => { for (const i of saved) i.thumb = urls[i.path] || ''; renderImageGrid(); }).catch(() => {});
  }
  return () => { for (const i of imgState.items) { if (i.blobs) { URL.revokeObjectURL(i.thumb); URL.revokeObjectURL(i.full); } } imgState.items = []; imgState.taskId = null; imgState = compImg; };
}

/** Adds pictures (pasted, dropped or picked): prepared one by one, sent at once for an existing task, kept until "Ajouter" for a new one. */
function addImageFiles(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/'));
  if (!list.length) return;
  const room = IMG_MAX - imgState.items.length;
  if (list.length > room) toast(`${IMG_MAX} images au plus par tâche.`, true);
  for (const f of list.slice(0, Math.max(0, room))) {
    const item = { thumb: '' }; imgState.items.push(item);
    imgState.queue = imgState.queue.then(async () => {
      try {
        const blobs = await prepareImage(f);
        item.blobs = blobs; item.thumb = URL.createObjectURL(blobs.thumb); item.full = URL.createObjectURL(blobs.full);
        if (imgState.taskId) { const row = await db.addTaskImage(imgState.pid, imgState.taskId, blobs); item.id = row.id; item.path = row.path; item.blobs = null; }
      } catch (e) { const k = imgState.items.indexOf(item); if (k >= 0) imgState.items.splice(k, 1); toast(e.message, true); }
      renderImageGrid();
    });
  }
  renderImageGrid();
}

/** Full-size viewer (a dialog of its own, so it sits above the open sheet). */
async function openLightbox(index) {
  const items = imgState.items.filter((i) => i.thumb || i.path); let k = items.findIndex((i) => i === imgState.items[index]); if (k < 0) k = 0;
  const dlg = document.createElement('dialog'); dlg.className = 'lightbox';
  dlg.innerHTML = `<button type="button" class="lb-close" aria-label="Fermer">${ico('x', 22)}</button>
    <img class="lb-img" alt=""><span class="lb-count"></span>
    ${items.length > 1 ? '<button type="button" class="lb-nav prev" aria-label="Précédente">‹</button><button type="button" class="lb-nav next" aria-label="Suivante">›</button>' : ''}`;
  document.body.append(dlg); dlg.showModal();
  const img = dlg.querySelector('.lb-img');
  const show = async () => {
    const it = items[k]; dlg.querySelector('.lb-count').textContent = items.length > 1 ? `${k + 1} / ${items.length}` : '';
    img.src = it.thumb || ''; // the small one first, then the big one
    try { const url = it.full || (it.path ? (await db.signImages([it.path], false))[it.path] : ''); if (url && items[k] === it) img.src = url; } catch { /* keep the thumbnail */ }
  };
  const go = (d) => { k = (k + d + items.length) % items.length; show(); };
  dlg.addEventListener('click', (e) => { if (e.target.closest('.lb-close') || e.target === dlg || e.target === img) dlg.close(); else if (e.target.closest('.prev')) go(-1); else if (e.target.closest('.next')) go(1); });
  dlg.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' && items.length > 1) go(-1); if (e.key === 'ArrowRight' && items.length > 1) go(1); });
  dlg.addEventListener('close', () => dlg.remove());
  show();
}

// pasted pictures (a screenshot has no text) and dropped files, while a task sheet is open
document.addEventListener('paste', (e) => {
  const ctx = sheet.open && sheet.querySelector('#tf-images') ? sheetImg : !sheet.open && isBeta() && document.activeElement?.closest?.('.composer') ? compImg : null;
  if (!ctx) return;
  const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
  if (!files.length || (e.clipboardData.getData('text/plain') || '').trim()) return;
  e.preventDefault(); imgState = ctx; addImageFiles(files);
});
sheet.addEventListener('dragover', (e) => { if (sheet.querySelector('#tf-images') && [...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault(); });
sheet.addEventListener('drop', (e) => { if (!sheet.querySelector('#tf-images') || !e.dataTransfer?.files?.length) return; e.preventDefault(); addImageFiles(e.dataTransfer.files); });
sheet.addEventListener('change', (e) => { if (e.target.matches('[data-img-input]')) { imgState = sheetImg; addImageFiles(e.target.files); e.target.value = ''; } });
// BÊTA : mêmes gestes (image choisie, glissée, collée) dans la ligne d'ajout
document.addEventListener('change', (e) => { if (e.target.matches?.('[data-img-input]') && e.target.closest('.composer')) { imgState = compImg; addImageFiles(e.target.files); e.target.value = ''; } });
document.addEventListener('dragover', (e) => { if (e.target.closest?.('.composer') && [...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault(); });
document.addEventListener('drop', (e) => { if (!e.target.closest?.('.composer') || !e.dataTransfer?.files?.length) return; e.preventDefault(); imgState = compImg; addImageFiles(e.dataTransfer.files); });

function taskSheet(t) {
  const d = state.data;
  const isNew = !t.id;
  t = { title: '', description: '', status: 'todo', type: 'task', priority: 'normal', epicId: null, assigneeId: isNew ? state.me.id : null, ...t };
  openSheet(`
    <form class="stack" data-form="${isNew ? 'new-task' : 'edit-task'}" data-id="${t.id || ''}">
      <div class="sheet-head"><h2 id="sheet-title">${isNew ? NEW_TITLE[t.type] : TYPES[t.type]}</h2><button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">${ico('x')}</button></div>
      ${segField('type', Object.fromEntries(TYPE_LIST.map((k) => [k, typeLabel(k)])), t.type, 'Type', 'type-opt')}
      <label class="field"><span>Titre</span><input class="input" id="tf-title" name="title" maxlength="200" required value="${esc(t.title)}" placeholder="${t.type === 'bug' ? 'ex. Crash quand on ouvre la carte' : 'ex. Écran de connexion'}" autofocus></label>
      <div class="field"><span>Description <small class="muted">(facultatif)</small></span>
        <div class="desc-box"><textarea class="input" id="tf-desc" name="description" maxlength="5000" aria-label="Description" placeholder="${t.type === 'bug' ? 'Comment le reproduire, sur quel appareil…' : 'Détails, étapes, liens…'}">${esc(t.description)}</textarea><div class="img-strip" id="tf-images"></div></div>
        ${MD_HINT.replace('</small>', ' · image : colle-la ou touche l\'icône</small>')}<div class="md-preview description" hidden></div></div>
      ${segField('status', TASK, t.status, 'Statut')}
      ${segField('priority', PRIORITY, t.priority, 'Priorité')}
      <label class="field"><span>Chantier</span><select class="input" id="tf-epic" name="epicId"><option value="">Hors chantier</option>
        ${[...d.epics].sort(sortEpics).map((e) => `<option value="${e.id}" ${e.id === t.epicId ? 'selected' : ''}>${esc(e.title)}${e.horizon === 'done' ? ' (terminé)' : ''}</option>`).join('')}</select></label>
      <label class="field"><span>Assignée à</span><select class="input" id="tf-assignee" name="assigneeId"><option value="">Personne</option>
        ${d.members.map((m) => `<option value="${m.id}" ${m.id === t.assigneeId ? 'selected' : ''}>${esc(m.displayName)}</option>`).join('')}</select></label>
      ${isNew ? '' : `<p class="small muted">Créée ${timeAgo(t.createdAt)}${t.doneAt ? ` · terminée ${timeAgo(t.doneAt)}` : ''}</p>`}
      <div class="row ${isNew ? 'end' : 'between'}">${isNew ? '' : `<button type="button" class="btn danger" data-action="delete-task" data-id="${t.id}">Supprimer</button>`}<button class="btn primary" type="submit">${isNew ? 'Ajouter' : 'Enregistrer'}</button></div>
    </form>`, () => initTaskImages(t, isNew));
}

/** Create or edit a grand chantier. */
function epicSheet(e) {
  const d = state.data;
  const isNew = !e.id;
  e = { title: '', description: '', horizon: 'now', ...e };
  const byId = Object.fromEntries(d.members.map((m) => [m.id, m]));
  const items = isNew ? [] : d.tasks.filter((t) => t.epicId === e.id).sort(sortItems);
  openSheet(`
    <form class="stack" data-form="${isNew ? 'new-epic' : 'edit-epic'}" data-id="${e.id || ''}">
      <div class="sheet-head"><h2 id="sheet-title">${isNew ? 'Nouveau chantier' : 'Chantier'}</h2><button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">${ico('x')}</button></div>
      <label class="field"><span>Titre</span><input class="input" id="ef-title" name="title" maxlength="200" required value="${esc(e.title)}" placeholder="ex. Mode hors-ligne" autofocus></label>
      <label class="field"><span>Description</span><textarea class="input" id="ef-desc" name="description" maxlength="5000" style="min-height:130px" placeholder="L'idée, pourquoi, les grandes étapes…&#10;- point 1&#10;- point 2">${esc(e.description)}</textarea>${MD_HINT}<div class="md-preview description" hidden></div></label>
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

/** One dashed drop zone at a time (chantier post-it, « hors chantier » or a status column). */
function markEpicDrop(box) {
  $app.querySelectorAll('.drop-epic, .col.drop').forEach((x) => { if (x !== box) x.classList.remove('drop-epic', 'drop'); });
  box?.classList.add('drop-epic');
}

/** Desktop drag and drop: items between status columns, chantiers between horizons. */
function bindTaskDnD() {
  if (!matchMedia('(pointer: fine)').matches) return; // au doigt : voir le glissement par appui long plus bas
  let drag = null;
  $app.querySelectorAll('[data-drag]').forEach((el) => {
    el.addEventListener('dragstart', (e) => { e.stopPropagation(); drag = { kind: el.dataset.drag, id: Number(el.dataset.id) }; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', el.dataset.id); });
    el.addEventListener('dragend', () => { el.classList.remove('dragging'); $app.querySelectorAll('.drop-epic, .col.drop').forEach((x) => x.classList.remove('drop-epic', 'drop')); });
  });
  // une tâche glissée sur un chantier (post-it) s'y range ; sur « hors chantier », elle en sort
  // une seule zone en pointillés à la fois, et jamais sur le chantier où la tâche est déjà
  const same = (box) => { const t = state.data.tasks.find((x) => x.id === drag.id); return !t || (t.epicId ?? null) === (Number(box.dataset.dropEpic) || null); };
  $app.querySelectorAll('[data-drop-epic]').forEach((box) => {
    box.addEventListener('dragover', (e) => {
      if (drag?.kind !== 'task') return;
      e.stopPropagation();
      if (same(box)) { markEpicDrop(null); return; }
      e.preventDefault(); markEpicDrop(box);
    });
    box.addEventListener('dragleave', (e) => { // relatedTarget n'est pas fiable : on regarde si le curseur est sorti du cadre
      const r = box.getBoundingClientRect();
      if (e.clientX <= r.left || e.clientX >= r.right || e.clientY <= r.top || e.clientY >= r.bottom) box.classList.remove('drop-epic');
    });
    box.addEventListener('drop', run(async (e) => {
      e.preventDefault(); e.stopPropagation(); markEpicDrop(null);
      if (drag?.kind !== 'task') return;
      const { id } = drag; drag = null;
      const t = state.data.tasks.find((x) => x.id === id), epicId = Number(box.dataset.dropEpic) || null;
      if (!t || (t.epicId ?? null) === epicId) return;
      await db.updateTask(id, { epicId });
      fx.focus([`task:${id}`]);
      await reloadProject();
    }));
  });
  $app.querySelectorAll('[data-drop-horizon]').forEach((col) => {
    const accepts = 'epic';
    col.addEventListener('dragover', (e) => { if (drag?.kind === accepts) { e.preventDefault(); col.classList.add('drop'); } });
    col.addEventListener('dragleave', () => col.classList.remove('drop'));
    col.addEventListener('drop', run(async (e) => {
      e.preventDefault(); col.classList.remove('drop');
      if (!drag || drag.kind !== accepts) return;
      const { id } = drag; drag = null;
      const ep = state.data.epics.find((x) => x.id === id);
      if (!ep || ep.horizon === col.dataset.dropHorizon) return;
      const maxPos = Math.max(0, ...state.data.epics.map((x) => x.position));
      await db.updateEpic(id, { horizon: col.dataset.dropHorizon, position: maxPos + 1 });
      await reloadProject();
    }));
  });
}

/** Touch: long-press a task, then drag it onto a chantier (or « hors chantier »). One delegated listener set, bound once. */
(() => {
  let g = null; // { id, el, ghost, timer, sx, sy, x, y, box, raf, active, pid }
  let swallowClick = 0;
  const boxAt = () => {
    const hit = document.elementFromPoint(g.x, g.y);
    const t = state.data?.tasks.find((x) => x.id === g.id);
    if (!t) return null;
    const box = hit?.closest('[data-drop-epic]');
    return box && (t.epicId ?? null) !== (Number(box.dataset.dropEpic) || null) ? box : null;
  };
  const frame = () => {
    if (!g?.active) return;
    g.ghost.style.transform = `translate(${g.x - g.ox}px, ${g.y - g.oy}px) rotate(2deg)`;
    if (g.y < 100) scrollBy(0, -14); else if (g.y > innerHeight - 120) scrollBy(0, 14);
    g.box = boxAt(); markEpicDrop(g.box);
    g.raf = requestAnimationFrame(frame);
  };
  const end = (drop) => {
    if (!g) return;
    clearTimeout(g.timer); cancelAnimationFrame(g.raf);
    const { active, box, id, el, ghost } = g; g = null;
    if (!active) return;
    ghost.remove(); el.classList.remove('dragging'); markEpicDrop(null);
    swallowClick = Date.now() + 500;
    state.dragging = false;
    if (drop && box) {
      run(async () => {
        await db.updateTask(id, { epicId: Number(box.dataset.dropEpic) || null });
        fx.focus([`task:${id}`]); await reloadProject();
      })();
    }
  };
  const begin = () => {
    const r = g.el.getBoundingClientRect();
    g.active = true; state.dragging = true; g.ox = g.x - r.left; g.oy = g.y - r.top;
    const ghost = g.el.cloneNode(true); ghost.classList.add('dnd-ghost'); ghost.removeAttribute('data-action');
    ghost.style.cssText = `position:fixed;left:0;top:0;width:${r.width}px;margin:0;z-index:99999;pointer-events:none;`;
    document.body.append(ghost); g.ghost = ghost; g.el.classList.add('dragging');
    navigator.vibrate?.(15);
    frame();
  };
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || !e.isPrimary || state.tab !== 'taches') return;
    const el = e.target.closest?.('.task[data-drag="task"]');
    if (!el || e.target.closest('.check') || !$app.contains(el)) return;
    end(false);
    g = { id: Number(el.dataset.id), el, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, active: false, timer: setTimeout(() => g && begin(), 380) };
  });
  document.addEventListener('pointermove', (e) => {
    if (!g || !e.isPrimary) return;
    g.x = e.clientX; g.y = e.clientY;
    if (!g.active && Math.hypot(g.x - g.sx, g.y - g.sy) > 10) { clearTimeout(g.timer); g = null; } // c'est un défilement
  });
  document.addEventListener('pointerup', (e) => { if (g && e.isPrimary) end(true); });
  document.addEventListener('pointercancel', () => end(false));
  document.addEventListener('touchmove', (e) => { if (g?.active) e.preventDefault(); }, { passive: false });
  document.addEventListener('contextmenu', (e) => { if (g || e.target.closest?.('.task[data-drag]')) { if (matchMedia('(pointer: coarse)').matches) e.preventDefault(); } });
  document.addEventListener('click', (e) => { if (Date.now() < swallowClick) { e.stopPropagation(); e.preventDefault(); } }, true);
})();

// ---------- grille des post-it au doigt : appui long = on attrape le post-it, la corbeille monte du bas ----------
(() => {
  let g = null, swallow = 0, bin = null;
  const getBin = () => {
    if (!bin) { bin = document.createElement('div'); bin.className = 'hold-bin'; bin.setAttribute('aria-hidden', 'true'); bin.innerHTML = fx.binHtml('hg'); document.body.append(bin); }
    return bin;
  };
  const over = (x, y) => { const r = getBin().getBoundingClientRect(); return x >= r.left - 24 && x <= r.right + 24 && y >= r.top - 40; };
  const frame = () => {
    if (!g?.active) return;
    g.ghost.style.transform = `translate(${g.x - g.ox}px, ${g.y - g.oy}px) rotate(3deg)`;
    if (g.y < 100) scrollBy(0, -12); // en haut ou en bas de l'écran, la page défile
    g.over = over(g.x, g.y); getBin().classList.toggle('over', g.over);
    g.raf = requestAnimationFrame(frame);
  };
  const begin = () => {
    const r = g.el.getBoundingClientRect();
    g.active = true; state.dragging = true; g.ox = g.x - r.left; g.oy = g.y - r.top;
    const ghost = g.el.cloneNode(true); ghost.classList.remove('just-added'); ghost.classList.add('dnd-ghost', 'fx-copy'); ['data-action', 'data-id', 'data-note', 'tabindex'].forEach((k) => ghost.removeAttribute(k));
    // transition coupée et position posée AVANT l'ajout : sinon le fantôme glisse depuis le coin en haut à gauche (`.note` a une transition sur transform)
    ghost.style.cssText = `position:fixed;left:0;top:0;width:${r.width}px;margin:0;z-index:99999;pointer-events:none;transition:none;animation:none;transform:translate(${r.left}px, ${r.top}px) rotate(3deg);`;
    document.body.append(ghost); g.ghost = ghost; g.el.classList.add('held');
    getBin().classList.add('armed');
    navigator.vibrate?.(15);
    frame();
  };
  const end = (drop) => {
    if (!g) return;
    clearTimeout(g.timer); cancelAnimationFrame(g.raf);
    const { active, over: isOver, id, el, ghost } = g, gr = el.getBoundingClientRect(), from = { left: g.x - g.ox, top: g.y - g.oy, width: gr.width, height: gr.height };
    g = null;
    if (!active) return;
    swallow = Date.now() + 500;
    el.classList.remove('held'); state.dragging = false;
    if (drop && isOver) {
      // le post-it est lâché dans la corbeille : l'animation joue à la place de la vraie, qu'on cache le temps du jet
      const b = getBin(), place = b.getBoundingClientRect();
      ghost.remove(); b.style.visibility = 'hidden';
      run(async () => {
        try { await removeWith('trash', el, () => db.deleteNote(id), null, { place, from }); }
        finally { fx.resetBin(b); fx.focus(noteKeys()); await reloadProject(); }
      })();
    } else { ghost.remove(); getBin().classList.remove('armed', 'over'); }
  };
  document.addEventListener('pointerdown', (e) => {
    const mouse = e.pointerType === 'mouse';
    if (!e.isPrimary || state.tab !== 'idees' || (mouse && e.button !== 0)) return;
    const el = e.target.closest?.('.note-grid .note');
    if (!el || e.target.closest('.vote') || !$app.contains(el)) return;
    end(false);
    // doigt : appui long (380 ms) ; souris : on attrape dès qu'on tire de quelques pixels (pas de défilement à protéger)
    g = { id: Number(el.dataset.note), el, mouse, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, active: false, timer: mouse ? 0 : setTimeout(() => g && begin(), 380) };
  });
  document.addEventListener('pointermove', (e) => {
    if (!g || !e.isPrimary) return;
    g.x = e.clientX; g.y = e.clientY;
    if (!g.active && g.mouse) { if (Math.hypot(g.x - g.sx, g.y - g.sy) > 6) { getSelection()?.removeAllRanges(); begin(); } return; }
    if (!g.active && Math.hypot(g.x - g.sx, g.y - g.sy) > 10) { clearTimeout(g.timer); g = null; } // c'est un défilement
  });
  document.addEventListener('pointerup', (e) => { if (g && e.isPrimary) end(true); });
  document.addEventListener('pointercancel', () => end(false));
  document.addEventListener('touchmove', (e) => { if (g?.active) e.preventDefault(); }, { passive: false });
  document.addEventListener('contextmenu', (e) => { if (g || e.target.closest?.('.note-grid .note')) { if (matchMedia('(pointer: coarse)').matches) e.preventDefault(); } });
  document.addEventListener('click', (e) => { if (Date.now() < swallow) { e.stopPropagation(); e.preventDefault(); } }, true);
})();

// ---------- notes ----------

function noteSheet(n) {
  const isNew = !n.id;
  openSheet(`
    <form class="stack" data-form="${isNew ? 'new-note' : 'edit-note'}" data-id="${n.id || ''}">
      <div class="sheet-head"><h2 id="sheet-title">${isNew ? 'Nouveau post-it' : 'Post-it'}</h2><button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">${ico('x')}</button></div>
      <div class="sheet-note c-${n.color}" id="nf-paper"><textarea id="nf-text" name="text" maxlength="1000" placeholder="Une idée, un bug, une envie…" autofocus>${esc(n.text)}</textarea></div>
      ${MD_HINT}
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
  try {
    if (on) history.pushState({ wallfs: 1 }, '');
    else if (history.state?.wallfs) history.back();
  } catch { /* page sans historique (aperçu isolé) */ }
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
  const ignore = (t) => t.closest('.wall-bar, .wall-top, .minimap, .wall-bin, .vote');

  // corbeille du mur : un post-it lâché dessus est jeté
  const bin = wrap.querySelector('.wall-bin');
  const overBin = (cx, cy) => { if (!bin) return false; const r = bin.getBoundingClientRect(); return cx >= r.left - 24 && cx <= r.right + 24 && cy >= r.top - 40 && cy <= r.bottom + 40; };
  const binOff = () => { bin?.classList.remove('armed', 'over'); wrap.classList.remove('holding'); };
  async function throwAway(d) {
    d.el.classList.remove('dragging');
    const at = bin?.getBoundingClientRect(); // la vraie corbeille du mur reçoit le post-it : on cache l'originale pendant que l'animation joue à sa place
    if (bin) bin.style.visibility = 'hidden';
    try { await removeWith('trash', d.el, () => db.deleteNote(d.id), null, at ? { place: at } : undefined); }
    finally { if (bin) fx.resetBin(bin); binOff(); await reloadProject(); }
  }
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
    d.el.classList.remove('dragging'); binOff();
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
      bin?.classList.add('armed'); wrap.classList.add('holding'); bin?.classList.toggle('over', overBin(e.clientX, e.clientY));
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
    const thrown = e.type === 'pointerup' && overBin(e.clientX, e.clientY);
    if (thrown) { await throwAway(d); return; }
    if (!drags.size) binOff();
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

// ---------- accès pour Claude ----------
const copyText = async (text) => {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* old browser: select the field instead */ }
  const el = sheet.querySelector('#claude-url'); if (el) { el.select(); try { return document.execCommand('copy'); } catch { return false; } }
  return false;
};

async function renderClaudeBox() {
  const box = sheet.querySelector('#claude-box');
  if (!box) return;
  try {
    const rows = await db.listClaudeAccess();
    box.innerHTML = rows.length ? rows.map((r) => {
      const dead = r.expires_at && new Date(r.expires_at) < new Date();
      return `<div class="passkey">${ico('spark', 18)}<div class="grow"><strong>${esc(r.label || 'Accès sans nom')}</strong>
        <span class="small muted">${r.can_write ? 'Lecture et modification' : 'Lecture seule'}${dead ? ' · expiré' : ''} · créé ${timeAgo(r.created_at)}${r.last_used_at ? ` · utilisé ${timeAgo(r.last_used_at)}` : ' · jamais utilisé'}</span></div>
        <button class="btn sm ghost" data-action="claude-revoke" data-id="${r.id}" aria-label="Révoquer cet accès">Révoquer</button></div>`;
    }).join('') : '<p class="small muted">Aucun accès pour le moment.</p>';
  } catch (e) { box.innerHTML = `<p class="small muted">${esc(e.message)}</p>`; }
}

function claudeNewSheet() {
  openSheet(`
    <form class="stack" data-form="claude-new">
      <div class="sheet-head"><h2 id="sheet-title">Nouvel accès pour Claude</h2><button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">${ico('x')}</button></div>
      <label class="field"><span>Nom <small class="muted">(pour t'y retrouver)</small></span><input class="input" name="label" maxlength="60" placeholder="ex. Claude.ai, Claude Code" autocomplete="off"></label>
      ${segField('rights', { write: 'Lecture et modification', read: 'Lecture seule' }, 'write', 'Ce que Claude peut faire')}
      <p class="small muted">Dans les deux cas, Claude n'a que tes droits (tes projets) et ne peut rien supprimer. À chaque nouvelle conversation, Claude te demande sur quel projet travailler, puis reste sur celui-là uniquement. « Modification » = créer et changer des tâches, des post-it et des chantiers.</p>
      <div class="row end"><button class="btn primary" type="submit">Créer l'accès</button></div>
    </form>`);
}

function claudeTokenSheet({ url }) {
  openSheet(`
    <div class="stack">
      <div class="sheet-head"><h2 id="sheet-title">Accès créé</h2><button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">${ico('x')}</button></div>
      <p class="small"><b>Copie cette adresse maintenant : elle ne sera plus affichée.</b> C'est comme un mot de passe : ne la partage pas. Si tu la perds ou si elle fuite, révoque l'accès dans <b>Mon compte</b> et crées-en un autre.</p>
      <label class="field"><span>Adresse du connecteur</span><input class="input" id="claude-url" readonly value="${esc(url)}" onfocus="this.select()"></label>
      <button class="btn primary" data-action="claude-copy" data-text="${esc(url)}">Copier l'adresse</button>
      <h3>Dans Claude (claude.ai ou l'app)</h3>
      <ol class="small steps"><li>Ouvre <b>Réglages → Connecteurs</b>.</li><li>Touche <b>Ajouter un connecteur personnalisé</b>.</li><li>Nom : « Tool Proj ». Adresse : colle celle de ci-dessus.</li><li><b>Authentification : laisse « Aucune connexion »</b> (la clé est déjà dans l'adresse). Ne touche pas aux en-têtes de requête : laisse-les vides.</li><li>Valide avec <b>Ajouter</b>. Le message « toute personne disposant de l'URL peut utiliser ce connecteur » est normal : c'est pour ça que l'adresse doit rester secrète.</li><li>Dans une conversation, active le connecteur, puis demande par exemple « Quelles sont mes tâches en cours ? ».</li></ol>
      <h3>Dans Claude Code</h3>
      <p class="small muted">Colle cette commande dans ton terminal :</p>
      <input class="input" readonly value="${esc(`claude mcp add --transport http tool-proj ${url}`)}" onfocus="this.select()">
    </div>`);
}

// ---------- notifications (Web Push) ----------
const VAPID_PUBLIC_KEY = 'BIDS_jwrwZ0j4mzNnl7ihtI7kMiEfg8lZo0-3Ux2JyIEpm4zKLdiDFzRuOnI3Wej2FtGaM-Kr88vyK2KiV3fcAQ';
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const b64ToBytes = (b64) => Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
async function thisDeviceSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** The "Notifications" block of the account sheet: shows what is possible on this device and the right button. */
async function renderPushBox() {
  const box = sheet.querySelector('#push-box');
  if (!box) return;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!pushSupported()) {
    box.innerHTML = `<p class="small muted">${ios && !standalone ? 'Sur iPhone, installe d\'abord l\'app : <b>Partager</b> puis <b>Sur l\'écran d\'accueil</b>, ouvre-la depuis l\'écran d\'accueil et reviens ici.' : 'Ce navigateur ne sait pas envoyer de notifications.'}</p>`;
    return;
  }
  if (Notification.permission === 'denied') {
    box.innerHTML = '<p class="small muted">Les notifications sont bloquées pour Tool Proj. Autorise-les dans les réglages du téléphone ou du navigateur, puis reviens ici.</p>';
    return;
  }
  let on = false;
  try { const sub = await thisDeviceSubscription(); on = !!sub && Notification.permission === 'granted' && await db.hasPushSubscription(sub.endpoint); } catch { /* offline */ }
  box.innerHTML = on
    ? `<p class="small">Activées sur cet appareil. Tu es prévenu quand une tâche t'est assignée ou quand on t'ajoute à un projet.</p>
       <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-action="push-test">Envoyer un test</button><button class="btn ghost" data-action="push-off">Désactiver</button></div>`
    : `<p class="small muted">Sois prévenu quand une tâche t'est assignée ou quand on t'ajoute à un projet.</p>
       <button class="btn primary" data-action="push-on">Activer sur cet appareil</button>`;
}

// ---------- pop-up "big news" (public/nouveautes.json) ----------
/** After an update, shows once the latest big feature (only that one, never a queue). Entries: version, icon, title, text, button {label, action, target}. */
const NEWS_MAX = 2; // a short run of cards, never a long parade
let newsRun = [];

let faxEl = null, faxBusy = false;
function newsHtml(i) {
  const n = newsRun[i], last = i === newsRun.length - 1;
  return `<div class="stack news-pop">
      <div class="key-badge" aria-hidden="true">${ICON_PATHS[n.icon] ? ico(n.icon, 28) : ico('spark', 28)}</div>
      <span class="cl-pill">Nouveau · version ${esc(n.version)}${newsRun.length > 1 ? ` · ${i + 1}/${newsRun.length}` : ''}</span>
      <h2 id="fax-title">${esc(n.title)}</h2>
      <p>${esc(n.text)}</p>
      <div class="row end">${last ? (n.button ? '<button class="btn ghost" data-action="close">Plus tard</button>' : '') : `<button class="btn ghost" data-action="news-next" data-i="${i + 1}">Suivant</button>`}${last && !n.button ? '<button class="btn primary" data-action="close">Compris !</button>' : ''}${n.button ? `<button class="btn primary" data-action="news-go" data-go="${esc(n.button.action)}" data-target="${esc(n.button.target || '')}">${esc(n.button.label)}</button>` : ''}</div>
    </div>`;
}
/** Les nouveautés arrivent par fax : la machine tombe du haut et imprime la feuille. */
async function showNews(i) {
  if (faxBusy) return;
  faxBusy = true;
  try {
    if (!faxEl) {
      faxEl = document.createElement('div');
      faxEl.className = 'fax-ov'; faxEl.setAttribute('role', 'dialog'); faxEl.setAttribute('aria-modal', 'true'); faxEl.setAttribute('aria-labelledby', 'fax-title'); faxEl.tabIndex = -1;
      faxEl.innerHTML = `<div class="fax-bd"></div><div class="fax-m"><div class="fax-top"><i class="fax-led"></i></div><div class="fax-body"><i><s></s><s></s><s></s></i></div><div class="fax-slot"></div></div><div class="fax-out"><div class="fax-paper">${newsHtml(i)}</div></div>`;
      faxEl.dataset.at = String(Date.now());
      document.body.append(faxEl); bindActions(faxEl);
      faxEl.addEventListener('click', (e) => { if (e.target === faxEl || e.target.classList.contains('fax-bd')) { if (Date.now() - Number(faxEl.dataset.at) > 600) closeFax(); } });
      const ov = faxEl; // on garde l'élément : le fax peut être fermé (Échap) pendant l'impression
      await fx.fax(ov);
      ov.querySelector('.btn.primary')?.focus({ preventScroll: true });
    } else {
      const ov = faxEl;
      await fx.faxLeave(ov);
      if (faxEl !== ov) return;
      ov.querySelector('.fax-paper').innerHTML = newsHtml(i);
      ov.querySelector('.fax-paper').getAnimations().forEach((x) => x.cancel());
      await fx.fax(ov, { again: true });
    }
  } finally { faxBusy = false; }
}
async function closeFax(fast = false) {
  const el = faxEl; if (!el) return;
  faxEl = null;
  if (!fast) await fx.faxLeave(el, true);
  el.remove();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && faxEl) { e.preventDefault(); closeFax(); } });

async function maybeNewsPopup() {
  if (!state.me || !state.me.onboarded || sheet.open || faxEl) return;
  let list = [];
  try {
    const res = await fetch('nouveautes.json', { cache: 'no-cache' });
    if (res.ok) { const text = await res.text(); store.set('newsPopups', text); list = JSON.parse(text); }
  } catch { /* offline */ }
  if (!list.length) { try { list = JSON.parse(store.get('newsPopups', '[]')); } catch { list = []; } }
  let seen = store.get('seenNews2', '0.0.0');
  if (cmpVersion(seen, APP_VERSION) > 0) seen = APP_VERSION; // the version number was lowered: do not hide later pop-ups
  const fresh = list.filter((n) => cmpVersion(n.version, APP_VERSION) <= 0 && cmpVersion(n.version, seen) > 0).sort((a, b) => cmpVersion(a.version, b.version));
  if (!fresh.length || sheet.open || faxEl) return;
  newsRun = fresh.slice(-NEWS_MAX); // the most recent ones, oldest first
  store.set('seenNews2', fresh.at(-1).version);
  showNews(0);
}

// ---------- changelog ("Nouveautés") ----------
const hasNews = () => store.get('seenVersion', '') !== APP_VERSION;

/** public/changelog.md: "## x.y.z" then "- …" lines. Kept offline in localStorage. */
async function loadChangelog() {
  let text = '';
  try {
    const res = await fetch('changelog.md', { cache: 'no-cache' });
    if (res.ok) { text = await res.text(); store.set('changelogText', text); }
  } catch { /* offline */ }
  text ||= store.get('changelogText', '');
  const versions = [];
  for (const line of text.split('\n')) {
    const h = line.match(/^##\s+(\S+)/), b = line.match(/^-\s+(.*)/);
    if (h) versions.push({ v: h[1], items: [] });
    else if (b && versions.length) versions.at(-1).items.push(b[1]);
  }
  return versions;
}
const cmpVersion = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };

function changelogSheet() {
  store.set('seenVersion', APP_VERSION);
  document.querySelectorAll('.news-dot').forEach((d) => d.remove());
  openSheet(`
    <div class="sheet-head"><h2 id="sheet-title">Nouveautés</h2><button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">${ico('x')}</button></div>
    <div id="changelog" class="stack"><p class="muted small">${LOADING}</p></div>`, () => {
    loadChangelog().then((versions) => {
      const box = sheet.querySelector('#changelog');
      if (!box) return;
      box.innerHTML = versions.length ? versions.map((r, i) => `
        <details class="cl-ver" ${i < 2 ? 'open' : ''}>
          <summary><b>Version ${esc(r.v)}</b>${r.v === APP_VERSION ? `<span class="cl-pill">en cours · build ${esc(APP_BUILD)}</span>` : cmpVersion(r.v, APP_VERSION) > 0 ? '<span class="cl-pill soon">à venir</span>' : ''}</summary>
          <ul>${r.items.map((t) => `<li>${md(t)}</li>`).join('')}</ul>
        </details>`).join('') : '<p class="muted small">Impossible de charger l\'historique pour le moment.</p>';
    });
  });
}

const badgeIdentity = (me) => `${avatar(me, 'lg')}<div class="grow"><h2 id="sheet-title">${esc(me.displayName)}</h2><p class="small muted">@${esc(me.username)}</p></div>`;

/** Profile: saved on its own after each change (no « Enregistrer » button). */
let profileTimer = null, profileForm = null;
async function saveProfile(f) {
  clearTimeout(profileTimer); profileTimer = null;
  const b = formData(f);
  if (!b.displayName.trim() || !b.username.trim()) return;
  const status = f.querySelector('#ac-status');
  if (status) status.textContent = 'Enregistrement…';
  try { state.me = await db.updateProfile(state.me.id, b); } catch (e) { if (status) status.textContent = ''; throw e; }
  const row = sheet.querySelector('.my-badge .row'); if (row) row.innerHTML = badgeIdentity(state.me);
  if (status) { status.innerHTML = `${ico('check', 14)} Enregistré`; setTimeout(() => { if (status.isConnected) status.textContent = ''; }, 1800); }
  render();
}
function queueProfileSave(f, delay = 800) {
  profileForm = f; clearTimeout(profileTimer);
  profileTimer = setTimeout(() => saveProfile(f).catch((e) => toast(e.message, true)), delay);
}
sheet.addEventListener('close', () => { if (profileTimer && profileForm?.isConnected !== false) saveProfile(profileForm).catch((e) => toast(e.message, true)); });

function accountSheet() {
  const me = state.me;
  const theme = store.get('theme', 'auto');
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  openSheet(`
    <div class="sheet-head"><div class="my-badge"><span class="badge-role">Mon profil</span>
        <div class="row">${badgeIdentity(me)}</div></div>
      <button type="button" class="btn ghost icon" data-action="close" aria-label="Fermer">${ico('x')}</button></div>
    <button class="news-row" data-action="changelog"><span><b>Nouveautés</b><small>Version ${APP_VERSION} · ce qui a changé</small></span>${hasNews() ? '<span class="cl-pill">Nouveau</span>' : ''}${ico('chev', 18)}</button>
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
      <p class="small muted ac-status" id="ac-status" aria-live="polite">Les changements s'enregistrent tout seuls.</p>
    </form>
    ${db.passkeysSupported() ? `<section class="stack" style="gap:10px">
      <h3>Clés d'accès</h3>
      <p class="small muted">Pour te connecter avec Face ID, ton empreinte ou le code de l'appareil. Crée une clé sur chaque appareil que tu utilises.</p>
      ${passkeysMoved() ? '<p class="small muted"><b>Nouvelle adresse :</b> une clé créée avant le changement d\'adresse ne marche plus. Supprime-la et crée-en une nouvelle.</p>' : ''}
      <div class="passkeys" id="pk-list"><p class="small muted">${LOADING}</p></div>
      <button class="btn" data-action="passkey-add">${icon.key} Ajouter une clé sur cet appareil</button>
    </section>` : ''}
    <section class="stack" style="gap:10px">
      <h3>Notifications</h3>
      <div id="push-box"><p class="small muted">${LOADING}</p></div>
    </section>
    <section class="stack" style="gap:10px">
      <h3>Accès pour Claude</h3>
      <p class="small muted">Branche Claude sur tes projets : il peut lire (et, si tu le permets, ajouter ou modifier) tes tâches, post-it et chantiers, avec tes droits.</p>
      <div class="passkeys" id="claude-box"><p class="small muted">${LOADING}</p></div>
      <button class="btn" data-action="claude-new">Créer un accès</button>
    </section>
    <button class="btn danger" data-action="logout">Se déconnecter</button>
    <p class="small muted" style="text-align:center">Tool Proj · <span data-action="ver-tap">version ${APP_VERSION}</span> <span title="Numéro de mise en ligne">(build ${APP_BUILD})</span>${isBeta() ? '<br><button type="button" class="btn sm" data-action="beta-stable">Revenir à l’app normale</button>' : betaUnlocked() ? '<br><button type="button" class="btn sm" data-action="beta-go">Ouvrir la version bêta</button>' : ''}<br>© 2026 Paname Dev · Codé par Claude<br><a href="confidentialite.html" target="_blank" rel="noopener">Confidentialité</a> · <a href="mailto:contact@panamedev.fr">contact@panamedev.fr</a></p>`, () => { sheet.classList.add('badge-sheet'); /* tout le menu est une carte d'accès */ renderPushBox(); renderClaudeBox(); if (db.passkeysSupported()) loadPasskeys(); });
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
  'ver-tap': () => {
    const now = Date.now(); verTaps = now - verTapAt < 2500 ? verTaps + 1 : 1; verTapAt = now;
    if (verTaps < 7) return;
    verTaps = 0;
    if (isBeta()) { lsSet('tp-beta-ok', null); betaSwitch(false); return; }
    lsSet('tp-beta-ok', betaUnlocked() ? null : '1'); if (!betaUnlocked()) lsSet(MODE_KEY, 'stable');
    toast(betaUnlocked() ? 'Version bêta débloquée' : 'Version bêta masquée'); accountSheet();
  },
  'beta-go': () => betaSwitch(true),
  'beta-stable': () => betaSwitch(false),
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
    quiet('Clé supprimée'); loadPasskeys();
  },
  close: () => (faxEl ? closeFax() : closeSheet()),
  account: accountSheet,
  changelog: changelogSheet,
  filter: (el) => { state.filter = el.dataset.v; renderList(); },
  'new-project': () => projectForm(null),
  'edit-project': () => projectForm(state.data.project),
  'pick-emoji': (el) => { sheet.querySelector('#pf-emoji').value = el.dataset.v; },
  'pick-color': (el) => {
    sheet.querySelector('#pf-color').value = el.dataset.v;
    syncProjectColor();
  },
  'delete-project': async () => {
    const p = state.data.project;
    if (!(await confirmSheet(`Supprimer « ${p.name} » avec ses tâches et ses post-it ? C'est définitif.`))) return;
    closeSheet();
    const chemise = projectCard({ id: p.id, name: p.name, emoji: p.emoji, color: p.color, status: p.status, role: 'admin', progress: 0, description: '', tasks: { total: 0, done: 0 }, noteCount: 0, updatedAt: new Date().toISOString(), members: [] });
    await removeWith('shred', null, () => db.deleteProject(p.id), chemise);
    quiet('Projet supprimé');
    state.data = null; location.hash = '#/';
  },
  'board-group': (el) => { state.boardGroup = el.dataset.v; store.set('boardGroup', el.dataset.v); renderProject(); },
  'goto-roadmap': () => { state.boardGroup = 'epic'; store.set('boardGroup', 'epic'); location.hash = `#/p/${state.pid}/taches`; },
  'task-filter': (el) => { state.taskFilter = el.dataset.v; renderProject(); },
  'toggle-done': () => { state.showDone = !state.showDone; renderProject(); },
  'epic-toggle': (el) => {
    const k = Number(el.dataset.id), opening = !state.epicOpen.has(k);
    opening ? state.epicOpen.add(k) : state.epicOpen.delete(k);
    if (isBeta()) fx.focus([...$app.querySelectorAll('[data-fx]')].map((e) => e.dataset.fx).filter((x) => x !== `book:${k}`)); // les autres carnets et tâches glissent à leur nouvelle place
    renderProject();
    if (isBeta()) (opening ? fx.bookOpen : fx.bookClose)($app.querySelector(opening ? `.ep-sheet[data-id="${k}"]` : `.ep-book[data-id="${k}"]`));
  },
  'toggle-later': () => { state.showLater = !state.showLater; renderProject(); },
  'epic-done': (el) => { const k = Number(el.dataset.id); state.epicDone.has(k) ? state.epicDone.delete(k) : state.epicDone.add(k); renderProject(); },
  'quick-type': (el) => {
    const keys = Object.keys(TYPES); state.quickType = keys[(keys.indexOf(quickType()) + 1) % keys.length];
    store.set('quickType', state.quickType);
    const wide = !!el.classList?.contains('qa-book');
    const input = document.querySelector('#task-new'), had = document.activeElement === input;
    const oldPg = el.querySelector?.('.qa-pg'), oldTc = oldPg ? getComputedStyle(oldPg).getPropertyValue('--tc') : '';
    const oldClone = oldPg?.cloneNode(true);
    document.querySelectorAll('.qa-type').forEach((b) => { b.outerHTML = quickTypeBtn(); });
    document.querySelectorAll('.qa-book').forEach((b) => { b.outerHTML = typeBook(); });
    if (had) input.focus({ preventScroll: true }); // le clavier reste ouvert
    if (!isBeta()) return;
    if (!wide) document.querySelectorAll('.composer .qa-row').forEach((row) => { // petit texte léger qui indique le type choisi, puis disparaît
      row.querySelector('.qa-type-tip')?.remove();
      const t = document.createElement('span'); t.className = 'qa-type-tip'; t.textContent = TYPES[state.quickType]; t.setAttribute('aria-hidden', 'true');
      row.append(t); t.addEventListener('animationend', () => t.remove(), { once: true });
    });
    const nb = document.querySelector(wide ? '.composer .qa-book' : '.composer .qa-type');
    if (nb && oldClone && !matchMedia('(prefers-reduced-motion: reduce)').matches) { // l'ancienne page passe par-dessus le haut du bloc-note et laisse voir la suivante
      oldClone.classList.add('qa-flip'); oldClone.style.setProperty('--tc', oldTc); nb.append(oldClone);
      oldClone.animate([{ transform: 'rotateX(0deg)', filter: 'brightness(1)', opacity: 1 }, { transform: 'rotateX(62deg) scale(1.06)', filter: 'brightness(1.05)', opacity: 1, offset: .55 }, { transform: 'rotateX(118deg) scale(1.1)', filter: 'brightness(.9)', opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.45, .05, .35, 1)' }).finished.then(() => oldClone.remove(), () => oldClone.remove());
    } else nb?.classList.add('pop');
  },
  'composer-more': () => { if (!isMobile()) setComposerOpen(!state.composerOpen); }, // sur téléphone, la poignée est gérée au doigt (toucher / tirer)
  'composer-close': () => setComposerOpen(false),
  'new-item': (el) => {
    if (isBeta() && !sheet.open && document.querySelector('.composer')) { // BÊTA : on ajoute depuis la ligne qui se déploie
      if (el.dataset.epic) { store.set(`${draftKey()}:epic`, el.dataset.epic); const s = document.querySelector('#task-epic'); if (s) s.value = el.dataset.epic; setComposerOpen(true); }
      const box = document.querySelector('.composer'); box.scrollIntoView({ behavior: 'smooth', block: 'center' }); document.querySelector('#task-new').focus({ preventScroll: true }); return;
    }
    if (el.dataset.epic) return taskSheet({ epicId: Number(el.dataset.epic) });
    chooserSheet();
  },
  'new-epic': () => epicSheet({}),
  'manage-links': () => linksSheet(),
  'edit-link': (el) => linksSheet(Number(el.dataset.id)),
  'delete-link': async (el) => {
    await db.deleteLink(Number(el.dataset.id));
    quiet('Lien supprimé'); await reloadProject(); linksSheet();
  },
  'choose-new': (el) => (el.dataset.v === 'epic' ? epicSheet({}) : taskSheet({ type: el.dataset.v, status: 'todo' })),
  'open-epic': (el) => epicSheet(state.data.epics.find((e) => e.id === Number(el.dataset.id))),
  'delete-epic': async (el) => {
    const e = state.data.epics.find((x) => x.id === Number(el.dataset.id));
    const mine = state.data.tasks.filter((t) => t.epicId === e.id);
    const choice = await confirmEpicSheet(e, mine.length);
    if (!choice) return;
    closeSheet();
    const ids = choice.withTasks ? mine.map((t) => t.id) : [];
    await removeWith('shred', $app.querySelector(`.ep-sheet[data-id="${e.id}"], .ep-closed[data-id="${e.id}"], .ep-book[data-id="${e.id}"]`), () => db.deleteEpic(e.id, ids));
    quiet(ids.length ? `Chantier et ${ids.length} tâche${ids.length > 1 ? 's' : ''} supprimés` : 'Chantier supprimé'); await reloadProject();
  },
  'pick-avatar-emoji': (el) => {
    const form = el.closest('form');
    form.elements.avatarEmoji.value = el.dataset.v;
    form.querySelectorAll('.emoji-opt').forEach((b) => b.setAttribute('aria-pressed', b === el));
    refreshAvatarPreview(form); queueProfileSave(form, 250);
  },
  'pick-avatar-color': (el) => {
    const form = el.closest('form');
    form.elements.avatarColor.value = el.dataset.v;
    form.querySelectorAll('[data-action="pick-avatar-color"]').forEach((b) => b.setAttribute('aria-pressed', b === el));
    refreshAvatarPreview(form); queueProfileSave(form, 250);
  },
  'reset-type-colors': (el) => {
    const form = el.closest('form');
    setFormColors(form);
    refreshStylePreview(form); syncTypeColors(form);
  },
  'pick-type-color': (el) => {
    const form = el.closest('form');
    form.elements[`tc_${el.dataset.t}`].value = el.dataset.v;
    refreshStylePreview(form); syncTypeColors(form);
  },
  'toggle-activity': () => { state.activityOpen = !state.activityOpen; store.set('activityOpen', state.activityOpen ? '1' : '0'); renderProject(); },
  'pick-seg': (el) => {
    const seg = el.closest('[data-seg]');
    el.closest('form').elements[seg.dataset.seg].value = el.dataset.v;
    seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === el));
    if (el.closest('.composer') && seg.dataset.seg === 'priority') store.set(`${draftKey()}:prio`, el.dataset.v);
    if (el.closest('.composer') && seg.dataset.seg === 'type') { state.quickType = el.dataset.v; store.set('quickType', state.quickType); document.querySelectorAll('.qa-type').forEach((b) => { b.outerHTML = quickTypeBtn(); }); }
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
    const finishing = t.status !== 'done', from = t.status;
    await db.updateTask(t.id, { status: finishing ? 'done' : 'todo' });
    // la coche se trace au feutre (ou s'efface) une seule fois, la tâche reste en place le temps de l'animation
    state.justDone = finishing ? t.id : null; state.justDoneFrom = from; state.justUndone = finishing ? null : t.id;
    await reloadProject();
    setTimeout(() => { state.justDone = null; state.justUndone = null; if (!state.dragging && !sheet.open) { const fly = finishing ? flyDone(t.id) : null; fx.focus(taskKeys(t.id)); renderProject(); fly?.(); } }, finishing ? 1300 : 900);
  },
  'img-pick': (el) => el.closest('.img-strip').querySelector('[data-img-input]').click(),
  'img-open': (el) => { imgState = el.closest('#task-images') ? compImg : sheetImg; openLightbox(Number(el.dataset.i)); },
  'img-del': async (el) => {
    imgState = el.closest('#task-images') ? compImg : sheetImg;
    const it = imgState.items[Number(el.dataset.i)]; if (!it) return;
    if (it.path) await db.deleteTaskImage({ id: it.id, path: it.path });
    if (it.blobs) { URL.revokeObjectURL(it.thumb); URL.revokeObjectURL(it.full); }
    imgState.items.splice(imgState.items.indexOf(it), 1); renderImageGrid();
  },
  'delete-task': async (el) => {
    const id = Number(el.dataset.id);
    closeSheet();
    await removeWith('trash', $app.querySelector(`.task[data-id="${id}"]`), () => db.deleteTask(id));
    quiet('Supprimé'); await reloadProject();
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
    const id = Number(el.dataset.id);
    closeSheet();
    await removeWith('trash', $app.querySelector(`.note[data-note="${id}"]`), () => db.deleteNote(id));
    quiet('Post-it décollé'); fx.focus(noteKeys()); await reloadProject();
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
  'news-next': (el) => showNews(Number(el.dataset.i)),
  'news-go': (el) => {
    closeFax(true);
    const go = actions[el.dataset.go]; if (!go) return closeSheet();
    go(el);
    const t = el.dataset.target; if (t) setTimeout(() => sheet.querySelector(`#${t}`)?.scrollIntoView({ block: 'center' }), 350);
  },
  'claude-new': () => claudeNewSheet(),
  'claude-copy': async (el) => { toast((await copyText(el.dataset.text)) ? 'Adresse copiée' : 'Touche l\'adresse puis copie-la', false); },
  'claude-revoke': async (el) => {
    const id = Number(el.dataset.id);
    if (!(await confirmSheet('Révoquer cet accès ? Claude ne pourra plus lire ni modifier tes projets avec cette adresse.', 'Révoquer'))) return accountSheet();
    await db.revokeClaudeAccess(id);
    quiet('Accès révoqué'); accountSheet();
  },
  'push-on': async () => {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('Notifications refusées', true); return renderPushBox(); }
    const reg = await navigator.serviceWorker.ready;
    const make = () => reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC_KEY) });
    let sub = (await reg.pushManager.getSubscription()) || await make();
    try { await db.savePushSubscription(state.me.id, sub); }
    catch { // this address already belongs to someone else (shared device): start again with a fresh one
      await sub.unsubscribe(); sub = await make(); await db.savePushSubscription(state.me.id, sub);
    }
    toast('Notifications activées'); renderPushBox();
  },
  'push-off': async () => {
    const sub = await thisDeviceSubscription();
    if (sub) { await db.deletePushSubscription(sub.endpoint); await sub.unsubscribe(); }
    toast('Notifications désactivées'); renderPushBox();
  },
  'push-test': async () => {
    toast((await db.pushTest()) ? 'Test envoyé : la notification arrive dans quelques secondes' : 'Aucun appareil enregistré', false);
  },
  logout: async () => {
    try { const sub = await thisDeviceSubscription(); if (sub) { await db.deletePushSubscription(sub.endpoint); await sub.unsubscribe(); } } catch { /* offline: it will be cleaned on the next failed send */ }
    await db.signOut();
    closeSheet({ navigating: true }); subscribe(null); state.me = null; state.authStep = 'email'; state.projects = []; state.data = null; state.pid = null;
    location.hash = '#/'; render();
  },
};

const forms = {
  async 'claude-new'(f) {
    const b = formData(f);
    claudeTokenSheet(await db.createClaudeAccess(b.label, b.rights !== 'read'));
  },
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
    closeSheet({ navigating: true }); location.hash = `#/p/${id}`;
  },
  async 'edit-project'(f) {
    const body = formData(f);
    // Only the colours that differ from the originals are stored.
    body.typeColors = {};
    for (const t of TYPE_LIST) { const v = (body[`tc_${t}`] || '').toLowerCase(); if (v && v !== TYPE_COLOR_DEFAULTS[t]) body.typeColors[t] = v; }
    TYPE_LIST.forEach((t) => delete body[`tc_${t}`]);
    const cur = state.data.project;
    const same = JSON.stringify(Object.entries(body.typeColors).sort()) === JSON.stringify(Object.entries(cur.typeColors || {}).sort());
    if (same) delete body.typeColors; // saving other settings never depends on the colour column
    await db.updateProject(state.pid, body);
    closeSheet(); quiet('Projet mis à jour'); await reloadProject();
  },
  async 'add-task'(f) {
    if (addingTask) return; // un seul ajout à la fois : on peut retoucher le bouton pendant que ça s'envoie, ça n'ajoute pas de doublon
    const title = f.elements.title.value.trim();
    if (!title) { if (isBeta()) setComposerOpen(true, { focus: true }); return; } // champ vide : le « + » ouvre le menu complet
    addingTask = true; f.classList.add('sending');
    try {
      if (isBeta()) await compImg.queue; // images encore en cours de réduction
      const pending = isBeta() ? compImg.items.filter((i) => i.blobs) : [];
      const extra = isBeta() ? { description: f.elements.description?.value || '', priority: f.elements.priority?.value || 'normal', epicId: f.elements.epicId?.value || null } : {};
      const newId = await db.addTask(state.pid, { title, type: quickType(), assigneeId: state.me.id, status: 'todo', ...extra }, state.data.tasks);
      // la tâche est enregistrée : on vide tout de suite le champ (le reste, images et rechargement, se fait derrière)
      f.elements.title.value = ''; store.set(draftKey(), ''); store.set(`${draftKey()}:desc`, ''); store.set(`${draftKey()}:prio`, 'normal');
      if (pending.length) {
        toast('Envoi des images…');
        for (const it of pending) { try { await db.addTaskImage(state.pid, newId, it.blobs); } catch (e) { toast(e.message, true); } }
      }
      for (const i of compImg.items) { if (i.blobs) { URL.revokeObjectURL(i.thumb); URL.revokeObjectURL(i.full); } } compImg.items = [];
      setComposerOpen(false, { keepFocus: true });
      fx.focus([], { enter: true });
      await reloadProject();
      document.querySelector('#task-new')?.focus();
    } finally { addingTask = false; f.classList.remove('sending'); document.querySelector('.composer.sending, .quick-add.sending')?.classList.remove('sending'); }
  },
  async 'new-task'(f) {
    await imgState.queue; // pictures still being shrunk
    const pending = imgState.items.filter((i) => i.blobs), pid = state.pid;
    const id = await db.addTask(pid, formData(f), state.data.tasks);
    closeSheet(); toast(pending.length ? 'Ajouté, envoi des images…' : 'Ajouté');
    for (const it of pending) { try { await db.addTaskImage(pid, id, it.blobs); } catch (e) { toast(e.message, true); } }
    fx.focus([], { enter: true }); await reloadProject();
  },
  async 'edit-task'(f) {
    const body = formData(f), id = Number(f.dataset.id);
    await db.updateTask(id, body);
    closeSheet(); fx.focus(taskKeys(id));
    const fly = body.status === 'done' ? flyDone(id) : null;
    await reloadProject(); fly?.();
  },
  async 'save-link'(f) {
    const b = formData(f);
    if (f.dataset.id) await db.updateLink(Number(f.dataset.id), b);
    else await db.addLink(state.pid, b, state.data.links);
    (f.dataset.id ? quiet : toast)(f.dataset.id ? 'Lien modifié' : 'Lien ajouté'); await reloadProject(); linksSheet();
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
  async profile(f) { await saveProfile(f); },
};

function bindActions(root) {
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
[$app, sheet].forEach(bindActions);

$app.addEventListener('change', run(async (e) => {
  if (e.target.dataset.change === 'progress') {
    await db.updateProject(state.pid, { manualProgress: e.target.value });
    quiet(`Avancement : ${e.target.value} %`); await reloadProject();
    return;
  }
  const el = e.target.closest('[data-change="role"]');
  if (!el) return;
  try { await db.setRole(state.pid, el.dataset.id, el.value); quiet('Rôle mis à jour'); }
  finally { await reloadProject(); }
}));

// Keep what is typed in the quick-add bar.
document.addEventListener('input', (e) => {
  if (['task-new', 'task-desc'].includes(e.target.id)) { const f = e.target.closest('.composer'); if (f) f.classList.toggle('has-draft', !!(f.elements.title.value || f.elements.description.value)); }
  if (e.target.id === 'task-new') store.set(draftKey(), e.target.value);
  else if (e.target.id === 'task-desc') store.set(`${draftKey()}:desc`, e.target.value);
  else if (e.target.id === 'task-epic') store.set(`${draftKey()}:epic`, e.target.value);
  else if (e.target.id === 'task-prio') store.set(`${draftKey()}:prio`, e.target.value);
});

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
// Elle ne se cache que si le clavier est vraiment ouvert : sur Android, fermer le clavier (retour) laisse le champ actif, et la barre restait cachée.
// Hauteur de référence (sans clavier) : la page peut se redimensionner avec le clavier (innerHeight rétrécit aussi), on compare donc à la plus grande hauteur vue hors saisie.
let baseH = Math.max(window.innerHeight, window.visualViewport?.height || 0);
const noteBaseH = () => { if (!document.activeElement?.matches?.('input, textarea, select')) baseH = Math.max(window.innerHeight, window.visualViewport?.height || 0); };
window.addEventListener('resize', noteBaseH); window.addEventListener('orientationchange', () => setTimeout(noteBaseH, 300));
const kbdOpen = () => { const vv = window.visualViewport; return !vv || baseH - vv.height > 120; };
const syncKbd = () => document.body.classList.toggle('kbd', !!document.activeElement?.matches?.(TYPING) && !document.activeElement.closest('dialog') && kbdOpen());
document.addEventListener('focusin', () => setTimeout(syncKbd, 60)); // le temps que le clavier s'ouvre
document.addEventListener('focusout', () => setTimeout(syncKbd, 80));
window.visualViewport?.addEventListener('resize', syncKbd);
// Keep bottom sheets above the keyboard (iOS keeps the layout the same size and covers the bottom).
if (window.visualViewport) {
  const sync = () => {
    const vv = window.visualViewport;
    const root = document.documentElement.style;
    root.setProperty('--vvh', `${Math.round(vv.height)}px`);
    root.setProperty('--vvt', `${Math.round(vv.offsetTop)}px`);
    root.setProperty('--kb', `${Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))}px`);
  };
  window.visualViewport.addEventListener('resize', sync);
  window.visualViewport.addEventListener('scroll', sync);
  window.addEventListener('scroll', sync, { passive: true });
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
  try { if (location.href.endsWith('#')) history.replaceState(null, '', location.pathname + location.search); } catch { /* idem */ }
  render();
  if (state.me && !state.me.onboarded) welcomeSheet();
  else if (state.me && passkeysMoved() && store.get('passkeysMoved', '') !== '1') {
    store.set('passkeysMoved', '1');
    setTimeout(passkeyMovedSheet, 700);
  } else setTimeout(maybeNewsPopup, 1500);
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
  $app.innerHTML = `<div class="loading">${LOADING}</div>`;
  // Signing in from another tab (email link) or signing out elsewhere updates this tab too.
  db.onAuth(run(async (event) => {
    if (event === 'SIGNED_OUT' && state.me) { state.me = null; subscribe(null); render(); }
    if (event === 'SIGNED_IN' && !state.me) { state.me = await db.currentUser(); if (state.me) signedIn(); }
  }));
  try { state.me = await db.currentUser(); } catch (e) { state.me = null; toast(e.message, true); }
  if (db.urlAuthError && !state.me) state.authError = db.urlAuthError;
  if (state.me) signedIn(); else render();
})();

// Text areas: "- " becomes "• "; Enter continues "• ", "* " and "1. " lines; Enter on an empty item ends the list.
document.addEventListener('beforeinput', (e) => {
  const ta = e.target;
  if (ta.tagName !== 'TEXTAREA' || ta.selectionStart !== ta.selectionEnd) return;
  const pos = ta.selectionStart, start = ta.value.lastIndexOf('\n', pos - 1) + 1;
  const line = ta.value.slice(start, pos);
  if (e.inputType === 'insertText' && e.data === ' ') {
    const d = line.match(/^(\s*)-$/);
    if (!d) return;
    e.preventDefault();
    ta.setRangeText('• ', start + d[1].length, pos, 'end');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  if (e.inputType !== 'insertLineBreak' && e.inputType !== 'insertParagraph') return;
  const m = line.match(/^(\s*)([-*•]|\d+[.)])\s+(.*)$/);
  if (!m) return;
  e.preventDefault();
  const [, indent, mark, rest] = m;
  if (!rest.trim()) { // empty item: remove the marker and end the list
    ta.setRangeText('', start, pos, 'end');
  } else {
    const next = /\d/.test(mark) ? `${parseInt(mark, 10) + 1}${mark.slice(-1)}` : mark === '-' ? '•' : mark;
    ta.setRangeText(`\n${indent}${next} `, pos, pos, 'end');
  }
  ta.dispatchEvent(new Event('input', { bubbles: true }));
});
