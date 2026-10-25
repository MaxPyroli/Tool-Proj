// Test des vrais gestes tactiles sur le mur (Chrome DevTools Protocol) : toucher, un doigt, deux doigts qui pincent,
// post-it déplacé, un doigt qui tient un post-it pendant que l'autre déplace la vue, deux post-it déplacés en même temps,
// pincer en partant de post-it (rien ne doit bouger), doigt « fantôme » jamais relevé.
// Prérequis : voir l'en-tête de test/mobile-audit.cjs. Usage : node test/wall-touch.cjs <dossier-captures> <clé-secrète-locale>
const { chromium, devices } = require('playwright');
const [SP, SECRET] = process.argv.slice(2);
const BASE = 'http://localhost:8088/Tool-Proj/', MAIL = 'http://127.0.0.1:54324/api/v1', API = 'http://127.0.0.1:54321/rest/v1';
const H = { apikey: SECRET, Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms)); let fails = 0;
const ok = (c, m, x = '') => { console.log(c ? '✓' : '✗', m, x); if (!c) fails++; };
(async () => {
  const email = `tc${Date.now()}@ex.fr`;
  await fetch('http://127.0.0.1:54321/auth/v1/admin/users', { method: 'POST', headers: H, body: JSON.stringify({ email, email_confirm: true, user_metadata: { onboarded: true, username: 'tc' + Date.now() % 100000, display_name: 'Touch' } }) });
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await p.goto(BASE); await p.fill('#auth-email', email); await p.click('form[data-form="email-link"] button[type=submit]'); await p.waitForSelector('#auth-code');
  let code; for (let i = 0; i < 40 && !code; i++) { const l = await (await fetch(`${MAIL}/search?query=${encodeURIComponent('to:' + email)}`)).json(); if (l.messages?.length) code = (await (await fetch(`${MAIL}/message/${l.messages[0].ID}`)).json()).Text.match(/\b\d{6,10}\b/)[0]; else await wait(400); }
  await p.fill('#auth-code', code); await p.click('form[data-form="email-code"] button[type=submit]'); await p.waitForSelector('.list-head');
  await p.click('.fab'); await p.fill('#pf-name', 'Tactile'); await p.click('#sheet button[type=submit]'); await p.waitForSelector('.ring');
  const pid = p.url().match(/#\/p\/(\d+)/)[1];
  const colors = ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'];
  await fetch(`${API}/notes`, { method: 'POST', headers: H, body: JSON.stringify(Array.from({ length: 8 }, (_, i) => ({ project_id: +pid, text: `Idée ${i + 1}`, color: colors[i % 6], x: 100 + (i % 4) * 300, y: 100 + Math.floor(i / 4) * 300, z: i }))) });
  await p.goto(`${BASE}#/p/${pid}/idees`); await p.reload(); await p.waitForSelector('.board-tools');
  await p.click('[data-action="board-view"][data-v="wall"]'); await p.waitForSelector('.board-wrap.fs .note'); await wait(600);
  const cdp = await ctx.newCDPSession(p);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q.x, y: q.y, id: i + 1 })) });
  const cam = () => p.evaluate(() => { const m = (document.querySelector('.board').style.transform || '').match(/translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([\d.]+)\)/); return m ? { x: +m[1], y: +m[2], k: +m[3] } : null; });
  const center = async (t) => { const r = await p.locator('.board .note', { hasText: t }).first().boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, box: r }; };
  // 1. toucher un post-it : fenêtre de modification
  let c = await center('Idée 2'); await touch('touchStart', [c]); await touch('touchEnd', []); await wait(500);
  ok(await p.locator('dialog[open]').count() === 1 && await p.locator('#nf-text').count() === 1, 'toucher un post-it ouvre sa fiche');
  await p.click('#sheet [data-action="close"]'); await wait(300);
  // 2. glisser le fond avec un doigt
  const c0 = await cam(); await touch('touchStart', [{ x: 200, y: 560 }]); for (let i = 1; i <= 8; i++) await touch('touchMove', [{ x: 200 + i * 10, y: 560 + i * 5 }]); await touch('touchEnd', []); await wait(200);
  const c1 = await cam(); ok(Math.abs(c1.x - c0.x - 80) < 3 && Math.abs(c1.y - c0.y - 40) < 3, 'un doigt sur le fond : le mur suit', `(Δ ${Math.round(c1.x - c0.x)}, ${Math.round(c1.y - c0.y)})`);
  // 3. pincement à deux doigts : zoom
  await touch('touchStart', [{ x: 150, y: 300 }, { x: 240, y: 300 }]); for (let i = 1; i <= 10; i++) await touch('touchMove', [{ x: 150 - i * 6, y: 300 }, { x: 240 + i * 6, y: 300 }]); await touch('touchEnd', []); await wait(200);
  const c2 = await cam(); ok(c2.k > c1.k * 1.8, 'deux doigts qui s\'écartent : zoom avant', `${Math.round(c1.k * 100)} % → ${Math.round(c2.k * 100)} %`);
  await touch('touchStart', [{ x: 60, y: 300 }, { x: 330, y: 300 }]); for (let i = 1; i <= 10; i++) await touch('touchMove', [{ x: 60 + i * 12, y: 300 }, { x: 330 - i * 12, y: 300 }]); await touch('touchEnd', []); await wait(200);
  const c3 = await cam(); ok(c3.k < c2.k * 0.6, 'deux doigts qui se rapprochent : zoom arrière', `${Math.round(c2.k * 100)} % → ${Math.round(c3.k * 100)} %`);
  // 4. déplacer un post-it au doigt (zoom courant)
  await p.click('[data-action="wall-fit"]'); await wait(450); const kk = (await cam()).k;
  c = await center('Idée 1'); const db0 = (await (await fetch(`${API}/notes?project_id=eq.${pid}&text=eq.${encodeURIComponent('Idée 1')}&select=x,y`, { headers: H })).json())[0];
  await touch('touchStart', [c]); for (let i = 1; i <= 8; i++) await touch('touchMove', [{ x: c.x + i * 7, y: c.y + i * 4 }]); await touch('touchEnd', []); await wait(1200);
  const db1 = (await (await fetch(`${API}/notes?project_id=eq.${pid}&text=eq.${encodeURIComponent('Idée 1')}&select=x,y`, { headers: H })).json())[0];
  ok(Math.abs((db1.x - db0.x) - 56 / kk) < 5 && Math.abs((db1.y - db0.y) - 32 / kk) < 5, 'un doigt sur un post-it : il se déplace et c\'est enregistré', `(Δ monde ${db1.x - db0.x}, ${db1.y - db0.y} à ${Math.round(kk * 100)} %)`);
  // ===== plusieurs doigts =====
  const get = async (t) => (await (await fetch(`${API}/notes?project_id=eq.${pid}&text=eq.${encodeURIComponent(t)}&select=x,y`, { headers: H })).json())[0];
  const emptySpot = () => p.evaluate(() => { const free = (x, y) => { for (const dx of [-22, 0, 22]) for (const dy of [-22, 0, 22]) { const e = document.elementFromPoint(x + dx, y + dy); if (!e || e.closest('.note, .wall-bar, .wall-top, .minimap')) return false; } return true; }; for (let y = 130; y < innerHeight - 130; y += 20) for (let x = 40; x < innerWidth - 40; x += 20) if (free(x, y)) return { x, y }; return null; });
  await p.evaluate(() => document.querySelector('[data-action="wall-fit"]').click()); await wait(450);
  await p.click('[data-action="wall-zoom"][data-v="in"]'); await wait(450); await p.click('[data-action="wall-zoom"][data-v="in"]'); await wait(450);
  const rect = await p.locator('.board-wrap.fs').boundingBox();
  const visibleNote = async (skip = []) => p.evaluate((skip) => { const ns = [...document.querySelectorAll('.board .note')].filter((n) => !skip.includes(n.innerText.split('\n')[0])); for (const n of ns) { const r = n.getBoundingClientRect(); const cx = r.x + r.width / 2, cy = r.y + r.height / 2; if (cx > 30 && cx < innerWidth - 30 && cy > 140 && cy < innerHeight - 140 && document.elementFromPoint(cx, cy)?.closest('.note') === n) return { t: n.innerText.split('\n')[0], x: cx, y: cy }; } return null; }, skip);

  // S1 : un doigt tient un post-it, l'autre déplace la vue
  const n1 = await visibleNote(); const g1 = await get(n1.t); const k1 = (await cam()).k; const camA = await cam();
  const ground = await emptySpot();
  await touch('touchStart', [{ x: n1.x, y: n1.y }]);
  for (let i = 1; i <= 4; i++) await touch('touchMove', [{ x: n1.x + i * 6, y: n1.y + i * 2 }]);
  const A = { x: n1.x + 24, y: n1.y + 8 };
  await touch('touchStart', [A, { x: ground.x, y: ground.y }]);
  for (let i = 1; i <= 8; i++) await touch('touchMove', [A, { x: ground.x + i * 10, y: ground.y }]);
  const camB = await cam();
  const el1 = await p.locator('.board .note', { hasText: n1.t }).first().boundingBox();
  ok(Math.abs((camB.x - camA.x) - 80) < 4 && Math.abs(camB.k - camA.k) < 0.001, 'tenir un post-it + un doigt sur le fond : la vue se déplace', `(Δvue ${Math.round(camB.x - camA.x)} px)`);
  ok(Math.abs(el1.x + el1.width / 2 - A.x) < 100 / k1 && Math.abs(el1.y + el1.height / 2 - A.y) < 100 / k1, 'le post-it reste sous le doigt qui le tient');
  await touch('touchEnd', []); await wait(1300);
  const g1b = await get(n1.t); const camC = await cam();
  const expX = (A.x - rect.x - camC.x) / camC.k - ((n1.x - rect.x - camA.x) / camA.k - g1.x), expY = (A.y - rect.y - camC.y) / camC.k - ((n1.y - rect.y - camA.y) / camA.k - g1.y);
  ok(Math.abs(g1b.x - expX) < 6 && Math.abs(g1b.y - expY) < 6, 'position enregistrée = là où le doigt l\'a lâché (même après avoir bougé la vue)', `(${g1b.x},${g1b.y} attendu ${Math.round(expX)},${Math.round(expY)})`);

  // S2 : deux post-it déplacés en même temps, un par doigt
  await p.click('[data-action="wall-fit"]'); await wait(450); await p.click('[data-action="wall-zoom"][data-v="in"]'); await wait(450);
  const a = await visibleNote([n1.t]); const b2 = await visibleNote([n1.t, a.t]); const ga = await get(a.t), gb = await get(b2.t); const kk2 = (await cam()).k;
  await touch('touchStart', [{ x: a.x, y: a.y }]);
  for (let i = 1; i <= 3; i++) await touch('touchMove', [{ x: a.x + i * 5, y: a.y + i * 3 }]);
  const Pa = { x: a.x + 15, y: a.y + 9 };
  await touch('touchStart', [Pa, { x: b2.x, y: b2.y }]);
  for (let i = 1; i <= 8; i++) await touch('touchMove', [{ x: Pa.x + i * 5, y: Pa.y }, { x: b2.x, y: b2.y + i * 6 }]);
  await touch('touchEnd', []); await wait(1500);
  const ga2 = await get(a.t), gb2 = await get(b2.t);
  ok(Math.abs((ga2.x - ga.x) - 55 / kk2) < 6 && Math.abs((ga2.y - ga.y) - 9 / kk2) < 6, 'deux doigts, deux post-it : le premier est enregistré', `(Δ ${ga2.x - ga.x}, ${ga2.y - ga.y})`);
  ok(Math.abs((gb2.x - gb.x)) < 6 && Math.abs((gb2.y - gb.y) - 48 / kk2) < 6, 'deux doigts, deux post-it : le second aussi', `(Δ ${gb2.x - gb.x}, ${gb2.y - gb.y})`);

  // S3 : pincement avec les deux doigts posés sur des post-it : on zoome, rien n'est déplacé
  await p.click('[data-action="wall-fit"]'); await wait(450); await p.click('[data-action="wall-zoom"][data-v="in"]'); await wait(450);
  const c1n = await visibleNote(); const c2n = await visibleNote([c1n.t]); const s0a = await get(c1n.t), s0b = await get(c2n.t); const kz = (await cam()).k;
  const mid = { x: (c1n.x + c2n.x) / 2, y: (c1n.y + c2n.y) / 2 };
  await touch('touchStart', [{ x: c1n.x, y: c1n.y }, { x: c2n.x, y: c2n.y }]);
  for (let i = 1; i <= 8; i++) await touch('touchMove', [{ x: c1n.x + (c1n.x - mid.x) * i * 0.12, y: c1n.y + (c1n.y - mid.y) * i * 0.12 }, { x: c2n.x + (c2n.x - mid.x) * i * 0.12, y: c2n.y + (c2n.y - mid.y) * i * 0.12 }]);
  await touch('touchEnd', []); await wait(1200);
  const kz2 = (await cam()).k; const s1a = await get(c1n.t), s1b = await get(c2n.t);
  ok(kz2 > kz * 1.4, 'pincer sur des post-it : ça zoome', `${Math.round(kz * 100)} % → ${Math.round(kz2 * 100)} %`);
  ok(s0a.x === s1a.x && s0a.y === s1a.y && s0b.x === s1b.x && s0b.y === s1b.y, 'pincer sur des post-it : aucun post-it n\'est déplacé');

  // S4 : un doigt fantôme (jamais relevé) ne bloque plus les gestes
  await p.evaluate(() => { const w = document.querySelector('.board-wrap.fs'); w.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 99, pointerType: 'touch', clientX: 50, clientY: 300, bubbles: true, isPrimary: false })); });
  const camG = await cam(); const sp2 = await emptySpot();
  const dir = camG.x > 100 ? -1 : 1; await touch('touchStart', [sp2]); for (let i = 1; i <= 6; i++) await touch('touchMove', [{ x: sp2.x + dir * i * 10, y: sp2.y }]); await touch('touchEnd', []); await wait(200);
  const camH = await cam();
  ok(Math.abs((camH.x - camG.x) - dir * 60) < 4 && Math.abs(camH.k - camG.k) < 0.001, 'un doigt fantôme ne bloque plus : un doigt déplace la vue', `(Δ ${Math.round(camH.x - camG.x)}, zoom ${Math.round(camH.k * 100)} %)`);

  console.log('ERREURS :', errors.filter((e) => !/Failed to load resource/.test(e)));
  console.log(fails ? `${fails} en échec` : 'Tout est vert'); await b.close();
})().catch((e) => { console.error('ÉCHEC', e.message.split('\n')[0]); process.exit(1); });
