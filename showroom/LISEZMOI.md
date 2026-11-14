# Dossier `showroom/` : la vitrine de l'app sur panamedev.fr

Ce dossier est lu tel quel par le site vitrine (https://panamedev.fr), au moins une fois par jour. **Rien à faire d'autre que tenir ces fichiers à jour** : le site se met à jour tout seul. Ce dossier n'est pas publié avec l'app.

| Fichier | Contenu |
|---|---|
| `app.json` | La fiche : nom, accroche, couleurs, fonctionnalités, liens (site, boutique, téléchargement), pages légales |
| `icon.png` | L'icône de l'app, 512 × 512, coins arrondis transparents (moins de 1 Mo) |
| `shots/` | Les captures d'écran, à lister dans `shots` de la fiche |

Règles de la fiche (détail : `CHARTE.md`, section 13, dépôt `MaxPyroli/showroom`) :
- `slug` doit rester `tool-proj`. Couleurs au format `#rrggbb`. `accent` = la couleur de l'app dans la palette de la charte.
- `format` : `phone` (mobile), `window` (bureau) ou `duo` (bureau et mobile).
- `links` : chaque lien a un `kind` (`web`, `play`, `appstore`, `windows`, `download`, `project`) et une `url` en `https://`. Le texte du bouton est choisi selon le `kind` (ex. « Google Play », « Télécharger pour Windows »), ou donné par `label`.
- Captures : `01-light.jpg` et `01-dark.jpg` (vue d'ensemble), puis `02-…` pour la 2ᵉ fonctionnalité, etc. Format `duo` : `01-desktop-light.jpg`, `01-desktop-dark.jpg`, `01-mobile-light.jpg`, `01-mobile-dark.jpg`. JPG, PNG ou WebP, moins de 2,5 Mo chacune. Les ajouter dans `shots/` **et** dans la liste `shots` de `app.json`.
- Si la fiche est invalide, le site garde la version précédente et ne casse pas.
