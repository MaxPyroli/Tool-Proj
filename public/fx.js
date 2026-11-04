// Animations « bureau » : les éléments glissent vers leur nouvelle place, se collent quand ils arrivent,
// partent à la corbeille (tâche, post-it) ou à la déchiqueteuse (chantier, projet).
// Tout est facultatif : si une animation ne peut pas se jouer, l'app marche pareil (et rien ne bouge avec « réduire les animations »).

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const done = (anim) => anim.finished.catch(() => {});
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- déplacement et pose ----------

/** Positions des éléments marqués data-fx, à prendre juste avant de redessiner l'écran. */
export function snapshot() {
  const m = new Map();
  document.querySelectorAll('[data-fx]').forEach((el) => { const r = el.getBoundingClientRect(); m.set(el.dataset.fx, { x: r.left, y: r.top }); });
  return m;
}

/** À appeler juste avant un redessin voulu par une action (déplacer, ranger, créer) : seuls les éléments cités bougent ;
 *  `enter` fait aussi se coller les nouvelles tâches. Sans appel, rien ne s'anime (mises à jour en direct, filtres…). */
let want = null;
export function focus(keys = [], { enter = false } = {}) { want = { keys: new Set(keys), enter, t: Date.now() }; }

/** Juste après le redessin : les éléments cités glissent vers leur place, les nouvelles tâches se collent. */
export function play(prev) {
  const w = want; want = null;
  if (!w || Date.now() - w.t > 5000 || !prev || !prev.size || reduced()) return;
  const moved = [], fresh = [];
  document.querySelectorAll('[data-fx]').forEach((el) => {
    const key = el.dataset.fx, was = prev.get(key);
    if (!was) { if (w.enter && key.startsWith('task:')) fresh.push(el); return; }
    if (!w.keys.has(key)) return;
    const r = el.getBoundingClientRect(), dx = was.x - r.left, dy = was.y - r.top;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved.push([el, dx, dy]);
  });
  const opts = { composite: 'add' };
  moved.forEach(([el, dx, dy]) => el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], { ...opts, duration: 650, easing: 'cubic-bezier(.3, .9, .35, 1)' }));
  if (fresh.length <= 4) {
    fresh.forEach((el) => el.animate([
      { transform: 'translateY(-18px) scale(1.06) rotate(-2deg)', opacity: 0 },
      { opacity: 1, offset: .35 },
      { transform: 'translateY(0) scale(1) rotate(0deg)', opacity: 1 },
    ], { ...opts, duration: 700, easing: 'cubic-bezier(.3, 1.2, .5, 1)' }));
  }
}

/** Une tâche (ou autre) qui arrive : elle se colle avec un petit rebond. */
export function enter(el) {
  if (!el || reduced()) return;
  el.animate([
    { transform: 'translateY(-18px) scale(1.06) rotate(-2deg)', opacity: 0 },
    { opacity: 1, offset: .35 },
    { transform: 'translateY(0) scale(1) rotate(0deg)', opacity: 1 },
  ], { composite: 'add', duration: 700, easing: 'cubic-bezier(.3, 1.2, .5, 1)' });
}

/** Déplace `el` dans un autre conteneur en le faisant glisser de son ancienne place à la nouvelle. */
export function move(el, parent) {
  const a = el.getBoundingClientRect();
  parent.append(el);
  if (reduced()) return;
  const b = el.getBoundingClientRect();
  el.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` }, { transform: 'translate(0, 0)' }], { composite: 'add', duration: 650, easing: 'cubic-bezier(.3, .9, .35, 1)' });
}

export const animationsOff = reduced;

// ---------- couche des effets ----------

let layer = null;
const getLayer = () => {
  if (!layer?.isConnected) { layer = document.createElement('div'); layer.className = 'fx-layer'; document.body.append(layer); }
  return layer;
};
const ghost = (el, rect, position = 'fixed') => {
  const c = el.cloneNode(true);
  c.classList.add('fx-clone'); c.classList.remove('just-added'); // l'animation « post-it tout juste collé » écraserait sa position
  c.removeAttribute('data-fx'); c.removeAttribute('data-action'); c.removeAttribute('draggable');
  Object.assign(c.style, { position, left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', transform: 'none', rotate: 'none', translate: 'none', animation: 'none', zIndex: '2', visibility: 'visible' });
  return c;
};
const rnd = (a, b) => a + Math.random() * (b - a);

/** Petits bouts de papier qui giclent d'un point (x, y) puis retombent. */
function bits(x, y, { n = 9, power = 90, up = 70, colors = ['#fffdf6', '#f3e9c9', '#e8dcb5'], life = 700 } = {}) {
  const L = getLayer();
  for (let i = 0; i < n; i++) {
    const b = document.createElement('i'); b.className = 'fx-bit';
    Object.assign(b.style, { left: `${x}px`, top: `${y}px`, width: `${rnd(5, 9)}px`, height: `${rnd(3, 5)}px`, background: colors[i % colors.length] });
    L.append(b);
    const dx = rnd(-power, power), peak = -rnd(up * .5, up), fall = rnd(30, 70), rot = rnd(-260, 260);
    b.animate([
      { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * .6}px, ${peak}px) rotate(${rot * .5}deg)`, opacity: 1, offset: .4 },
      { transform: `translate(${dx}px, ${fall}px) rotate(${rot}deg)`, opacity: 0 },
    ], { duration: life, delay: rnd(0, 90), easing: 'cubic-bezier(.3, .6, .6, 1)', fill: 'forwards' }).finished.then(() => b.remove(), () => b.remove());
  }
}

// ---------- corbeille (tâches, post-it) : une corbeille à papier de bureau en métal grillagé ----------

// le corps suit la perspective : le haut est l'arc avant du bord (au-dessus, on voit l'intérieur sombre), le bas est un arc arrondi qui répond à celui du bord
const MESH_BODY = 'M13 34A47 10 0 0 0 107 34L98 134A38 9 0 0 1 22 134Z';
/** Contour irrégulier d'une boulette de papier : n points autour de (cx, cy), rayon et angle un peu au hasard. */
const blobPts = (cx, cy, r, n = 12) => Array.from({ length: n }, (_, i) => {
  const a = (i / n) * Math.PI * 2 + rnd(-.18, .18), k = rnd(.68, 1.04) * (i % 3 === 0 ? .9 : 1);
  return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * rnd(.88, 1.04)];
});
const svgBall = (cx, cy, r) => {
  const pts = blobPts(cx, cy, r, 11), d = `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
  const cr = Array.from({ length: 3 }, () => `M${(cx + rnd(-r, r) * .7).toFixed(1)} ${(cy + rnd(-r, r) * .7).toFixed(1)}l${rnd(-r, r).toFixed(1)} ${rnd(-r, r).toFixed(1)}`).join('');
  return `<path d="${d}" fill="${Math.random() < .5 ? '#fffdf6' : '#f4ecd0'}" stroke="#cfc4a0" stroke-width="1.4" stroke-linejoin="round"/><path d="${cr}" stroke="#cfc4a0" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
};
const binBack = () => `<svg viewBox="0 0 120 150" aria-hidden="true">
  <ellipse cx="60" cy="146" rx="46" ry="4.5" fill="rgba(0,0,0,.2)"/>
  <ellipse cx="60" cy="34" rx="47" ry="10" fill="#262c38"/>
  <path d="M13 34A47 10 0 0 1 107 34" stroke="#4a5365" stroke-width="5" fill="none" stroke-linecap="round"/>
  <g>${svgBall(41, 123, 10)}${svgBall(75, 122, 11)}${svgBall(58, 112, 9.5)}</g>
</svg>`;
const BIN_FRONT = `<svg viewBox="0 0 120 150" aria-hidden="true">
  <defs>
    <pattern id="fxm" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0H10M0 0V10" stroke="#566174" stroke-width="1.7" fill="none"/></pattern>
    <clipPath id="fxc"><path d="M18.6 38.7A47 10 0 0 0 101.4 38.7L94.3 134A34.3 9 0 0 1 25.7 134Z"/></clipPath>
  </defs>
  <path d="${MESH_BODY}" fill="rgba(150,165,185,.14)"/>
  <rect x="0" y="30" width="120" height="116" fill="url(#fxm)" clip-path="url(#fxc)"/>
  <path d="M19 39L26 138M40 43L43 142M60 44V143M80 43L77 142M101 39L94 138" stroke="#3b4352" stroke-width="3" stroke-linecap="round" fill="none"/>
  <path d="M22 134A38 9 0 0 0 98 134" stroke="#3b4352" stroke-width="7" fill="none" stroke-linecap="round"/>
  <path d="M13 34A47 10 0 0 0 107 34" stroke="#3b4352" stroke-width="7" fill="none" stroke-linecap="round"/>
</svg>`;

const CREASES = 'conic-gradient(from 20deg at 50% 50%, rgba(0,0,0,.16) 0 7deg, transparent 7deg 32deg, rgba(255,255,255,.22) 32deg 38deg, transparent 38deg 72deg, rgba(0,0,0,.16) 72deg 80deg, transparent 80deg 124deg, rgba(255,255,255,.2) 124deg 130deg, transparent 130deg 196deg, rgba(0,0,0,.16) 196deg 204deg, transparent 204deg 252deg, rgba(255,255,255,.2) 252deg 258deg, transparent 258deg)';

/** Remet la corbeille « du mur / de la grille » tout en bas, sans animation, puis la rend visible : sinon, après le jet, on la voit redescendre une seconde fois. */
export function resetBin(b) {
  b.style.transition = 'none';
  b.classList.remove('armed', 'over');
  void b.offsetHeight;
  b.style.visibility = '';
  b.style.transition = '';
}

/** Le dessin de la corbeille (fond + devant), à placer dans un conteneur de 128 × 160 ; `uid` rend les identifiants uniques. */
export const binHtml = (uid = 'fxb') => (binBack() + BIN_FRONT).replaceAll('fxm', `${uid}m`).replaceAll('fxc', `${uid}c`);

/** Le papier se froisse en boule, est lancé en arc, puis tombe dans la corbeille grillagée (on le voit tomber à travers le grillage). */
export async function trash(el, { place = null, from = null } = {}) {
  if (!el || reduced()) return;
  const L = getLayer();
  const bin = document.createElement('div'); bin.className = 'fx-bin';
  bin.innerHTML = binBack();
  bin.insertAdjacentHTML('beforeend', BIN_FRONT);
  L.append(bin);
  // `place` : la corbeille du mur est déjà là (rectangle donné) : la nôtre se met exactement à sa place, sans remonter
  if (place) Object.assign(bin.style, { left: `${place.left}px`, top: `${place.top}px`, bottom: 'auto', margin: '0', width: `${place.width}px`, height: `${place.height}px` });
  const rise = place ? null : bin.animate([{ transform: 'translateY(190px)', opacity: 0 }, { transform: 'translateY(-14px)', opacity: 1, offset: .68 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.3, .7, .4, 1)', fill: 'forwards' });
  const r = from || el.getBoundingClientRect(); // `from` : là où le papier a été lâché (sinon là où il se trouve)
  const paper = getComputedStyle(el).backgroundColor, clone = ghost(el, r);
  const crease = document.createElement('i'); crease.className = 'fx-creases';
  crease.style.background = Array.from({ length: 6 }, () => `linear-gradient(${rnd(0, 180).toFixed(0)}deg, transparent 47%, rgba(0,0,0,.2) 48.5%, rgba(255,255,255,.35) 51%, transparent 52.5%) ${rnd(-30, 30).toFixed(0)}% ${rnd(-30, 30).toFixed(0)}% / ${rnd(70, 130).toFixed(0)}% ${rnd(70, 130).toFixed(0)}% no-repeat`).join(', ');
  clone.append(crease);
  L.append(clone); el.style.visibility = 'hidden';
  if (rise) await done(rise);
  const w = r.width, h = r.height, cx = w / 2, cy = h / 2, N = 16;
  // contour de départ : le rectangle (16 points) ; contour d'arrivée : une boulette irrégulière (16 points)
  const per = N / 4, rect = [];
  for (let i = 0; i < per; i++) rect.push([w * i / per, 0]);
  for (let i = 0; i < per; i++) rect.push([w, h * i / per]);
  for (let i = 0; i < per; i++) rect.push([w * (1 - i / per), h]);
  for (let i = 0; i < per; i++) rect.push([0, h * (1 - i / per)]);
  const poly = (pts) => `polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(', ')})`;
  const Rb = Math.min(w, h) * .5;
  const wad = poly(blobPts(cx, cy, Rb, N)), wad2 = poly(blobPts(cx, cy, Rb * .92, N));
  // 1. le papier se froisse sur place (le rectangle se referme en boule irrégulière)
  crease.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, fill: 'forwards' });
  await done(clone.animate([
    { transform: 'none', clipPath: poly(rect), filter: 'none' },
    { transform: 'scale(.9, 1.06) rotate(-4deg)', clipPath: poly(rect.map(([x, y]) => [cx + (x - cx) * .8, cy + (y - cy) * .8])), offset: .35 },
    { transform: 'scale(.62) rotate(-14deg)', clipPath: wad, filter: 'brightness(.93)' },
  ], { duration: 520, easing: 'cubic-bezier(.4, 0, .3, 1)', fill: 'forwards' }));
  // 2. la même boule est mise dans la corbeille (derrière le grillage) puis lancée en arc jusqu'à l'ouverture et tombe sans s'arrêter ni changer d'aspect
  const bR = bin.getBoundingClientRect();
  const sStart = .62, startState = `scale(${sStart}) rotate(-14deg)`;
  Object.assign(clone.style, { position: 'absolute', left: `${r.left - bR.left}px`, top: `${r.top - bR.top}px`, zIndex: '3' });
  bin.insertBefore(clone, bin.querySelector('svg:last-of-type'));
  const mouthX = bin.offsetWidth * .5, topY = -18; // coordonnées dans la corbeille
  const tx = mouthX - (r.left - bR.left + cx), ty = topY - (r.top - bR.top + cy);
  const lift = Math.min(170, Math.abs(ty) * .35 + 60);
  const D = 34, sEnd = Math.min(sStart, Math.max(.1, D / (2 * Rb)));
  const bh = bin.offsetHeight, fall = bh * .68, dx = rnd(-10, 10);
  await done(clone.animate([
    { transform: startState, clipPath: wad, easing: 'cubic-bezier(.3, .6, .5, 1)' },
    { transform: `translate(${tx * .5}px, ${ty * .5 - lift}px) scale(${(sStart + sEnd) / 2}) rotate(-170deg)`, clipPath: wad2, offset: .5, easing: 'cubic-bezier(.5, 0, .85, .6)' },
    { transform: `translate(${tx}px, ${ty}px) scale(${sEnd}) rotate(-300deg)`, clipPath: wad },
  ], { duration: 560, easing: 'linear', fill: 'forwards' }));
  clone.style.zIndex = '0'; // elle est à l'ouverture : elle passe maintenant derrière le bord avant et le grillage
  const at = (x, y, rot) => `translate(${tx + x}px, ${ty + y}px) scale(${sEnd}) rotate(${rot}deg)`;
  const drop = done(clone.animate([
    { transform: at(0, 0, -300), easing: 'cubic-bezier(.2, .5, .7, .75)' },
    { transform: at(dx * .5, fall, -180), offset: .5, easing: 'ease-out' },
    { transform: at(dx * .7, fall - 20, -140), offset: .66, easing: 'ease-in' },
    { transform: at(dx, fall, -110), offset: .8, easing: 'ease-out' },
    { transform: at(dx, fall - 6, -104), offset: .9, easing: 'ease-in' },
    { transform: at(dx, fall, -100) },
  ], { duration: 900, easing: 'linear', fill: 'forwards' }));
  await pause(430);
  bin.animate([{ transform: 'scale(1, 1)' }, { transform: 'scale(1.04, .95)', offset: .3 }, { transform: 'scale(.99, 1.02)', offset: .65 }, { transform: 'scale(1, 1)' }], { duration: 420, easing: 'ease-out' });
  bits(bin.offsetLeft + mouthX + dx, bin.offsetTop + bh * .2, { n: 3, power: 30, up: 30, life: 520 }); // quelques éclats au bord
  await drop;
  await pause(500);
  await done(bin.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(190px)', opacity: 0 }], { duration: 380, easing: 'ease-in', fill: 'forwards' }));
  bin.remove();
}

// ---------- changement d'écran, feuilles, badges ----------

const TAB_ORDER = ['apercu', 'taches', 'idees', 'equipe'];

/** Un écran remplace l'autre : changement d'onglet (la page glisse du côté de l'onglet), ouverture d'un projet (la page monte), retour à la liste. */
export function view(prevKey, key) {
  if (reduced() || !prevKey || prevKey === key) return;
  const parse = (k) => { const m = /^p(\d+)\/(\w+)/.exec(k); return m ? { id: m[1], tab: m[2] } : null; };
  const a = parse(prevKey), b = parse(key);
  const page = document.querySelector('main.page'); if (!page) return;
  const o = { fill: 'none' };
  const root = document.documentElement; root.style.overflowX = 'hidden'; setTimeout(() => { root.style.overflowX = ''; }, 500); // la page qui glisse ne doit jamais élargir l'écran
  if (a && b && a.id === b.id) {
    if (a.tab === b.tab) return;
    const dir = TAB_ORDER.indexOf(b.tab) > TAB_ORDER.indexOf(a.tab) ? 1 : -1;
    page.animate([{ transform: `translateX(${dir * 22}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { ...o, duration: 240, easing: 'cubic-bezier(.2, .8, .3, 1)' });
    // l'onglet s'étend vers le haut sans se déformer (le contenu garde sa forme) : on révèle sa partie haute, le bas reste collé au bandeau ; la zone révélée déborde de 16 px pour ne jamais couper l'ombre
    document.querySelector('.tab[aria-current]')?.animate([{ clipPath: 'inset(18px -16px -16px -16px)' }, { clipPath: 'inset(-16px -16px -16px -16px)' }], { ...o, duration: 380, easing: 'cubic-bezier(.2, .9, .3, 1.2)' });
  } else if (b && !a) {
    page.animate([{ transform: 'translateY(26px) scale(.985)', opacity: 0 }, { transform: 'none', opacity: 1 }], { ...o, duration: 340, easing: 'cubic-bezier(.2, .9, .3, 1)' });
  } else if (a && !b) {
    page.animate([{ transform: 'translateY(-10px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { ...o, duration: 220, easing: 'ease-out' });
  } else return;
  sway(page.querySelectorAll('.member'));
}

/** Les badges accrochés se balancent une fois, l'un après l'autre. */
export function sway(list, max = 8) {
  if (reduced()) return;
  [...list].slice(0, max).forEach((el, i) => el.animate([{ rotate: '0deg', easing: 'ease-out' }, { rotate: '3deg', offset: .2, easing: 'ease-in-out' }, { rotate: '-2deg', offset: .55, easing: 'ease-in-out' }, { rotate: '0deg' }], { delay: i * 30, duration: 750, easing: 'linear' }));
}

/** Une feuille se pose (ordinateur ; sur téléphone elle monte déjà du bas) ou se retire. */
export function sheetIn(body) {
  if (reduced() || !body || matchMedia('(max-width: 719px)').matches) return;
  body.animate([{ transform: 'translateY(-22px) rotate(-1.2deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2, .9, .3, 1.15)' });
}
export async function sheetOut(body) {
  if (reduced() || !body) return;
  await done(body.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(14px)', opacity: 0 }], { duration: 150, easing: 'ease-in', fill: 'forwards' }));
}

/** Une tâche terminée s'envole vers la section « Terminées » (en bas de la liste) : elle rétrécit en arc, puis la section fait un petit bond.
 *  `target` = fonction qui rend l'élément visé (il est redessiné entre-temps) ; s'il est hors de l'écran, la tâche part vers le bord de l'écran. */
export async function flyTo(el, target, from = null) {
  if (reduced() || !el) return;
  const t0 = target(); if (!t0) return;
  const L = getLayer(), r = from || el.getBoundingClientRect(), tr = t0.getBoundingClientRect();
  const clone = ghost(el, r);
  L.append(clone); el.style.visibility = 'hidden';
  const tx = Math.min(Math.max(tr.left + tr.width / 2, 20), innerWidth - 20), ty = Math.min(Math.max(tr.top + tr.height / 2, 20), innerHeight - 20);
  const dx = tx - (r.left + r.width / 2), dy = ty - (r.top + r.height / 2);
  await done(clone.animate([
    { transform: 'none', opacity: 1 },
    { transform: `translate(${dx * .25}px, ${dy * .25 - 16}px) scale(.88) rotate(-2deg)`, opacity: 1, offset: .3, easing: 'ease-in' },
    { transform: `translate(${dx}px, ${dy}px) scale(.14) rotate(6deg)`, opacity: .3 },
  ], { duration: 560, easing: 'ease-in-out', fill: 'forwards' }));
  clone.remove();
  target()?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)', offset: .4 }, { transform: 'scale(1)' }], { duration: 340, easing: 'ease-out' });
}

// ---------- tampon (petits messages) et fax (nouveautés) ----------

/** Un petit message est tamponné : le tampon (même taille que l'empreinte) arrive en rétrécissant, s'abat dessus, appuie, puis se relève
 *  et laisse l'encre. `el` contient `.st-ink` (l'empreinte) et `.st-tool` (le tampon vu de haut). Rend la main quand le tampon est reparti. */
export async function stamp(el) {
  const ink = el.querySelector('.st-ink'), tool = el.querySelector('.st-tool');
  if (!ink) return;
  if (reduced() || !tool) { ink.style.opacity = 1; tool?.remove(); return; }
  const R = 'rotate(-4deg)';
  await done(tool.animate([{ transform: `translateY(-70px) ${R} scale(1.5)`, opacity: 0 }, { transform: `translateY(-20px) ${R} scale(1.15)`, opacity: 1, offset: .65 }, { transform: `translateY(-10px) ${R} scale(1.08)`, opacity: 1 }], { duration: 520, easing: 'ease-out', fill: 'forwards' }));
  await pause(100);
  await done(tool.animate([{ transform: `translateY(-10px) ${R} scale(1.08)` }, { transform: `translateY(0) ${R} scale(1)` }], { duration: 150, easing: 'cubic-bezier(.6, 0, 1, 1)', fill: 'forwards' }));
  ink.style.opacity = 1; // l'encre est déposée sous le tampon, qui la cache encore
  tool.animate([{ transform: `${R} scale(1)` }, { transform: `${R} scale(.985)` }], { duration: 240, fill: 'forwards' });
  await pause(250);
  ink.animate([{ transform: `${R} scale(1.04)`, opacity: .55 }, { transform: `${R} scale(1)`, opacity: 1 }], { duration: 380, easing: 'ease-out', fill: 'forwards' });
  await done(tool.animate([{ transform: `${R} scale(.985)`, opacity: 1 }, { transform: `translateY(-26px) ${R} scale(1.15)`, opacity: 1, offset: .4 }, { transform: `translateY(-100px) ${R} scale(1.6)`, opacity: 0 }], { duration: 520, easing: 'ease-in', fill: 'forwards' }));
  tool.remove();
}

/** Fax : la machine tombe du haut, tremble, puis la feuille sort de la fente par saccades. `again` = juste la feuille (page suivante). */
export async function fax(ov, { again = false } = {}) {
  const m = ov.querySelector('.fax-m'), out = ov.querySelector('.fax-out'), paper = ov.querySelector('.fax-paper'), bd = ov.querySelector('.fax-bd'), led = ov.querySelector('.fax-led');
  if (reduced()) { out.style.overflow = 'visible'; return; }
  const h = paper.offsetHeight;
  out.style.height = `${h + 14}px`; out.style.overflow = 'hidden';
  paper.animate([{ transform: 'translateY(-100%)' }, { transform: 'translateY(-100%)' }], { duration: 1, fill: 'forwards' });
  if (!again) {
    bd.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: 'forwards' });
    await done(m.animate([{ transform: 'translateY(-90px)', opacity: 0 }, { transform: 'translateY(6px)', opacity: 1, offset: .7 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'ease-out', fill: 'forwards' }));
  }
  m.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(2px)' }, { transform: 'translateX(0)' }], { duration: 240, iterations: 3 });
  led?.classList.add('on'); await pause(300);
  const steps = Math.max(10, Math.min(22, Math.round(h / 14)));
  await done(paper.animate([{ transform: 'translateY(-100%)' }, { transform: 'translateY(0)' }], { duration: 900 + steps * 45, easing: `steps(${steps}, end)`, fill: 'forwards' }));
  led?.classList.remove('on');
  out.style.overflow = 'visible';
  await done(paper.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(6px) rotate(-1.2deg)' }], { duration: 280, easing: 'cubic-bezier(.3, 1.4, .5, 1)', fill: 'forwards' }));
}

/** La feuille tombe (changement de page ou fermeture) ; `all` : la machine remonte aussi et le fond s'efface. */
export async function faxLeave(ov, all = false) {
  const m = ov.querySelector('.fax-m'), paper = ov.querySelector('.fax-paper'), bd = ov.querySelector('.fax-bd');
  if (reduced()) return;
  const jobs = [done(paper.animate([{ opacity: 1 }, { transform: 'translateY(50px) rotate(4deg)', opacity: 0 }].map((k, i) => (i ? k : { ...k, transform: getComputedStyle(paper).transform })), { duration: 280, easing: 'ease-in', fill: 'forwards' }))];
  if (all) { jobs.push(done(m.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-90px)', opacity: 0 }], { duration: 300, easing: 'ease-in', fill: 'forwards' }))); jobs.push(done(bd.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }))); }
  await Promise.all(jobs);
}

// ---------- déchiqueteuse (chantier, projet) ----------

/** Le grand morceau de papier est avalé par la déchiqueteuse et ressort en bandelettes qui s'entassent dans le bac. `html` sert quand rien n'est à l'écran. */
export async function shred(el, html) {
  if (reduced()) return;
  const L = getLayer();
  let temp = null, src = el;
  if (!src && html) {
    temp = document.createElement('div'); temp.className = 'fx-temp'; temp.innerHTML = html; L.append(temp); src = temp.firstElementChild;
  }
  if (!src) return;
  const W = Math.min(340, innerWidth - 24);
  const machine = document.createElement('div'); machine.className = 'fx-shredder'; machine.style.setProperty('--w', `${W}px`);
  machine.innerHTML = `<div class="sh-head"><i class="sh-top"></i><i class="sh-slot"></i><span class="sh-vents"></span><i class="sh-led"></i><span class="sh-label">à déchiqueter</span></div>
    <div class="sh-box"><i class="sh-window"></i><i class="sh-tape"></i><span class="sh-note">à recycler</span></div>`;
  L.append(machine);
  const rise = machine.animate([{ transform: 'translateY(300px)', opacity: 0 }, { transform: 'translateY(-16px)', opacity: 1, offset: .7 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.3, .7, .4, 1)', fill: 'forwards' });
  const r = src.getBoundingClientRect();
  const s = Math.min(1, (W - 80) / r.width, 190 / r.height);
  const cw = r.width * s, ch = r.height * s;
  const clone = ghost(src, r);
  L.append(clone);
  if (el) el.style.visibility = 'hidden'; else temp.style.visibility = 'hidden';
  await done(rise);
  const head = machine.querySelector('.sh-head'), win = machine.querySelector('.sh-window');
  const mr = machine.getBoundingClientRect(), mx = mr.left, my = mr.top;
  const cardX = mx + (W - cw) / 2, slotY = my + 34;
  // 1. le papier vient se poser au-dessus de la fente
  const aboveY = slotY - ch - 14;
  clone.style.transformOrigin = '0 0';
  await done(clone.animate([{ transform: 'none' }, { transform: `translate(${cardX - r.left}px, ${aboveY - r.top - 14}px) scale(${s}) rotate(-2deg)`, offset: .75 }, { transform: `translate(${cardX - r.left}px, ${aboveY - r.top}px) scale(${s})` }],
    { duration: 620, easing: 'cubic-bezier(.3, 1, .5, 1)', fill: 'forwards' }));
  // 2. il est avalé (rogné à la fente) pendant que les bandelettes sortent dans le bac
  clone.remove();
  machine.classList.add('on');
  const clip = document.createElement('div'); clip.className = 'fx-clip';
  Object.assign(clip.style, { left: `${cardX}px`, top: '0px', width: `${cw}px`, height: `${slotY}px` });
  const card = ghost(src, { left: 0, top: aboveY, width: r.width, height: r.height }, 'absolute');
  card.style.transformOrigin = '0 0'; card.style.transform = `scale(${s})`; card.classList.add('fx-feed');
  clip.append(card); L.append(clip);
  // le bac : les bandelettes y restent et s'entassent
  const wr = win.getBoundingClientRect(), bx = wr.left, by = wr.top, bw = wr.width, bh = wr.height;
  const pile = document.createElement('div'); pile.className = 'fx-pile';
  Object.assign(pile.style, { left: `${bx}px`, top: `${by}px`, width: `${bw}px`, height: `${bh}px` });
  L.append(pile);
  const N = 11, sw = cw / N, strips = [];
  for (let i = 0; i < N; i++) {
    const st = document.createElement('div'); st.className = 'fx-strip';
    Object.assign(st.style, { left: `${cardX - bx + i * sw}px`, top: '-40px', width: `${sw - 1}px`, height: `${ch}px` });
    const c = ghost(src, { left: -i * sw, top: 0, width: r.width, height: r.height }, 'absolute');
    c.style.transformOrigin = '0 0'; c.style.transform = `scale(${s})`;
    st.append(c); pile.append(st); strips.push(st);
    st.style.clipPath = 'inset(0 0 100% 0)';
  }
  const shake = [{ transform: 'translateX(0)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(2px)' }, { transform: 'translateX(0)' }];
  machine.animate(shake, { duration: 100, iterations: 11 }); pile.animate(shake, { duration: 100, iterations: 11 });
  const feed = 1000, slotMid = { x: mx + W / 2, y: slotY + 4 };
  for (let k = 0; k < 4; k++) setTimeout(() => bits(rnd(cardX, cardX + cw), slotMid.y, { n: 4, power: 36, up: 24, life: 600 }), k * 220);
  strips.forEach((st) => st.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }], { duration: feed, delay: 60, easing: 'linear', fill: 'forwards' }));
  await done(card.animate([{ transform: `scale(${s}) translateY(0)` }, { transform: `scale(${s}) translateY(${(ch + 28) / s}px)` }], { duration: feed, easing: 'cubic-bezier(.45, 0, .8, .7)', fill: 'forwards' }));
  clip.remove();
  machine.classList.remove('on');
  // 3. les bandelettes tombent dans le bac et s'y entassent
  const floor = bh + 40 - 6;
  await Promise.all(strips.map((st, i) => done(st.animate([
    { transform: 'translateY(0) rotate(0deg)' },
    { transform: `translateY(${floor - ch * (.42 + (i % 4) * .08)}px) rotate(${(i % 2 ? 1 : -1) * (3 + (i * 7) % 17)}deg)` },
  ], { duration: 760, delay: i * 45, easing: 'cubic-bezier(.5, 0, 1, .7)', fill: 'forwards' }))));
  await pause(650);
  // les bandelettes repartent avec la machine : même mouvement, en même temps
  const out = [{ transform: 'none', opacity: 1 }, { transform: 'translateY(300px)', opacity: 0 }], outOpts = { duration: 420, easing: 'ease-in', fill: 'forwards' };
  pile.animate(out, outOpts);
  await done(machine.animate(out, outOpts));
  pile.remove(); machine.remove(); temp?.remove();
}
