// Test du bouton « retour » avec une fenêtre ouverte : il ferme la fenêtre (on reste sur le même écran) ; une fenêtre fermée à la main ne laisse pas de retour « fantôme » (Chrome DevTools Protocol) : toucher, un doigt, deux doigts qui pincent,
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
  await wait(300);
  await fetch(`${API}/tasks`, { method: 'POST', headers: H, body: JSON.stringify([{ project_id: +pid, title: 'Tâche test', type: 'task', status: 'todo', position: 1 }]) });
  await p.goto(`${BASE}#/p/${pid}/taches`); await p.reload(); await p.waitForSelector('.task'); await wait(500);
  const url0 = p.url();
  // 1. retour avec une fiche ouverte : elle se ferme, on reste là
  await p.click('.task .t-main'); await p.waitForSelector('#sheet[open]');
  await p.goBack(); await wait(700);
  ok(await p.evaluate(() => !document.getElementById('sheet').open), 'retour : la fiche se ferme');
  ok(p.url() === url0, 'retour : on reste sur le même écran (pas de saut vers le résumé)', p.url());
  // 2. fiche fermée à la main : le retour suivant quitte vraiment l'écran (pas d'entrée fantôme)
  await p.click('.task .t-main'); await p.waitForSelector('#sheet[open]'); await p.click('#sheet [data-action="close"]'); await wait(700);
  ok(await p.evaluate(() => !document.getElementById('sheet').open), 'fiche fermée avec la croix');
  await p.goBack(); await wait(700);
  ok(!/\/taches$/.test(p.url()) || p.url() !== url0, 'retour après fermeture : on quitte l\'écran (une seule pression)', p.url());
  // 3. touche Échap
  await p.goto(url0); await p.waitForSelector('.task'); await wait(400);
  await p.click('.task .t-main'); await p.waitForSelector('#sheet[open]'); await p.keyboard.press('Escape'); await wait(700);
  ok(await p.evaluate(() => !document.getElementById('sheet').open), 'Échap ferme la fiche');
  console.log('ERREURS :', errors.filter((e) => !/Failed to load resource/.test(e)));
  console.log(fails ? `${fails} en échec` : 'Tout est vert'); await b.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('ÉCHEC', e.message.split('\n')[0]); process.exit(1); });
