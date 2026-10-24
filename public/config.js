// Connexion à Supabase. Ces deux valeurs sont publiques (la sécurité est assurée par les règles RLS de la base).
// Supabase → Project Settings → API (ou « Connect ») : URL du projet et clé « publishable » / « anon ».
// Si tu déploies avec la GitHub Action, ce fichier est régénéré à partir des variables du dépôt.
window.TOOL_PROJ_CONFIG = {
  supabaseUrl: '',
  supabaseKey: '',
  allowSignup: true, // false : cache « Créer un compte » (ferme aussi les inscriptions dans Supabase)
};
