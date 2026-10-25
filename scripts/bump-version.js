// Change le numéro de version partout (package.json, affichage dans « Mon compte », cache hors-ligne).
// Le numéro de build, lui, est ajouté automatiquement à chaque mise en ligne (voir .github/workflows/pages.yml).
// Usage : npm run bump -- patch | minor | major | 0.10.0
import fs from 'node:fs';

const arg = process.argv[2];
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const previous = pkg.version;
let [major, minor, patch] = previous.split('.').map(Number);

if (arg === 'patch') patch += 1;
else if (arg === 'minor') { minor += 1; patch = 0; }
else if (arg === 'major') { major += 1; minor = 0; patch = 0; }
else if (/^\d+\.\d+\.\d+$/.test(arg || '')) [major, minor, patch] = arg.split('.').map(Number);
else { console.error('Usage : npm run bump -- patch | minor | major | x.y.z'); process.exit(1); }

const next = `${major}.${minor}.${patch}`;
const edit = (file, re, to) => {
  const src = fs.readFileSync(file, 'utf8');
  if (!re.test(src)) throw new Error(`${file} : repère introuvable`);
  fs.writeFileSync(file, src.replace(re, to));
};
pkg.version = next;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
edit('public/app.js', /const APP_VERSION = '[^']*';/, `const APP_VERSION = '${next}';`);
edit('public/sw.js', /const VERSION = '[^']*';/, `const VERSION = '${next}';`);
console.log(`Version ${previous} → ${next}`);
