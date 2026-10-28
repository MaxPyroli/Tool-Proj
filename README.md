# Tool Proj

Petite app web pour suivre ses projets d'applications : avancement, tâches, **post-it d'idées** et équipe.
Installable sur téléphone (PWA), hébergée **gratuitement** : l'interface sur **GitHub Pages**, les comptes et les données sur **Supabase**.

## Fonctionnalités

- **Connexion sans mot de passe** : lien ou code reçu par email, ou **clé d'accès** (Face ID, empreinte, code de l'appareil). Chaque compte a un identifiant pour être ajouté aux projets.
- **Projets** avec icône, couleur, statut (Idée, En cours, En pause, Terminé), description, échéance et lien.
- **Rôles par projet** :
  - *Admin* : modifie le projet, ajoute ou retire des personnes, change les rôles, supprime le projet.
  - *Membre* : ajoute et gère les tâches et les post-it.
  - Un projet garde toujours au moins un admin.
- **Texte** : « - » devient « • », Entrée continue les listes (« • », « 1. »), et un markdown léger : `**gras**`, `*italique*`, `__souligné__` (post-it, descriptions).
- **Avancement** estimé par les admins (curseur dans l'aperçu), plus un indicateur automatique pour les chantiers « Maintenant ».
- **Avatars** : chacun choisit son emoji et sa couleur (ou garde ses initiales).
- **Tâches organisées** :
  - **grands chantiers** pour les grosses idées (titre, longue description, avancement propre), rangés en *Maintenant / Ensuite / Plus tard / Terminé* ;
  - **éléments** de type *Tâche*, *Bug*, *Idée* ou *Amélioration*, chacun avec sa couleur, avec titre, description, statut, priorité (haute / normale / basse), personne assignée, rattachés ou non à un chantier ;
  - tâche rapide avec choix du type (le brouillon est gardé entre les onglets), nouvelles tâches assignées à leur créateur par défaut ;
  - deux affichages : **Feuille de route** (les chantiers, en deux modes « En cours » / « Plus tard »), **Tableau** (colonnes À faire / En cours / Fait, ou « par chantier ») : chaque chantier est un grand post-it avec ses tâches collées dessus. Glisser-déposer sur ordinateur.
  - **couleurs par projet** : un seul style (Papier, de petits papiers collés) ; les admins changent la couleur de chaque type dans les paramètres du projet ;
- **Plan de travail de post-it** pour le brouillon : un grand mur qu'on zoome (pincement, Ctrl + molette) et qu'on parcourt en glissant, avec « Tout voir », une mini-carte du mur entier, le plein écran, « Ranger » (par couleur, votes ou date, avec annulation) et un double-clic pour poser un post-it où on veut. Notes de couleur qu'on déplace librement (souris ou doigt), vue « Grille » triée par votes, 👍 pour voter, et « Transformer en… » chantier, tâche, bug ou amélioration quand l'idée est mûre.
- **Liens du projet** : autant de liens que voulu (GitHub, Supabase, conversation Claude, maquette, site, store…), reconnus par leur adresse avec leur icône et affichés en boutons dans l'aperçu. Les admins les gèrent, tous les membres les voient.
- **Notifications** (Web Push) : prévenu quand une tâche t'est assignée par quelqu'un d'autre ou quand on t'ajoute à un projet. Activation par appareil dans *Mon compte → Notifications* (iPhone : app installée, iOS 16.4 ou plus). Mise en place : voir « Notifications » plus bas.
- **Images dans les tâches** : colle une capture ou touche l'icône image dans la description (8 au plus, réduites automatiquement), visionneuse plein écran ; stockées dans le stockage privé de Supabase.
- **Accès pour Claude** (connecteur MCP) : *Mon compte → Accès pour Claude* crée une adresse personnelle à coller dans Claude (réglages → connecteurs, ou `claude mcp add --transport http`). Claude lit les projets et, si la personne l'autorise, crée ou modifie tâches, post-it et chantiers, avec ses seuls droits ; aucune suppression. Révocable à tout moment. Mise en place : voir « Accès pour Claude » plus bas.
- **Temps réel** : les changements des autres apparaissent tout seuls.
- **Aperçu** : jauge d'avancement, chantiers en cours, bugs ouverts, idées les plus votées, activité récente (repliée par défaut, elle se vide toute seule : 20 événements au plus, 14 jours). Thème clair / sombre / auto.

Les droits sont vérifiés **dans la base** (règles RLS de Postgres) : même en bricolant le navigateur, personne ne peut lire ou modifier un projet dont il n'est pas membre.

## Mise en ligne (≈ 10 minutes, gratuit)

### 1. Préparer Supabase

1. Dans ton projet Supabase (ou un nouveau), ouvre **SQL Editor → New query**.
2. Colle tout le contenu de [`supabase/schema.sql`](supabase/schema.sql) et clique **Run**.
   Le script ne touche qu'à ses propres tables. On peut le relancer sans perdre de données (utile après une mise à jour).
3. **Authentication → URL Configuration** :
   - *Site URL* : l'adresse du site, ici `https://toolproj.panamedev.fr/` (ou l'adresse GitHub Pages `https://<compte>.github.io/Tool-Proj/` si tu n'as pas de domaine)
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
(sujets proposés : « Ton lien de connexion à Tool Proj » et « Bienvenue sur Tool Proj »).
Ils sont en français et contiennent le lien **et un code**. Le code est indispensable pour l'app installée sur iPhone : là-bas, un lien s'ouvre dans Safari et pas dans l'app.

**Clés d'accès** : Supabase → **Authentication → Passkeys** → active-les avec :
- *Relying Party ID* : `panamedev.fr` (le domaine, pour que toutes les apps en sous-domaine partagent le réglage)
- *Origins* : `https://toolproj.panamedev.fr`
- *Display name* : `Tool Proj`

Ne change plus le *Relying Party ID* ensuite : les clés déjà créées ne marcheraient plus (c'est ce qui s'est passé au passage de GitHub Pages à toolproj.panamedev.fr : chacun recrée sa clé).

### 4. Créer ton compte

Ouvre l'adresse, entre ton email, clique sur le lien reçu (ou tape le code). Choisis ton nom et ton identifiant, puis accepte de créer une clé d'accès : les fois suivantes, tu entres en un geste.
Une clé d'accès est liée à un appareil (ou synchronisée par iCloud / Google). Sur un nouvel appareil, connecte-toi une fois par email puis ajoute une clé depuis **Mon compte**.

## Inscription sur invitation uniquement

1. Supabase → **Authentication → Sign In / Providers** → décoche **Allow new users to sign up**.
   Laisse le fournisseur **Email** activé : il sert à la connexion de ceux qui ont déjà un compte.
2. Supabase → **Authentication → Emails → Templates → Invite user** : colle [`supabase/templates/invite.html`](supabase/templates/invite.html) (sujet : « Tu es invité sur Tool Proj »).
3. GitHub → variable `ALLOW_SIGNUP` = `false`, puis relance le déploiement : l'écran de connexion dira « Demande à un admin de t'inviter ».

Pour inviter quelqu'un : **Authentication → Users → Add user → Send invitation**, entre son email.
La personne clique sur le lien reçu, choisit son nom et son identifiant, crée sa clé d'accès. Ajoute-la ensuite à tes projets depuis l'onglet **Équipe** avec son identifiant.

## Notifications (mise en place, une seule fois)

1. Relancer [`supabase/schema.sql`](supabase/schema.sql) (tables `push_subscriptions` et `private.push_config`, déclencheurs).
2. Déployer la fonction Edge [`supabase/functions/send-push`](supabase/functions/send-push/index.ts) **sans vérification JWT** (`supabase functions deploy send-push --no-verify-jwt`).
3. Générer des clés VAPID (`npx web-push generate-vapid-keys`) et remplir **une fois**, dans *SQL Editor*, la table `private.push_config` : `url` (adresse de la fonction), `secret` (une longue chaîne au hasard), `vapid_public`, `vapid_private`, `subject` (l'adresse du site). Ne jamais mettre ces valeurs dans le dépôt.
4. Mettre la clé **publique** dans `VAPID_PUBLIC_KEY` (`public/app.js`).

Sans cette configuration, rien ne casse : les notifications restent simplement muettes.

## Accès pour Claude (mise en place, une seule fois)

1. Relancer [`supabase/schema.sql`](supabase/schema.sql) (table `claude_tokens` et fonction `mcp_call`).
2. Déployer la fonction Edge [`supabase/functions/mcp`](supabase/functions/mcp/index.ts) **sans vérification JWT** (`supabase functions deploy mcp --no-verify-jwt`) : la clé personnelle contenue dans l'adresse fait foi.

Rien d'autre à configurer : la clé est fabriquée dans le navigateur de chacun et seule son empreinte est enregistrée. Dans Claude, choisir **Aucune connexion** (pas d'OAuth, pas d'en-tête) : la clé est dans l'adresse.

## Mettre à jour

Quand une nouvelle version touche la base (c'est indiqué dans le commit), relance tout [`supabase/schema.sql`](supabase/schema.sql) dans **SQL Editor**.
Le script ajoute ce qui manque sans rien effacer. Si tu oublies, l'app affiche « La base Supabase n'est pas à jour ».

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
npm run bump -- patch   # change la version partout (patch, minor, major ou x.y.z)
node test/mobile-audit.cjs <dossier> <clé-secrète-locale> 390   # audit mobile (voir l'en-tête du fichier)
```

`npm run test:db` utilise `DATABASE_URL` (par défaut `postgres://postgres@localhost:5432/postgres`) et crée puis supprime une base temporaire.

## Versions

Numérotation `0.x.y` (voir [`public/changelog.md`](public/changelog.md), aussi affiché dans l'app : *Mon compte → Nouveautés*) : `npm run bump -- patch` par défaut (petits pas) ; le chiffre du milieu ne change que sur décision.
Le **numéro de build** est ajouté tout seul à chaque mise en ligne : on le voit avec la version dans *Mon compte* (« version 0.9.0 (build 27) »).
Les règles de travail et les vérifications à refaire à chaque ajout sont dans [`CLAUDE.md`](CLAUDE.md).

## Structure

```
public/                    l'app (HTML/CSS/JS, sans étape de build) : c'est ce qui est publié sur GitHub Pages
  app.js                   interface (écrans, post-it, tâches, équipe)
  data.js                  accès à Supabase (auth, données, temps réel)
  config.js                URL + clé publique Supabase
  sw.js, manifest…         installation sur téléphone
  fonts/, vendor/          polices et bibliothèque Supabase, copiées dans l'app (aucune ressource externe)
  confidentialite.html     politique de confidentialité
supabase/schema.sql        tables, règles de sécurité, triggers
supabase/templates/        emails de connexion en français (lien + code)
supabase/tests/            tests SQL des règles de sécurité
.github/workflows/pages.yml  déploiement automatique
```

© 2026 Paname Dev · Codé par Claude · contact@panamedev.fr
