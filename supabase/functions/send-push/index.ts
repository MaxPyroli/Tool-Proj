// Envoie une notification Web Push à tous les appareils d'une personne.
// Appelée par la base (pg_net) avec l'en-tête x-push-secret ; les clés VAPID et les appareils viennent de la base
// (fonction public.push_payload, réservée à la clé serveur, qui vérifie le secret). Déployée avec verify_jwt = false.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "méthode refusée" }, 405);
  const secret = req.headers.get("x-push-secret") ?? "";
  if (!secret) return json({ error: "non autorisé" }, 401);

  let msg: { user_id?: unknown; title?: unknown; body?: unknown; url?: unknown };
  try { msg = await req.json(); } catch { return json({ error: "message illisible" }, 400); }
  if (typeof msg.user_id !== "string" || typeof msg.title !== "string") return json({ error: "message invalide" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await sb.rpc("push_payload", { p_secret: secret, p_user: msg.user_id });
  if (error) return json({ error: "base indisponible" }, 500);
  if (!data) return json({ error: "non autorisé" }, 401);

  webpush.setVapidDetails(data.subject, data.vapid_public, data.vapid_private);
  const payload = JSON.stringify({
    title: msg.title.slice(0, 100),
    body: typeof msg.body === "string" ? msg.body.slice(0, 300) : "",
    url: typeof msg.url === "string" ? msg.url.slice(0, 200) : "#/",
  });

  let sent = 0, gone = 0;
  await Promise.all((data.subscriptions as { endpoint: string; p256dh: string; auth: string }[]).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) { // appareil désinscrit : on l'oublie
        gone++;
        await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      } else {
        console.error("push refusé", code ?? (e as Error).message);
      }
    }
  }));
  return json({ sent, gone });
});
