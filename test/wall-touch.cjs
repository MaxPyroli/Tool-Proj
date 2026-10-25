// Test des vrais gestes tactiles sur le mur (Chrome DevTools Protocol) : toucher, un doigt, deux doigts, post-it déplacé.
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
  // 5. un second doigt pendant un déplacement : on zoome, le post-it ne bouge pas
  c = await center('Idée 3'); const s0 = (await (await fetch(`${API}/notes?project_id=eq.${pid}&text=eq.${encodeURIComponent('Idée 3')}&select=x,y`, { headers: H })).json())[0];
  await touch('touchStart', [c]); await touch('touchMove', [{ x: c.x + 30, y: c.y + 10 }]);
  await touch('touchMove', [{ x: c.x + 30, y: c.y + 10 }, { x: 40, y: 560 }]); for (let i = 1; i <= 6; i++) await touch('touchMove', [{ x: c.x + 30 + i * 4, y: c.y + 10 }, { x: 40 - 0, y: 560 + i * 3 }]); await touch('touchEnd', []); await wait(1000);
  const s1 = (await (await fetch(`${API}/notes?project_id=eq.${pid}&text=eq.${encodeURIComponent('Idée 3')}&select=x,y`, { headers: H })).json())[0];
  ok(s0.x === s1.x && s0.y === s1.y, 'un 2ᵉ doigt pendant un déplacement : le post-it revient, pas d\'enregistrement parasite');
  console.log('ERREURS :', errors.filter((e) => !/Failed to load resource/.test(e)));
  console.log(fails ? `${fails} en échec` : 'Tout est vert'); await b.close();
})().catch((e) => { console.error('ÉCHEC', e.message.split('\n')[0]); process.exit(1); });
