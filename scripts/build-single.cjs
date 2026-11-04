// Fabrique UN SEUL fichier HTML autonome de l'app (pour la tester en double-cliquant dessus sur un PC, sans rien installer ni publier).
// Usage : node scripts/build-single.cjs --demo [--out chemin.html]   → version de TEST : fausse base de données dans le navigateur (aucune connexion, données fictives)
//         node scripts/build-single.cjs [--url https://xxx.supabase.co --key sb_publishable_…] [--out chemin.html]   → même fichier branché sur une vraie base
// Sans --url/--key : prend ceux du site en ligne (valeurs publiques). esbuild est téléchargé à la demande (npm i esbuild dans un dossier temporaire).
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : null; };
const root = path.join(__dirname, '..'), pub = path.join(root, 'public');
const out = arg('out') || path.join(root, 'dist', 'Tool-Proj-test.html');
const demo = process.argv.includes('--demo');
let url = arg('url'), key = arg('key');
(async () => {
  if (demo) { url = 'https://demo.invalid'; key = 'demo'; }
  if (!url || !key) {
    const txt = await (await fetch('https://toolproj.panamedev.fr/config.js')).text();
    url = url || txt.match(/"supabaseUrl":\s*"([^"]+)"/)[1]; key = key || txt.match(/"supabaseKey":\s*"([^"]+)"/)[1];
  }
  let esbuild;
  try { esbuild = require('esbuild'); } catch {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'esb-')); cp.execSync('npm init -y && npm i esbuild@0.24.0', { cwd: tmp, stdio: 'ignore' }); esbuild = require(path.join(tmp, 'node_modules', 'esbuild'));
  }
  const svgUri = `data:image/svg+xml;base64,${fs.readFileSync(path.join(pub, 'icons', 'icon.svg')).toString('base64')}`;
  const js = (await esbuild.build({ entryPoints: [path.join(pub, 'app.js')], bundle: true, format: 'iife', target: 'es2020', write: false, legalComments: 'none',
    plugins: demo ? [{ name: 'fausse-base', setup: (b) => b.onResolve({ filter: /vendor\/supabase-js\.js$/ }, () => ({ path: path.join(__dirname, 'mock-supabase.js') })) }] : [] })).outputFiles[0].text.split('icons/icon.svg').join(svgUri); // le logo est intégré au fichier
  let css = fs.readFileSync(path.join(pub, 'styles.css'), 'utf8');
  css = css.replace(/url\((['"]?)fonts\/([^)'"]+\.woff2)\1\)/g, (_, _q, f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(pub, 'fonts', f)).toString('base64')})`);
  const embed = { 'nouveautes.json': fs.readFileSync(path.join(pub, 'nouveautes.json'), 'utf8'), 'changelog.md': fs.readFileSync(path.join(pub, 'changelog.md'), 'utf8') };
  let html = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');
  html = html.replace(/\s*<link rel="(preload|manifest|apple-touch-icon|icon)"[^>]*>/g, '')
    .replace('<link rel="stylesheet" href="styles.css">', () => `<style>${css}\n.test-banner{position:fixed;z-index:99999;right:0;top:0;padding:3px 10px;background:#b45309;color:#fff;font:700 11px system-ui;letter-spacing:.08em;border-bottom-left-radius:0;${demo ? 'cursor:pointer' : 'pointer-events:none'}}</style>`)
    .replace('<body>', () => `<body>
<script>/* si quelque chose casse, on l'écrit à l'écran (pour pouvoir le photographier) */
(function(){var box;function show(t){if(!box){box=document.createElement('pre');box.style.cssText='position:fixed;z-index:100000;left:0;right:0;bottom:0;max-height:45vh;overflow:auto;margin:0;padding:10px 12px;background:#7f1d1d;color:#fff;font:12px/1.4 ui-monospace,monospace;white-space:pre-wrap';box.onclick=function(){box.remove();box=null};document.body.appendChild(box);}box.textContent+=t+'\\n';}
window.addEventListener('error',function(e){show('Erreur : '+e.message+(e.filename?' ('+String(e.filename).split('/').pop()+':'+e.lineno+')':''))});
window.addEventListener('unhandledrejection',function(e){show('Erreur : '+(e.reason&&e.reason.message||e.reason))});
setTimeout(function(){var a=document.getElementById('app');if(a&&!a.children.length)show("L'app ne s'est pas affichée. Ouvre ce fichier en double-cliquant dessus (Chrome, Edge ou Firefox), pas depuis un aperçu intégré.")},4000);})();
</script>`)
    .replace('<script src="config.js"></script>', () => `<script>window.TOOL_PROJ_CONFIG=${JSON.stringify({ supabaseUrl: url, supabaseKey: key, allowSignup: false })};
const __E=${JSON.stringify(embed)};const __f=window.fetch.bind(window);window.fetch=(u,o)=>{const n=String(u).split('?')[0];return __E[n]!==undefined?Promise.resolve(new Response(__E[n])):__f(u,o);};</script>`)
    .replace('<script type="module" src="app.js"></script>', () => `<div class="test-banner"${demo ? ' title="Toucher pour remettre les données de test à zéro"' : ''}>${demo ? 'VERSION DE TEST · DONNÉES FICTIVES' : 'VERSION DE TEST'}</div>${demo ? `<script>document.querySelector('.test-banner').onclick=()=>{if(confirm('Remettre les données de test à zéro ?')){localStorage.removeItem('tp-demo-db-v1');localStorage.removeItem('tp-demo-session');location.reload();}};</script>` : ''}<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`);
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, html);
  console.log(`OK : ${out} (${Math.round(html.length / 1024)} Ko) → ${url}`);
})().catch((e) => { console.error('ÉCHEC', e.message); process.exit(1); });
