// Test de la grille des post-it au doigt : appui long = le post-it est attrapé, la corbeille monte, lâché dessus il est jeté (sinon il reste, et un simple toucher ouvre la fiche) (Chrome DevTools Protocol) : toucher, un doigt, deux doigts qui pincent,
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
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); await ctx.addInitScript(() => { try { localStorage.setItem('seenNews2', '99.0.0'); } catch { /* ignore */ } }); const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await p.goto(BASE); await p.fill('#auth-email', email); await p.click('form[data-form="email-link"] button[type=submit]'); await p.waitForSelector('#auth-code');
  let code; for (let i = 0; i < 40 && !code; i++) { const l = await (await fetch(`${MAIL}/search?query=${encodeURIComponent('to:' + email)}`)).json(); if (l.messages?.length) code = (await (await fetch(`${MAIL}/message/${l.messages[0].ID}`)).json()).Text.match(/\b\d{6,10}\b/)[0]; else await wait(400); }
  await p.fill('#auth-code', code); await p.click('form[data-form="email-code"] button[type=submit]'); await p.waitForSelector('.list-head');
  await p.click('.fab'); await p.fill('#pf-name', 'Tactile'); await p.click('#sheet button[type=submit]'); await p.waitForSelector('.ring');
  const pid = p.url().match(/#\/p\/(\d+)/)[1];
  const colors = ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'];
  await fetch(`${API}/notes`, { method: 'POST', headers: H, body: JSON.stringify(Array.from({ length: 8 }, (_, i) => ({ project_id: +pid, text: `Idée ${i + 1}`, color: colors[i % 6], x: 100 + (i % 4) * 300, y: 100 + Math.floor(i / 4) * 300, z: i }))) });
  await p.goto(`${BASE}#/p/${pid}/idees`); await p.reload(); await p.waitForSelector('.board-tools');
  await p.waitForSelector('.note-grid .note'); await wait(800);
  const cdp = await ctx.newCDPSession(p);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q.x, y: q.y, id: i + 1 })) });
  const countNotes = async () => (await (await fetch(`${API}/notes?project_id=eq.${pid}&select=id`, { headers: H })).json()).length;
  const nb = await p.locator('.note-grid .note').nth(1).boundingBox(); const c0 = { x: nb.x + nb.width / 2, y: nb.y + nb.height / 2 };
  // 1. un simple toucher ouvre la fiche
  await touch('touchStart', [c0]); await touch('touchEnd', []); await wait(600);
  ok(await p.evaluate(() => document.getElementById('sheet').open), 'un simple toucher ouvre la fiche du post-it');
  await p.evaluate(() => document.getElementById('sheet').close()); await wait(500);
  // 2. appui long : le post-it est attrapé, la corbeille monte, il n'ouvre rien
  const n0 = await countNotes();
  await touch('touchStart', [c0]); await wait(420);
  const gpos = await p.evaluate(() => { const g = document.querySelector('.note.dnd-ghost'); if (!g) return null; const r = g.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  ok(!!gpos && Math.hypot(gpos.x - c0.x, gpos.y - c0.y) < 40, 'à l\'attrape, le post-it reste sous le doigt (pas de saut en haut)', JSON.stringify({ gpos, c0 }));
  await wait(180);
  ok(await p.evaluate(() => !!document.querySelector('.note.dnd-ghost') && document.querySelector('.hold-bin')?.classList.contains('armed')), 'appui long : le post-it est attrapé et la corbeille monte');
  await p.screenshot({ path: `${SP}/gb0.png` });
  const vw = p.viewportSize();
  for (let i = 1; i <= 8; i++) await touch('touchMove', [{ x: c0.x + (vw.width / 2 - c0.x) * i / 8, y: c0.y + (vw.height - 30 - c0.y) * i / 8 }]);
  await wait(500); await p.screenshot({ path: `${SP}/gb1.png` });
  ok(await p.evaluate(() => document.querySelector('.hold-bin').classList.contains('over')), 'au-dessus de la corbeille : elle s\'allume');
  const endPt = { x: c0.x + (vw.width / 2 - c0.x), y: c0.y + (vw.height - 30 - c0.y) };
  await touch('touchEnd', []);
  await wait(120); const clone0 = await p.evaluate(() => { const c = document.querySelector('.fx-layer .fx-clone'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  ok(!!clone0 && Math.hypot(clone0.x - endPt.x, clone0.y - endPt.y) < 140, 'l\'animation part de l\'endroit où le post-it est lâché', JSON.stringify({ clone0, endPt }));
  await wait(1100); await p.screenshot({ path: `${SP}/gb2.png` });
  await wait(2800);
  ok(await p.evaluate(() => document.querySelectorAll('.toast').length === 0), 'pas de tampon quand on jette un post-it à la corbeille');
  const bp = await p.evaluate(() => { const b = document.querySelector('.hold-bin'); const r = b.getBoundingClientRect(); return { top: Math.round(r.top), vh: innerHeight, vis: getComputedStyle(b).visibility, armed: b.classList.contains('armed') }; });
  ok(!bp.armed && bp.top >= bp.vh - 2, 'la vraie corbeille est bien redescendue (pas de seconde descente)', JSON.stringify(bp));
  ok((await countNotes()) === n0 - 1, 'lâché dans la corbeille : le post-it est supprimé', `(${n0} → ${await countNotes()})`);
  ok(await p.evaluate(() => !document.getElementById('sheet').open), 'et aucune fiche ne s\'ouvre');
  // 3. appui long puis lâché ailleurs : il reste
  const nb2 = await p.locator('.note-grid .note').nth(1).boundingBox(); const c2 = { x: nb2.x + nb2.width / 2, y: nb2.y + nb2.height / 2 };
  const n1 = await countNotes();
  await touch('touchStart', [c2]); await wait(600); await touch('touchMove', [{ x: c2.x + 20, y: c2.y + 40 }]); await touch('touchEnd', []); await wait(900);
  ok((await countNotes()) === n1, 'appui long puis lâché ailleurs : le post-it reste');
  ok(await p.evaluate(() => !document.querySelector('.hold-bin.armed, .dnd-ghost') ), 'la corbeille redescend et le fantôme disparaît');
  // 4. un glissement rapide = défilement, rien n'est attrapé
  const c3 = { x: nb2.x + nb2.width / 2, y: nb2.y + nb2.height / 2 };
  await touch('touchStart', [c3]); for (let i = 1; i <= 5; i++) await touch('touchMove', [{ x: c3.x, y: c3.y - i * 14 }]); await wait(500);
  ok(await p.evaluate(() => !document.querySelector('.dnd-ghost')), 'un glissement rapide défile (rien n\'est attrapé)'); await touch('touchEnd', []);
  console.log('ERREURS :', errors.filter((e) => !/Failed to load resource/.test(e)));
  console.log(fails ? `${fails} en échec` : 'Tout est vert'); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('ÉCHEC', e.message.split('\n')[0]); process.exit(1); });
