// Teste le protocole MCP (supabase/functions/mcp/mcp.js) avec une base factice. Usage : node test/mcp-test.cjs
(async () => {
  const { handleMessage, TOOLS, AuthError } = await import('../supabase/functions/mcp/mcp.js');
  let fails = 0; const ok = (c, m) => { console.log(c ? '✓' : '✗', m); if (!c) fails++; };
  const calls = []; const call = async (t, a) => { calls.push([t, a]); if (t === 'boom') throw new Error('Cette tâche n\'existe pas'); if (t === 'denied') throw new AuthError(); return { ok: t }; };
  const rpc = (method, params, id = 1) => handleMessage({ jsonrpc: '2.0', id, method, params }, call);

  let r = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
  ok(r.result.protocolVersion === '2025-06-18' && r.result.capabilities.tools && r.result.serverInfo.name === 'tool-proj', 'initialize : version et capacités');
  r = await rpc('initialize', { protocolVersion: '1999-01-01' }); ok(r.result.protocolVersion === '2025-06-18', 'initialize : version inconnue → la plus récente');
  ok(await handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }, call) === null, 'notification : pas de réponse');
  r = await rpc('ping'); ok(JSON.stringify(r.result) === '{}', 'ping');
  r = await rpc('tools/list'); ok(r.result.tools.length === 9 && r.result.tools.every((t) => t.name && t.description && t.inputSchema.type === 'object'), 'tools/list : 9 outils décrits');
  ok(new Set(TOOLS.map((t) => t.name)).size === TOOLS.length, 'noms uniques');
  ok(!TOOLS.some((t) => /delete|remove|drop/i.test(t.name)), 'aucun outil de suppression');
  r = await rpc('tools/call', { name: 'list_projects', arguments: {} }); ok(r.result.isError === false && JSON.parse(r.result.content[0].text).ok === 'list_projects', 'tools/call : résultat en texte JSON');
  ok(calls.at(-1)[0] === 'list_projects', 'l\'outil est appelé');
  r = await rpc('tools/call', { name: 'create_task', arguments: { project_id: 1, title: 'x' } }); ok(JSON.stringify(calls.at(-1)[1]) === '{"project_id":1,"title":"x"}', 'arguments transmis tels quels');
  r = await rpc('tools/call', { name: 'inconnu', arguments: {} }); ok(r.error?.code === -32602, 'outil inconnu : erreur de paramètre');
  r = await rpc('tools/call', { name: 'list_projects' }); ok(r.result.isError === false, 'sans arguments : objet vide');
  r = await rpc('methode/inconnue'); ok(r.error?.code === -32601, 'méthode inconnue');
  r = await handleMessage({ foo: 1 }, call); ok(r.error?.code === -32600, 'requête invalide');
  const boom = { ...TOOLS[0], name: 'boom' }; TOOLS.push(boom);
  r = await rpc('tools/call', { name: 'boom', arguments: {} }); ok(r.result.isError === true && r.result.content[0].text.includes('n\'existe pas'), 'erreur d\'outil : message lisible, isError');
  TOOLS.pop(); TOOLS.push({ ...TOOLS[0], name: 'denied' });
  let threw = false; try { await rpc('tools/call', { name: 'denied', arguments: {} }); } catch (e) { threw = e instanceof AuthError; }
  ok(threw, 'accès refusé : remonte pour répondre 401');
  console.log(fails ? `${fails} en échec` : 'Tout est vert'); process.exit(fails ? 1 : 0);
})();
