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

// ---------- couche des effets ----------

let layer = null;
const getLayer = () => {
  if (!layer?.isConnected) { layer = document.createElement('div'); layer.className = 'fx-layer'; document.body.append(layer); }
  return layer;
};
const ghost = (el, rect) => {
  const c = el.cloneNode(true);
  c.classList.add('fx-clone');
  c.removeAttribute('data-fx'); c.removeAttribute('data-action'); c.removeAttribute('draggable');
  Object.assign(c.style, { position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, margin: '0', transform: 'none', rotate: 'none', translate: 'none', zIndex: '2', visibility: 'visible' });
  return c;
};

// ---------- corbeille (tâches, post-it) ----------

const BIN = `<svg viewBox="0 0 64 74" aria-hidden="true"><g class="bin-lid"><rect x="4" y="10" width="56" height="8" rx="3"/><rect x="24" y="3" width="16" height="8" rx="3"/></g>
  <path class="bin-body" d="M9 21h46l-4 49a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4z"/><path class="bin-ribs" d="M23 29v36M32 29v36M41 29v36"/></svg>`;

/** Le morceau de papier se froisse et file dans la corbeille. Rend la main quand c'est fini. */
export async function trash(el) {
  if (!el || reduced()) return;
  const L = getLayer();
  const bin = document.createElement('div'); bin.className = 'fx-bin'; bin.innerHTML = BIN; L.append(bin);
  const lid = bin.querySelector('.bin-lid');
  const rise = bin.animate([{ transform: 'translateY(90px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'ease-out', fill: 'forwards' });
  const r = el.getBoundingClientRect();
  const clone = ghost(el, r);
  L.append(clone); el.style.visibility = 'hidden';
  await done(rise);
  const tx = bin.offsetLeft + bin.offsetWidth / 2 - (r.left + r.width / 2), ty = bin.offsetTop + 16 - (r.top + r.height / 2);
  const lift = Math.min(150, Math.abs(ty) * .35 + 50);
  lid.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-32deg)' }], { duration: 220, delay: 520, fill: 'forwards' });
  // le papier se froisse : le rectangle se referme en boule (cercle de plus en plus petit) pendant qu'il vole
  const R0 = Math.hypot(r.width, r.height) / 2, R1 = Math.min(r.width, r.height) / 2;
  const ball = (k) => `circle(${k}px at 50% 50%)`;
  await done(clone.animate([
    { transform: 'none', clipPath: ball(R0), filter: 'none' },
    { transform: 'scale(1.05, .9) rotate(-3deg)', clipPath: ball(R0 * .9), offset: .14 },
    { transform: `translate(${tx * .5}px, ${ty * .5 - lift}px) scale(.5) rotate(-170deg)`, clipPath: ball(R1 * 1.1), filter: 'brightness(.93)', offset: .6 },
    { transform: `translate(${tx}px, ${ty}px) scale(.2) rotate(-340deg)`, clipPath: ball(R1 * .8), filter: 'brightness(.8)', opacity: .95 },
  ], { duration: 900, easing: 'cubic-bezier(.4, 0, .65, 1)', fill: 'forwards' }));
  clone.remove();
  lid.animate([{ transform: 'rotate(-32deg)' }, { transform: 'rotate(0deg)' }], { duration: 220, fill: 'forwards' });
  await done(bin.animate([{ transform: 'none' }, { transform: 'translateX(-3px) rotate(-3deg)' }, { transform: 'translateX(3px) rotate(3deg)' }, { transform: 'none' }], { duration: 380 }));
  await done(bin.animate([{ opacity: 1 }, { transform: 'translateY(90px)', opacity: 0 }], { duration: 280, fill: 'forwards' }));
  bin.remove();
}

// ---------- déchiqueteuse (chantier, projet) ----------

/** Le grand morceau de papier est avalé par la déchiqueteuse et ressort en bandelettes. `html` sert quand rien n'est à l'écran. */
export async function shred(el, html) {
  if (reduced()) return;
  const L = getLayer();
  let temp = null, src = el;
  if (!src && html) {
    temp = document.createElement('div'); temp.className = 'fx-temp'; temp.innerHTML = html; L.append(temp); src = temp.firstElementChild;
  }
  if (!src) return;
  const W = Math.min(270, innerWidth - 32);
  const machine = document.createElement('div'); machine.className = 'fx-shredder'; machine.style.setProperty('--w', `${W}px`);
  machine.innerHTML = '<div class="sh-head"><i class="sh-led"></i></div><div class="sh-body"></div>'; L.append(machine);
  const rise = machine.animate([{ transform: 'translateY(60px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'ease-out', fill: 'forwards' });
  const r = src.getBoundingClientRect();
  const s = Math.min(1, (W - 60) / r.width, 150 / r.height);
  const cw = r.width * s, ch = r.height * s;
  const clone = ghost(src, r);
  L.append(clone);
  if (el) el.style.visibility = 'hidden'; else temp.style.visibility = 'hidden';
  await done(rise);
  const mx = machine.offsetLeft, my = machine.offsetTop;      // la déchiqueteuse en place
  const cardX = mx + (W - cw) / 2, slotY = my + 16;
  // 1. le papier vient se poser au-dessus de la fente
  const aboveY = slotY - ch - 10;
  clone.style.transformOrigin = '0 0';
  await done(clone.animate([{ transform: 'none' }, { transform: `translate(${cardX - r.left}px, ${aboveY - r.top}px) scale(${s})` }],
    { duration: 480, easing: 'cubic-bezier(.3, 1, .5, 1)', fill: 'forwards' }));
  // 2. il est avalé (rogné à la fente) pendant que les bandelettes sortent dessous
  clone.remove();
  const clip = document.createElement('div'); clip.className = 'fx-clip';
  Object.assign(clip.style, { left: `${cardX}px`, top: '0px', width: `${cw}px`, height: `${slotY}px` });
  const card = ghost(src, { left: 0, top: aboveY, width: r.width, height: r.height });
  card.style.transformOrigin = '0 0'; card.style.transform = `scale(${s})`; card.classList.add('fx-feed');
  clip.append(card); L.append(clip);
  const N = 9, sw = cw / N, strips = [];
  const strip0 = my + 64;
  for (let i = 0; i < N; i++) {
    const st = document.createElement('div'); st.className = 'fx-strip';
    Object.assign(st.style, { left: `${cardX + i * sw}px`, top: `${strip0}px`, width: `${sw - 1}px`, height: `${ch}px` });
    const c = ghost(src, { left: -i * sw, top: 0, width: r.width, height: r.height });
    c.style.transformOrigin = '0 0'; c.style.transform = `scale(${s})`;
    st.append(c); L.append(st); strips.push(st);
    st.style.clipPath = 'inset(0 0 100% 0)';
  }
  machine.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-1.5px)' }, { transform: 'translateX(1.5px)' }, { transform: 'translateX(0)' }], { duration: 110, iterations: 9 });
  const feed = 900;
  strips.forEach((st) => st.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }], { duration: feed, delay: 60, easing: 'linear', fill: 'forwards' }));
  await done(card.animate([{ transform: `scale(${s}) translateY(0)` }, { transform: `scale(${s}) translateY(${(ch + 24) / s}px)` }], { duration: feed, easing: 'cubic-bezier(.45, 0, .8, .7)', fill: 'forwards' }));
  clip.remove();
  // 3. les bandelettes tombent dans le bac
  await Promise.all(strips.map((st, i) => done(st.animate([
    { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
    { transform: `translateY(${90 + (i % 3) * 14}px) rotate(${(i % 2 ? 1 : -1) * (4 + i * 1.6)}deg)`, opacity: 0 },
  ], { duration: 620, delay: i * 40, easing: 'cubic-bezier(.5, 0, 1, .6)', fill: 'forwards' }))));
  strips.forEach((st) => st.remove());
  await pause(120);
  await done(machine.animate([{ opacity: 1 }, { transform: 'translateY(60px)', opacity: 0 }], { duration: 300, fill: 'forwards' }));
  machine.remove(); temp?.remove();
}
