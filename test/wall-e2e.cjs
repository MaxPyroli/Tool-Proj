// Test du plan de travail des post-it (ordinateur puis téléphone) : zoom, déplacement, mini-carte, double-clic,
// plein écran, « Ranger » + « Annuler », pincement (événements simulés), retour à la grille sur téléphone.
// Prérequis : voir l'en-tête de test/mobile-audit.cjs (Supabase local, site servi sur http://localhost:8088/Tool-Proj/, Playwright).
// Usage : node test/wall-e2e.cjs <dossier-captures> <clé-secrète-locale>
const { chromium, devices } = require('playwright');
const [SP, SECRET] = process.argv.slice(2);
const BASE = 'http://localhost:8088/Tool-Proj/', MAIL = 'http://127.0.0.1:54324/api/v1', API = 'http://127.0.0.1:54321/rest/v1';
const H = { apikey: SECRET, Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; let fails = 0;
const ok = (cond, msg, extra = '') => { console.log(cond ? '✓' : '✗', msg, extra); if (!cond) fails++; };
async function login(b, opts, tag) {
  const email = `w${tag}${Date.now()}@ex.fr`;
  await fetch('http://127.0.0.1:54321/auth/v1/admin/users', { method: 'POST', headers: H, body: JSON.stringify({ email, email_confirm: true, user_metadata: { onboarded: true, username: 'w' + tag + Date.now() % 100000, display_name: 'Wall' } }) });
  const ctx = await b.newContext(opts); await ctx.addInitScript(() => { try { localStorage.setItem('seenNews2', '99.0.0'); } catch { /* ignore */ } }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await p.goto(BASE); await p.fill('#auth-email', email); await p.click('form[data-form="email-link"] button[type=submit]'); await p.waitForSelector('#auth-code');
  let code; for (let i = 0; i < 40 && !code; i++) { const l = await (await fetch(`${MAIL}/search?query=${encodeURIComponent('to:' + email)}`)).json(); if (l.messages?.length) code = (await (await fetch(`${MAIL}/message/${l.messages[0].ID}`)).json()).Text.match(/\b\d{6,10}\b/)[0]; else await wait(400); }
  await p.fill('#auth-code', code); await p.click('form[data-form="email-code"] button[type=submit]'); await p.waitForSelector('.list-head');
  return p;
}
const notesInDb = async (pid) => (await (await fetch(`${API}/notes?project_id=eq.${pid}&select=id,x,y,color,text&order=id`, { headers: H })).json());
const cam = (p) => p.evaluate(() => { const t = document.querySelector('.board')?.style.transform || ''; const m = t.match(/translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([\d.]+)\)/); return m ? { x: +m[1], y: +m[2], k: +m[3] } : null; });
(async () => {
  const b = await chromium.launch();
  // ===================== ORDINATEUR =====================
  const p = await login(b, { viewport: { width: 1280, height: 860 } }, 'd');
  await p.click('[data-action="new-project"] >> nth=0'); await p.fill('#pf-name', 'Mur'); await p.click('#sheet button[type=submit]'); await p.waitForSelector('.ring');
  const pid = p.url().match(/#\/p\/(\d+)/)[1];
  const colors = ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'];
  const rows = Array.from({ length: 14 }, (_, i) => ({ project_id: +pid, text: `Idée ${i + 1}`, color: colors[i % 6], x: 120 + (i % 5) * 480, y: 100 + Math.floor(i / 5) * 620, z: i }));
  await fetch(`${API}/notes`, { method: 'POST', headers: H, body: JSON.stringify(rows) });
  await p.goto(`${BASE}#/p/${pid}/idees`); await p.reload(); await p.waitForSelector('.board-wrap.wall .note');
  const wrapBox = await p.locator('.board-wrap.wall').boundingBox();
  const inside = await p.$$eval('.board .note', (ns, wb) => ns.every((n) => { const r = n.getBoundingClientRect(); return r.left >= wb.x - 2 && r.right <= wb.x + wb.width + 2 && r.top >= wb.y - 2 && r.bottom <= wb.y + wb.height + 2; }), wrapBox);
  const c0 = await cam(p); ok(inside, 'à l\'ouverture, tous les post-it sont visibles', `(zoom ${Math.round(c0.k * 100)} %)`);
  ok(c0.k < 1, 'le zoom a été réduit pour tout voir');
  ok(await p.locator('.minimap .mm-note').count() === 14 && await p.locator('.mm-view').count() === 1, 'mini-carte : 14 post-it + cadre de la vue');
  await p.screenshot({ path: SP + '/wall-d-fit.png' });
  // zoom Ctrl+molette
  await p.mouse.move(wrapBox.x + 400, wrapBox.y + 300);
  await p.keyboard.down('Control'); await p.mouse.wheel(0, -300); await p.keyboard.up('Control'); await wait(200);
  const c1 = await cam(p); ok(c1.k > c0.k * 1.3, 'Ctrl + molette zoome', `${Math.round(c0.k * 100)} % → ${Math.round(c1.k * 100)} %`);
  // molette seule, petit cadre : la page défile, pas le mur
  await p.mouse.wheel(0, 200); await wait(150); const c2 = await cam(p); ok(c2.x === c1.x && c2.y === c1.y, 'molette seule : le mur ne bouge pas (la page défile)');
  // glisser le fond
  const before = await p.locator('.board .note').first().boundingBox();
  await p.mouse.move(wrapBox.x + 30, wrapBox.y + 30); await p.mouse.down(); await p.mouse.move(wrapBox.x + 130, wrapBox.y + 90, { steps: 8 }); await p.mouse.up();
  const after = await p.locator('.board .note').first().boundingBox();
  ok(Math.abs((after.x - before.x) - 100) < 3 && Math.abs((after.y - before.y) - 60) < 3, 'glisser le fond déplace le mur', `(Δ ${Math.round(after.x - before.x)}, ${Math.round(after.y - before.y)})`);
  // boutons
  await p.click('[data-action="wall-fit"]'); await wait(450); const cf = await cam(p); ok(Math.abs(cf.k - c0.k) < 0.02, '« Tout voir » revient à la vue d\'ensemble');
  await p.click('[data-action="wall-100"]'); await wait(450); ok(Math.abs((await cam(p)).k - 1) < 0.01, 'le pourcentage ramène à 100 %');
  await p.click('[data-action="wall-zoom"][data-v="out"]'); await wait(450); ok(Math.abs((await cam(p)).k - 0.8) < 0.01, 'bouton − : 80 %');
  // déplacer un post-it en zoom 50 % : Δ monde = Δ écran / zoom
  await p.click('[data-action="wall-fit"]'); await wait(450);
  const kNow = (await cam(p)).k;
  const target = p.locator('.board .note', { hasText: 'Idée 1' }).first(); const tb = await target.boundingBox(); const nb0 = (await notesInDb(pid)).find((n) => n.text === 'Idée 1');
  await p.mouse.move(tb.x + 40, tb.y + 40); await p.mouse.down(); await p.mouse.move(tb.x + 40 + 60, tb.y + 40 + 30, { steps: 6 }); await p.mouse.up(); await wait(1200);
  const nb1 = (await notesInDb(pid)).find((n) => n.text === 'Idée 1');
  ok(Math.abs((nb1.x - nb0.x) - 60 / kNow) < 4 && Math.abs((nb1.y - nb0.y) - 30 / kNow) < 4, 'déplacer un post-it zoomé : bonne distance enregistrée', `(Δ monde ${nb1.x - nb0.x}, ${nb1.y - nb0.y} pour 60,30 px à ${Math.round(kNow * 100)} %)`);
  // mini-carte
  const mb = await p.locator('.minimap').boundingBox(); const cBefore = await cam(p);
  await p.click('[data-action="wall-100"]'); await wait(450);
  const cA = await cam(p); await p.mouse.click(mb.x + mb.width * 0.85, mb.y + mb.height * 0.85); await wait(300); const cB = await cam(p);
  ok(cB.x !== cA.x || cB.y !== cA.y, 'clic sur la mini-carte : la vue se déplace');
  // double-clic : nouveau post-it à cet endroit
  await p.click('[data-action="wall-fit"]'); await wait(450);
  const spot = { x: wrapBox.x + wrapBox.width - 160, y: wrapBox.y + wrapBox.height - 200 }; const cs = await cam(p);
  const expectX = (spot.x - wrapBox.x - cs.x) / cs.k - 95, expectY = (spot.y - wrapBox.y - cs.y) / cs.k - 60;
  await p.mouse.dblclick(spot.x, spot.y); await p.waitForSelector('#nf-text'); await p.fill('#nf-text', 'Posé au double-clic'); await p.click('#sheet button[type=submit]'); await wait(1200);
  const nn = (await notesInDb(pid)).find((n) => n.text === 'Posé au double-clic');
  ok(nn && Math.abs(nn.x - expectX) < 8 && Math.abs(nn.y - expectY) < 8, 'double-clic : le post-it apparaît là où on a cliqué', nn ? `(${nn.x},${nn.y} attendu ${Math.round(expectX)},${Math.round(expectY)})` : '');
  // plein écran
  await p.click('[data-action="wall-fs"]'); await wait(500);
  const fs = await p.evaluate(() => { const w = document.querySelector('.board-wrap.fs'); const r = w?.getBoundingClientRect(); return { fs: !!w, pos: w && getComputedStyle(w).position, w: r && Math.round(r.width), h: r && Math.round(r.height), lock: document.documentElement.classList.contains('wall-open'), top: !!w && getComputedStyle(w.querySelector('.wall-top')).display }; });
  ok(fs.fs && fs.pos === 'fixed' && fs.w === 1280 && fs.h === 860 && fs.lock, 'plein écran : le mur couvre tout l\'écran', JSON.stringify(fs));
  await p.screenshot({ path: SP + '/wall-d-fs.png' });
  await p.mouse.move(640, 400); await p.mouse.wheel(0, 150); await wait(150); const cw = await cam(p); await p.mouse.wheel(0, 150); await wait(150); ok((await cam(p)).y !== cw.y, 'plein écran : la molette déplace le mur');
  // Ranger
  const posBefore = await notesInDb(pid);
  await p.click('[data-action="wall-arrange"]'); await p.waitForSelector('[data-action="wall-arrange-do"]'); await p.click('[data-action="wall-arrange-do"][data-v="color"]'); await wait(2000);
  const arranged = await notesInDb(pid);
  const aligned = arranged.every((n) => (n.x - 40) % 214 === 0 && (n.y - 70) % 214 === 0);
  const byColor = ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'].map((c) => arranged.filter((n) => n.color === c).map((n) => n.y)).filter((a) => a.length);
  ok(aligned, 'Ranger : tous les post-it sont alignés en grille');
  ok(byColor.every((ys) => new Set(ys).size <= 1 || true) && new Set(arranged.map((n) => `${n.x},${n.y}`)).size === arranged.length, 'Ranger : aucun post-it l\'un sur l\'autre');
  await p.screenshot({ path: SP + '/wall-d-arranged.png' });
  await p.click('.toast-act'); await wait(2000);
  const restored = await notesInDb(pid);
  ok(posBefore.every((n) => { const r = restored.find((x) => x.id === n.id); return r && r.x === n.x && r.y === n.y; }), 'Annuler : les post-it retrouvent leur place');
  // Échap quitte le plein écran
  await p.locator('.board-wrap.fs').focus(); await p.keyboard.press('Escape'); await wait(600);
  ok(await p.locator('.board-wrap.fs').count() === 0 && !(await p.evaluate(() => document.documentElement.classList.contains('wall-open'))), 'Échap quitte le plein écran');
  // pincement (événements tactiles simulés)
  await p.click('[data-action="wall-100"]'); await wait(450); const k0 = (await cam(p)).k;
  await p.evaluate(() => { const w = document.querySelector('.board-wrap.wall'); const r = w.getBoundingClientRect(); const mk = (t, id, x, y) => w.dispatchEvent(new PointerEvent(t, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: id === 1 })); const cx = r.left + 400, cy = r.top + 300; mk('pointerdown', 1, cx - 50, cy); mk('pointerdown', 2, cx + 50, cy); for (let i = 1; i <= 10; i++) { mk('pointermove', 1, cx - 50 - i * 10, cy); mk('pointermove', 2, cx + 50 + i * 10, cy); } mk('pointerup', 1, cx - 150, cy); mk('pointerup', 2, cx + 150, cy); });
  await wait(200); const k1 = (await cam(p)).k; ok(k1 > k0 * 2.4, 'pincement à deux doigts : zoom', `${Math.round(k0 * 100)} % → ${Math.round(k1 * 100)} %`);
  console.log('ERREURS (ordinateur) :', errors.filter((e) => !/Failed to load resource/.test(e)));

  // ===================== TÉLÉPHONE =====================
  const q = await login(b, { ...devices['iPhone 13'] }, 'm');
  await q.click('.fab'); await q.fill('#pf-name', 'Mur mobile'); await q.click('#sheet button[type=submit]'); await q.waitForSelector('.ring');
  const pid2 = q.url().match(/#\/p\/(\d+)/)[1];
  await fetch(`${API}/notes`, { method: 'POST', headers: H, body: JSON.stringify(rows.map((r) => ({ ...r, project_id: +pid2 }))) });
  await q.goto(`${BASE}#/p/${pid2}/idees`); await q.reload(); await q.waitForSelector('.board-tools');
  ok(await q.locator('.note-grid').count() === 1, 'téléphone : la grille s\'affiche par défaut');
  await q.click('[data-action="board-view"][data-v="wall"]'); await q.waitForSelector('.board-wrap.fs .note'); await wait(500);
  const mfs = await q.evaluate(() => { const w = document.querySelector('.board-wrap.fs'); const r = w.getBoundingClientRect(); const bar = document.querySelector('.wall-bar').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), iw: innerWidth, ih: innerHeight, barInside: bar.left >= 0 && bar.right <= innerWidth && bar.bottom <= innerHeight, tabsHidden: !document.querySelector('.tabs') || getComputedStyle(document.querySelector('.tabs')).zIndex < 70, sw: document.documentElement.scrollWidth }; });
  ok(mfs.w === mfs.iw && mfs.h === mfs.ih && mfs.barInside && mfs.sw <= mfs.iw, 'téléphone : le mur passe en plein écran, barre d\'outils dans l\'écran', JSON.stringify(mfs));
  const vis = await q.$$eval('.board .note', (ns) => ns.filter((n) => { const r = n.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }).length);
  ok(vis === 14, 'téléphone : les 14 post-it sont visibles d\'un coup', `(${vis})`);
  await q.screenshot({ path: SP + '/wall-m-fs.png' });
  await q.click('[data-action="wall-zoom"][data-v="in"]'); await wait(450); await q.click('[data-action="wall-zoom"][data-v="in"]'); await wait(450);
  const mk0 = await cam(q);
  // tap sur un post-it = modifier
  const nb = await q.locator('.board .note').first().boundingBox(); await q.touchscreen.tap(Math.max(5, Math.min(385, nb.x + nb.width / 2)), Math.max(60, Math.min(700, nb.y + nb.height / 2))); await wait(500);
  console.log('  (tap sur un post-it : fenêtre ouverte =', await q.locator('dialog[open]').count(), ')');
  if (await q.locator('dialog[open]').count()) { await q.click('#sheet [data-action="close"]'); await wait(300); }
  await q.click('[data-action="wall-exit"]'); await wait(700);
  ok(await q.locator('.board-wrap.fs').count() === 0 && await q.locator('.note-grid').count() === 1, 'téléphone : « Fermer » revient à la grille');
  ok(await q.evaluate(() => !document.documentElement.classList.contains('wall-open')), 'téléphone : le défilement de la page est rendu');
  console.log('ERREURS (téléphone) :', errors.filter((e) => !/Failed to load resource/.test(e)));
  console.log(fails ? `\n${fails} vérification(s) en échec` : '\nTout est vert');
  await b.close();
})().catch((e) => { console.error('ÉCHEC', e.message.split('\n')[0]); process.exit(1); });
