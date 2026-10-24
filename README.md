# Tool-Proj

Petite app web pour suivre ses projets d'applications : avancement, tâches, **post-it d'idées** et équipe.
Installable sur téléphone (PWA), hébergée **gratuitement** : l'interface sur **GitHub Pages**, les comptes et les données sur **Supabase**.

## Fonctionnalités

- **Connexion sans mot de passe** : lien ou code reçu par email, ou **clé d'accès** (Face ID, empreinte, code de l'appareil). Chaque compte a un identifiant pour être ajouté aux projets.
- **Projets** avec icône, couleur, statut (Idée, En cours, En pause, Terminé), description, échéance et lien.
- **Rôles par projet** :
  - *Admin* : modifie le projet, ajoute ou retire des personnes, change les rôles, supprime le projet.
  - *Membre* : ajoute et gère les tâches et les post-it.
  - Un projet garde toujours au moins un admin.
- **Avancement** calculé à partir des tâches terminées (ou réglé à la main tant qu'il n'y a pas de tâches).
- **Tâches** en 3 colonnes (À faire, En cours, Fait), avec assignation. Glisser-déposer sur ordinateur, onglets sur mobile.
- **Mur de post-it** : post-it de couleur qu'on déplace librement (souris ou doigt), vue « Grille » triée par votes, 👍 pour voter, bouton « En faire une tâche ».
- **Temps réel** : les changements des autres apparaissent tout seuls.
- **Aperçu** : jauge d'avancement, idées les plus votées, activité récente. Thème clair / sombre / auto.

Les droits sont vérifiés **dans la base** (règles RLS de Postgres) : même en bricolant le navigateur, personne ne peut lire ou modifier un projet dont il n'est pas membre.

## Mise en ligne (≈ 10 minutes, gratuit)

### 1. Préparer Supabase

1. Dans ton projet Supabase (ou un nouveau), ouvre **SQL Editor → New query**.
2. Colle tout le contenu de [`supabase/schema.sql`](supabase/schema.sql) et clique **Run**.
   Le script ne touche qu'à ses propres tables. On peut le relancer sans perdre de données (utile après une mise à jour).
3. **Authentication → URL Configuration** :
   - *Site URL* : l'adresse GitHub Pages, par ex. `https://maxpyroli.github.io/Tool-Proj/`
   - ajoute la même adresse dans *Redirect URLs*.
   (C'est là que mènent les liens de confirmation envoyés par email.)
4. Récupère l'**URL du projet** et la **clé publique** (*publishable* ou *anon*) : bouton **Connect** en haut, ou **Project Settings → API Keys**.
   Ces deux valeurs sont faites pour être publiques. N'utilise **jamais** la clé *secret* / *service_role*.

### 2. Brancher GitHub Pages

1. Sur GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
2. **Settings → Secrets and variables → Actions → onglet Variables → New repository variable** :
   - `SUPABASE_URL` = l'URL du projet (`https://xxxx.supabase.co`)
   - `SUPABASE_KEY` = la clé publique
   - (optionnel) `ALLOW_SIGNUP` = `false` pour cacher « Créer un compte »
3. Pousse sur la branche par défaut (ou **Actions → Déployer sur GitHub Pages → Run workflow**).
   L'adresse s'affiche à la fin du déploiement.

Variante sans variables : remplis directement `public/config.js` et pousse.

### 3. Connexion sans mot de passe

**Emails (obligatoire)** : Supabase → **Authentication → Emails → Templates**.
Remplace le contenu des modèles **Magic link** et **Confirm signup** par ceux de [`supabase/templates/`](supabase/templates/)
(sujets proposés : « Ton lien de connexion à Tool-Proj » et « Bienvenue sur Tool-Proj »).
Ils sont en français et contiennent le lien **et un code**. Le code est indispensable pour l'app installée sur iPhone : là-bas, un lien s'ouvre dans Safari et pas dans l'app.

**Clés d'accès** : Supabase → **Authentication → Passkeys** → active-les avec :
- *Relying Party ID* : `maxpyroli.github.io`
- *Origins* : `https://maxpyroli.github.io`
- *Display name* : `Tool-Proj`

Ne change plus le *Relying Party ID* ensuite : les clés déjà créées ne marcheraient plus.

### 4. Créer ton compte

Ouvre l'adresse, entre ton email, clique sur le lien reçu (ou tape le code). Choisis ton nom et ton identifiant, puis accepte de créer une clé d'accès : les fois suivantes, tu entres en un geste.
Une clé d'accès est liée à un appareil (ou synchronisée par iCloud / Google). Sur un nouvel appareil, connecte-toi une fois par email puis ajoute une clé depuis **Mon compte**.

## Fermer les inscriptions

Une fois l'équipe inscrite :
- Supabase → **Authentication → Sign In / Providers** → décoche **Allow new users to sign up** ;
- pour ajouter quelqu'un ensuite : **Authentication → Users → Invite user** ;
- mets la variable `ALLOW_SIGNUP` à `false` pour adapter le texte de l'écran de connexion.

## Installer sur le téléphone

- **Android (Chrome)** : menu ⋮ → *Installer l'application*, ou bouton *Installer* dans « Mon compte ».
- **iPhone (Safari)** : bouton *Partager* → *Sur l'écran d'accueil*.

## Limites de l'offre gratuite

- Supabase **met en pause** un projet gratuit après une semaine sans aucune activité. Il suffit de le relancer depuis le tableau de bord, les données sont conservées.
- Le service d'email intégré à Supabase n'envoie que **quelques emails par heure** pour tout le projet. Avec les clés d'accès, on n'a besoin d'un email qu'à la première connexion sur chaque appareil, donc ça suffit pour une petite équipe. Sinon, branche un service d'envoi gratuit (Resend, Brevo…) dans **Authentication → Emails → SMTP Settings**.

## Développement

```bash
npm start            # sert public/ sur http://localhost:5173
npm run test:db      # teste schema.sql (droits, triggers) sur un Postgres local
```

`npm run test:db` utilise `DATABASE_URL` (par défaut `postgres://postgres@localhost:5432/postgres`) et crée puis supprime une base temporaire.

## Structure

```
public/                    l'app (HTML/CSS/JS, sans étape de build) : c'est ce qui est publié sur GitHub Pages
  app.js                   interface (écrans, post-it, tâches, équipe)
  data.js                  accès à Supabase (auth, données, temps réel)
  config.js                URL + clé publique Supabase
  sw.js, manifest…         installation sur téléphone
supabase/schema.sql        tables, règles de sécurité, triggers
supabase/templates/        emails de connexion en français (lien + code)
supabase/tests/            tests SQL des règles de sécurité
.github/workflows/pages.yml  déploiement automatique
```
