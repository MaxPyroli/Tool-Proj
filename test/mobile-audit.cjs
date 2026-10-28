// Audit mobile de Tool Proj : parcourt tous les écrans et fenêtres sur une taille de téléphone et signale
//   - ce qui dépasse de l'écran ou de sa carte, les champs de moins de 16 px (l'iPhone zoomerait),
//   - le défilement perdu à chaque redessin, la barre du bas avec le clavier ouvert.
// Il faut : un Supabase local qui tourne (npx supabase start), le schéma appliqué, le site servi sur
// http://localhost:8088/Tool-Proj/ (copie de public/ + config.js pointant vers le Supabase local), et Playwright.
// Usage : node test/mobile-audit.cjs <dossier-captures> <clé-secrète-locale> [largeur=390]
// Lance-le avec 390, 360 et 320 de large. Les deux alertes « défilement perdu » sont à lire à la main :
// si la page était tout en bas et que la liste raccourcit, c'est normal (faux positif connu).
const { chromium, devices } = require('playwright');
const [SP, SECRET, W] = process.argv.slice(2);
const WIDTH = Number(W || 390);
const BASE = 'http://localhost:8088/Tool-Proj/', MAIL = 'http://127.0.0.1:54324/api/v1', API = 'http://127.0.0.1:54321/rest/v1';
const H = { apikey: SECRET, Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
const log = (...a) => console.log(...a); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const problems = [];
async function audit(p, label) {
  const r = await p.evaluate(() => {
    const vw = innerWidth; const out = [];
    const sel = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
    const clipped = (el) => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o !== 'visible') return true; } return false; };
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      if (r.right > vw + 0.5 && !clipped(el)) out.push(sel(el) + ' → right ' + Math.round(r.right));
    }
    const escaped = [];
    for (const card of document.querySelectorAll('.panel, .pcard, .epic-card, .member, .group, .col, .sheet-body')) {
      const cr = card.getBoundingClientRect(); if (!cr.width) continue;
      for (const el of card.querySelectorAll('*')) { const r = el.getBoundingClientRect(); if (r.width && r.right > cr.right + 1 && !clipped(el) && getComputedStyle(card).overflowX === 'visible') { escaped.push(sel(el) + ' sort de ' + sel(card) + ' (+' + Math.round(r.right - cr.right) + 'px)'); break; } }
    }
    const inner = [...document.querySelectorAll('.sheet-body, .panel, .page, .member')].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible' || (e.classList.contains('sheet-body') && e.scrollWidth > e.clientWidth + 1)).map((e) => sel(e) + ' scroll ' + e.scrollWidth + '>' + e.clientWidth);
    const small = [...document.querySelectorAll('input:not([type=range]):not([type=color]):not([type=hidden]), select, textarea')].filter((e) => e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => sel(e) + ' ' + getComputedStyle(e).fontSize);
    return { doc: document.documentElement.scrollWidth - vw, offenders: [...new Set(out)].slice(0, 6), inner, small, escaped: [...new Set(escaped)].slice(0, 5) };
  });
  if (r.doc > 0 || r.offenders.length || r.inner.length || r.small.length || r.escaped.length) { problems.push(label); log(`✗ ${label}`, JSON.stringify(r)); } else log(`✓ ${label}`);
}
(async () => {
  const email = `mob${Date.now()}@ex.fr`;
  await fetch('http://127.0.0.1:54321/auth/v1/admin/users', { method: 'POST', headers: H, body: JSON.stringify({ email, email_confirm: true, user_metadata: { onboarded: true, username: 'mo' + Date.now() % 100000, display_name: 'Mobile Tester' } }) });
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: WIDTH, height: 780 } });
  const p = await ctx.newPage(); globalThis.__p = p;
  p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await p.goto(BASE); await p.fill('#auth-email', email); await p.click('form[data-form="email-link"] button[type=submit]'); await p.waitForSelector('#auth-code');
  let code; for (let i = 0; i < 40 && !code; i++) { const l = await (await fetch(`${MAIL}/search?query=${encodeURIComponent('to:' + email)}`)).json(); if (l.messages?.length) code = (await (await fetch(`${MAIL}/message/${l.messages[0].ID}`)).json()).Text.match(/\b\d{6,10}\b/)[0]; else await wait(400); }
  await audit(p, 'connexion (code)');
  await p.fill('#auth-code', code); await p.click('form[data-form="email-code"] button[type=submit]'); await p.waitForSelector('.list-head');
  await p.click('.fab'); await p.fill('#pf-name', 'Application de covoiturage entre collègues du site'); await p.fill('#pf-desc', 'Mettre en relation les salariés pour partager les trajets domicile-travail, avec un système de points et des notifications.'); await audit(p, 'nouveau projet (formulaire)'); await p.click('#sheet button[type=submit]'); await p.waitForSelector('.ring');
  const pid = p.url().match(/#\/p\/(\d+)/)[1];
  const uid = (await (await fetch(`${API}/profiles?select=id&display_name=eq.Mobile%20Tester&order=created_at.desc&limit=1`, { headers: H })).json())[0].id;
  const ep = await (await fetch(`${API}/epics`, { method: 'POST', headers: H, body: JSON.stringify([{ project_id: +pid, title: 'Mode hors-ligne avec synchronisation automatique au retour du réseau', description: 'Pouvoir consulter ses trajets sans réseau.\n- cache local\n- synchro', horizon: 'now' }, { project_id: +pid, title: 'Paiement', description: '', horizon: 'next' }]) })).json();
  const mk = (title, type, status, priority = 'normal', epic = null) => ({ project_id: +pid, title, type, status, priority, epic_id: epic, description: 'Détails', position: Math.random() * 100, assignee_id: uid });
  const many = Array.from({ length: 14 }, (_, i) => mk(`Tâche numéro ${i + 1} avec un titre assez long pour passer à la ligne sur petit écran`, ['task', 'bug', 'idea', 'improvement'][i % 4], i % 5 === 0 ? 'done' : 'todo', 'normal', i % 3 ? ep[0].id : null));
  await fetch(`${API}/tasks`, { method: 'POST', headers: H, body: JSON.stringify(many) });
  await fetch(`${API}/project_links`, { method: 'POST', headers: H, body: JSON.stringify([{ project_id: +pid, label: 'Dépôt de code source principal', url: 'https://github.com/MaxPyroli/Tool-Proj/tree/claude/app-project-tracker-0h71xn/very/long/path' }, { project_id: +pid, label: '', url: 'https://supabase.com/dashboard/project/rsstlrtbyhuixkhpynux/editor' }]) });
  await fetch(`${API}/notes`, { method: 'POST', headers: H, body: JSON.stringify(['Idée un', 'Une idée avec un texte beaucoup plus long pour voir comment ça se comporte', 'Trois'].map((text, i) => ({ project_id: +pid, text, color: ['yellow', 'pink', 'blue'][i], x: 40 + i * 220, y: 60 })) ) });
  await p.reload(); await p.waitForSelector('.ring');
  await audit(p, 'liste des projets'); await p.goto(`${BASE}#/`); await p.waitForSelector('.pcard'); await audit(p, 'liste des projets');
  await p.goto(`${BASE}#/p/${pid}`); await p.waitForSelector('.ring'); await audit(p, 'aperçu');
  for (const [view, sel] of [['board', '[data-drop-status]'], ['roadmap', '.epic-card']]) {
    await p.goto(`${BASE}#/p/${pid}/taches`); await p.waitForSelector('.task-tools'); await p.click(`[data-action="task-view"][data-v="${view}"]`); await p.waitForSelector(sel); await audit(p, `tâches · ${view}`);
  }
  await p.goto(`${BASE}#/p/${pid}/idees`); await p.waitForSelector('.board-tools'); await p.click('[data-action="board-view"][data-v="grid"]'); await p.waitForSelector('.note-grid .note'); await audit(p, 'post-it · grille');
  await p.click('[data-action="board-view"][data-v="wall"]'); await p.waitForSelector('.board .note'); await audit(p, 'post-it · mur');
  await p.goto(`${BASE}#/p/${pid}/equipe`); await p.waitForSelector('.member'); await audit(p, 'équipe');
  const sheets = [
    ['mon compte', async () => { await p.click('[data-action="account"]'); await p.waitForSelector('.avatar-picker'); }],
    ['paramètres du projet', async () => { await p.goto(`${BASE}#/p/${pid}`); await p.waitForSelector('.ring'); await p.click('[data-action="edit-project"]'); await p.waitForSelector('.tc-row'); }],
    ['liens du projet', async () => { await p.goto(`${BASE}#/p/${pid}`); await p.waitForSelector('.ring'); await p.click('[data-action="manage-links"]'); await p.waitForSelector('#lk-url'); }],
    ['fiche tâche', async () => { await p.goto(`${BASE}#/p/${pid}/taches`); await p.waitForSelector('.task-tools'); await p.click('[data-action="task-view"][data-v="board"]'); await p.waitForSelector('.task'); await p.click('.task >> nth=0'); await p.waitForSelector('#tf-title'); }],
    ['fiche chantier', async () => { await p.goto(`${BASE}#/p/${pid}/taches`); await p.waitForSelector('.task-tools'); await p.click('[data-action="task-view"][data-v="roadmap"]'); await p.click('.epic-card >> nth=0'); await p.waitForSelector('#ef-title'); }],
    ['choix « ajouter »', async () => { await p.goto(`${BASE}#/p/${pid}/taches`); await p.waitForSelector('.task-tools'); await p.click('[data-action="task-view"][data-v="board"]'); await p.click('.fab'); await p.waitForSelector('.chooser'); }],
    ['fiche post-it', async () => { await p.goto(`${BASE}#/p/${pid}/idees`); await p.waitForSelector('.board-tools'); await p.click('.note >> nth=0'); await p.waitForSelector('#nf-text'); }],
  ];
  for (const [name, open] of sheets) { await open(); await wait(350); await audit(p, `fenêtre · ${name}`); await p.keyboard.press('Escape'); await wait(200); if (await p.locator('dialog[open]').count()) await p.evaluate(() => document.getElementById('sheet').close()); }


  // ---- projet vide (aucun lien, aucune tâche) : c'est ce que voit un nouvel utilisateur ----
  log('— projet vide —');
  await p.goto(`${BASE}#/`); await p.waitForSelector('.pcard'); await p.click('.fab'); await p.fill('#pf-name', 'Tool Proj'); await p.fill('#pf-desc', 'App de suivi de projets'); await p.click('#sheet button[type=submit]'); await p.waitForSelector('.ring');
  await audit(p, 'aperçu (projet vide)');
  await p.click('a.tab >> nth=1'); await p.waitForSelector('.task-tools'); await audit(p, 'tâches (projet vide)');
  await p.click('a.tab >> nth=2'); await p.waitForSelector('.board-tools'); await audit(p, 'post-it (projet vide)');
  await p.click('a.tab >> nth=3'); await p.waitForSelector('.member'); await audit(p, 'équipe (projet vide)');
  // ---- barre de navigation et défilement ----
  log('— barre du bas —');
  await p.goto(`${BASE}#/p/${pid}/taches`); await p.waitForSelector('.task-tools'); await p.click('[data-action="task-view"][data-v="board"]'); await p.waitForSelector('[data-drop-status]');
  const bar = () => p.evaluate(() => { const t = document.querySelector('.tabs'); if (!t) return null; const r = t.getBoundingClientRect(); return { bottom: Math.round(r.bottom), vis: getComputedStyle(t).display !== 'none', h: innerHeight }; });
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(300);
  const y0 = await p.evaluate(() => Math.round(scrollY)); const b0 = await bar();
  await p.evaluate(() => { const c = document.querySelectorAll('.page .check'); c[c.length - 1].click(); }); await wait(1200);
  const y1 = await p.evaluate(() => Math.round(scrollY)); const b1 = await bar();
  log(`défilement avant/après avoir coché une tâche : ${y0} → ${y1}`, y1 < y0 - 40 ? '✗ remonte en haut' : '✓');
  log('barre avant/après :', JSON.stringify(b0), JSON.stringify(b1), b1 && b1.bottom === b1.h ? '✓ collée en bas' : '✗');
  if (y1 < y0 - 40) problems.push('défilement perdu');
  // mise à jour reçue d'un autre appareil (temps réel)
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await wait(300); const y2 = await p.evaluate(() => Math.round(scrollY));
  await fetch(`${API}/tasks`, { method: 'POST', headers: H, body: JSON.stringify([mk('Ajoutée par un autre appareil', 'task', 'todo')]) }); await wait(2500);
  const y3 = await p.evaluate(() => Math.round(scrollY)); log(`défilement après une mise à jour reçue : ${y2} → ${y3}`, y3 < y2 - 40 ? '✗ remonte en haut' : '✓');
  if (y3 < y2 - 40) problems.push('défilement perdu (temps réel)');
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(200);
  await p.click('#task-new'); await wait(300);
  const b2 = await bar(); log('barre quand le clavier est ouvert (champ actif) :', JSON.stringify(b2), b2?.vis ? '✗ reste affichée (elle saute au-dessus du clavier)' : '✓ masquée');
  if (b2?.vis) problems.push('barre visible avec le clavier');
  console.log('\nRÉSUMÉ', WIDTH, 'px :', problems.length ? problems : 'aucun problème', '| erreurs JS :', errors.filter((e) => !/Failed to load resource/.test(e)));
  await b.close();
})().catch(async (e) => { console.error('ÉCHEC', e.message.split('\n')[0]); try { const pg = globalThis.__p; if (pg) { await pg.screenshot({ path: process.argv[2] + '/mobile-fail.png' }); console.error('URL :', pg.url(), '| texte :', (await pg.innerText('body')).slice(0, 300).replace(/\n+/g, ' | ')); } } catch {} process.exit(1); });
