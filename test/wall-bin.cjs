// Test de la corbeille du mur de post-it : un post-it lâché dessus est supprimé (souris), lâché ailleurs il reste.
// Prérequis : voir l'en-tête de test/mobile-audit.cjs (Supabase local, site servi sur http://localhost:8088/Tool-Proj/, Playwright).
// Usage : node test/wall-bin.cjs <dossier-captures> <clé-secrète-locale>
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
  // ---- corbeille du mur : un post-it lâché dessus est jeté (souris, puis tactile)
  await p.goto(`${BASE}#/p/${pid}/idees`); await p.reload(); await p.waitForSelector('.board-wrap.wall .note');
  await wait(600);
  const visNote = async () => { const els = await p.locator('.board-wrap.wall .note').all(); for (const e of els) { const r = await e.boundingBox(); if (r && r.y > 200 && r.y < 700 && r.x > 150) return r; } return null; };
  const binBox = await p.locator('.wall-bin').boundingBox();
  ok(!!binBox && binBox.width > 40, 'la corbeille est visible sur le mur', JSON.stringify(binBox));
  const before = (await notesInDb(pid)).length;
  const nb = await visNote();
  await p.mouse.move(nb.x + nb.width / 2, nb.y + nb.height / 2); await p.mouse.down();
  await p.mouse.move(nb.x + nb.width / 2 + 40, nb.y + nb.height / 2 - 40, { steps: 4 });
  await p.mouse.move(binBox.x + binBox.width / 2, binBox.y + binBox.height / 2, { steps: 12 }); await wait(120);
  ok(await p.evaluate(() => document.querySelector('.wall-bin').classList.contains('over')), 'la corbeille s\'allume quand le post-it est dessus');
  await p.mouse.up(); await wait(3800);
  const after = (await notesInDb(pid)).length;
  ok(after === before - 1, 'souris : le post-it lâché sur la corbeille est supprimé', `(${before} → ${after})`);
  ok(await p.evaluate(() => !document.querySelector('.wall-bin').classList.contains('armed')), 'la corbeille se calme ensuite');
  // lâché ailleurs : il reste
  const nb2 = await visNote();
  await p.mouse.move(nb2.x + nb2.width / 2, nb2.y + nb2.height / 2); await p.mouse.down(); await p.mouse.move(nb2.x + nb2.width / 2 + 60, nb2.y + nb2.height / 2 + 20, { steps: 6 }); await p.mouse.up(); await wait(900);
  ok((await notesInDb(pid)).length === after, 'lâché ailleurs : le post-it reste');
  console.log('ERREURS', errors.length ? errors : []); await b.close();
  console.log(fails ? `${fails} vérification(s) en échec` : 'Tout est vert'); process.exit(fails ? 1 : 0);
})();
