# Intégrer le formulaire de signalements de Tool Proj

Les utilisateurs de ton app (ou de ton site) envoient un **bug, une idée, une suggestion ou une question**, avec une capture d'écran et un e-mail s'ils veulent. Pas de compte. Tout arrive dans **Aperçu → Signalements** de ton projet.

## 1. Activer (30 secondes)

1. Ouvre le projet dans Tool Proj (bêta pour l'instant), onglet **Aperçu**.
2. Carte **Signalements** → **Activer le formulaire**.
3. Copie le **lien** (ou montre le **QR code**). Il ressemble à :
   `https://toolproj.panamedev.fr/ticket.html?p=LE_JETON_SECRET`

Le lien est secret : qui l'a peut envoyer un ticket. Si tu l'as trop partagé : **Renouveler le lien** (l'ancien meurt tout de suite). **Couper** désactive tout.

## 2. Régler le lien (facultatif)

Ajoute ces bouts à la fin du lien :

| Ajout | Effet |
|---|---|
| `&type=bug` | présélectionne le type (`bug`, `idea`, `suggestion`, `question`) |
| `&embed=1` | enlève le pied de page et le fond (pour une WebView ou une iframe) |
| `&theme=dark` ou `&theme=light` | force le thème (sinon : celui du téléphone) |

Exemple : `…/ticket.html?p=LE_JETON&embed=1&type=bug`

## 3. Dans une app Android

### Option A — le plus simple : ouvrir le lien

```kotlin
val url = "https://toolproj.panamedev.fr/ticket.html?p=LE_JETON"
startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
```

Un bouton « Signaler un problème » ouvre le navigateur. Rien d'autre à faire.

### Option B — dans l'app, avec une WebView

```kotlin
val web = findViewById<WebView>(R.id.web)
web.settings.javaScriptEnabled = true
web.settings.domStorageEnabled = true

// L'app est prévenue quand le ticket est parti (facultatif)
web.addJavascriptInterface(object {
    @JavascriptInterface fun onSent(id: String) { runOnUiThread { /* ex. fermer l'écran, afficher « Merci » */ } }
}, "ToolProjTicket")

// Pour joindre une capture : la WebView doit savoir ouvrir la galerie
web.webChromeClient = object : WebChromeClient() {
    override fun onShowFileChooser(w: WebView, cb: ValueCallback<Array<Uri>>, p: FileChooserParams): Boolean {
        filePathCallback = cb                       // à garder dans un champ de ton Activity
        launcher.launch(p.createIntent())           // registerForActivityResult(StartActivityForResult())
        return true
    }
}
web.loadUrl("https://toolproj.panamedev.fr/ticket.html?p=LE_JETON&embed=1")
```

Sans `onShowFileChooser`, le bouton « Ajouter une image » ne fait rien dans une WebView (le reste marche).

### Option C — ton propre formulaire (API)

Une requête, sans compte. Remplace `LE_JETON`, et la clé est la clé publique de Tool Proj (celle de `config.js`, déjà publique).

```
POST https://rsstlrtbyhuixkhpynux.supabase.co/rest/v1/rpc/submit_ticket
apikey: <clé publique>
Content-Type: application/json

{ "p_token": "LE_JETON", "p_kind": "bug", "p_title": "Ça plante au lancement",
  "p_body": "Sur Pixel 7, après la mise à jour", "p_email": "" }
```

Réponse : le **numéro du ticket** (un nombre). En cas d'erreur : `{"message": "…"}` en français (« Ce formulaire est fermé. », « Trop d'envois… »).

Avec une capture : d'abord l'envoyer (JPEG, PNG ou WebP, 2 Mo au plus) :

```
POST https://rsstlrtbyhuixkhpynux.supabase.co/storage/v1/object/ticket-images/LE_JETON/<un-identifiant-unique>.jpg
apikey: <clé publique>
Content-Type: image/jpeg
x-upsert: false
<les octets de l'image>
```

puis ajouter `"p_image": "LE_JETON/<un-identifiant-unique>.jpg"` dans la requête `submit_ticket`.

## 4. Sur un site

```html
<iframe src="https://toolproj.panamedev.fr/ticket.html?p=LE_JETON&embed=1"
        title="Envoyer un ticket" style="width:100%;max-width:460px;height:760px;border:0"></iframe>
<script>
  window.addEventListener('message', (e) => {
    if (e.data && e.data.source === 'toolproj-ticket' && e.data.type === 'sent') console.log('Ticket n°', e.data.id);
  });
</script>
```

## 5. Limites et sécurité

- **5 envois par heure et par adresse IP**, 60 par heure et par projet. Au-delà : message d'erreur.
- Le titre est obligatoire (200 caractères), le texte fait 5 000 caractères au plus, l'e-mail est vérifié.
- Les captures sont dans un dossier **privé** : seuls les membres du projet les voient.
- Les utilisateurs ne voient jamais les autres tickets.
- L'adresse e-mail est facultative et n'est vue que des membres du projet (page de confidentialité à jour).

## 6. Trier les tickets

- Dans l'app : **Aperçu → Signalements → Ouvrir la boîte**. **Garder comme tâche** crée une tâche du bon type (bug → bug, idée → idée, suggestion → amélioration, question → tâche) avec la capture ; **Ignorer** la range.
- Avec Claude (connecteur Tool Proj) : `list_tickets` (les tickets à trier), `get_ticket_images` (la capture), `resolve_ticket` (garder ou ignorer, seulement si tu le demandes). Rien ne se supprime jamais par le connecteur.
