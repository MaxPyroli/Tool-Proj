// Connecteur MCP de Tool Proj (déployé avec verify_jwt = false : la clé personnelle dans l'adresse fait foi).
// Adresse : <projet>.supabase.co/functions/v1/mcp/<clé>. La clé est fabriquée dans l'app (Mon compte → Accès pour Claude) ;
// la base ne garde que son empreinte SHA-256 ; les outils tournent avec les droits de la personne (public.mcp_call).
import { createClient } from "npm:@supabase/supabase-js@2";
import { AuthError, handleMessage } from "./mcp.js";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const sha256 = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, mcp-session-id, mcp-protocol-version", "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS" } });
  const last = new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const token = last.startsWith("tp_") ? last : bearer.startsWith("tp_") ? bearer : "";
  if (!token) return json({ error: "Accès refusé : clé manquante." }, 401);
  if (req.method === "GET") return json({ error: "Méthode non gérée (pas de flux SSE)." }, 405);
  if (req.method === "DELETE") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "Méthode non gérée." }, 405);

  const hash = await sha256(token);
  const call = async (tool: string, args: Record<string, unknown>) => {
    const { data, error } = await sb.rpc("mcp_call", { p_token_hash: hash, p_tool: tool, p_args: args });
    if (error) throw new Error(error.message);
    if (data?.auth === false) throw new AuthError("Accès refusé");
    return data;
  };

  let body: unknown;
  try { body = await req.json(); } catch { return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON illisible" } }, 400); }
  try {
    await call("ping", {}); // la clé doit être valable pour toute requête
    if (Array.isArray(body)) {
      const out = (await Promise.all(body.map((m) => handleMessage(m, call)))).filter((r) => r !== null);
      return out.length ? json(out) : new Response(null, { status: 202 });
    }
    const res = await handleMessage(body as never, call);
    return res ? json(res) : new Response(null, { status: 202 });
  } catch (e) {
    if (e instanceof AuthError) return json({ error: "Accès refusé : clé inconnue, expirée ou révoquée." }, 401);
    console.error("mcp", (e as Error).message);
    return json({ jsonrpc: "2.0", id: null, error: { code: -32603, message: "Erreur interne" } }, 500);
  }
});
