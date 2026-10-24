# Tool-Proj

Petite app web pour suivre ses projets d'applications : avancement, tâches, **post-it d'idées** et équipe.
Installable sur téléphone (PWA) et pensée pour le mobile.

## Fonctionnalités

- **Comptes personnels** (identifiant + mot de passe). Le premier compte créé devient administrateur de l'instance.
- **Projets** avec icône, couleur, statut (Idée, En cours, En pause, Terminé), description, échéance et lien (dépôt, maquette, store…).
- **Rôles par projet** :
  - *Admin* : modifie le projet, ajoute/retire des personnes, change les rôles, supprime le projet.
  - *Membre* : ajoute et gère les tâches et les post-it.
  - Un projet garde toujours au moins un admin.
- **Avancement** calculé à partir des tâches terminées (ou réglé à la main tant qu'il n'y a pas de tâches).
- **Tâches** en 3 colonnes (À faire, En cours, Fait), avec assignation. Glisser-déposer sur ordinateur, onglets sur mobile.
- **Mur de post-it** : post-it de couleur qu'on déplace librement (souris ou doigt), vue « Grille » triée par votes, 👍 pour voter, et bouton « En faire une tâche ».
- **Aperçu** : jauge d'avancement, idées les plus votées, activité récente.
- Synchronisation automatique toutes les 15 s quand plusieurs personnes travaillent sur le même projet.
- Thème clair / sombre / auto.

## Lancer en local

Il faut **Node.js 22.13 ou plus** (la base SQLite est intégrée à Node, rien d'autre à installer).

```bash
npm install
npm start          # http://localhost:3000
npm test           # tests de l'API
```

Les données sont dans `data/tool-proj.db` (un seul fichier, facile à sauvegarder).

## Configuration

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `3000` | Port HTTP |
| `DB_FILE` | `data/tool-proj.db` | Fichier de base de données |
| `ALLOW_REGISTRATION` | `true` | `false` pour fermer les inscriptions (l'admin crée alors les comptes depuis « Mon compte ») |
| `NODE_ENV` | — | `production` pour des cookies `Secure` (à utiliser derrière HTTPS) |

## Déployer

Avec Docker :

```bash
docker build -t tool-proj .
docker run -d -p 3000:3000 -v tool-proj-data:/data tool-proj
```

L'app marche sur n'importe quel hébergeur qui fait tourner Node (Railway, Render, Fly.io, un VPS…) à condition d'avoir un **disque persistant** pour le fichier SQLite.
Pour pouvoir l'**installer sur téléphone**, elle doit être servie en **HTTPS**.

## Installer sur le téléphone

- **Android (Chrome)** : menu ⋮ → *Installer l'application*, ou bouton *Installer* dans « Mon compte ».
- **iPhone (Safari)** : bouton *Partager* → *Sur l'écran d'accueil*.

## Structure

```
server.js        démarrage
app.js           API (Express) : auth, projets, membres, tâches, post-it
db.js            schéma SQLite
public/          interface (HTML/CSS/JS sans étape de build), manifeste et service worker
test/            tests de l'API (node:test)
```
