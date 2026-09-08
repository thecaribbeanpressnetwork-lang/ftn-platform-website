const MCP_ENDPOINT = 'https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ftn-ibis-mcp';

export async function callIbis(tool, args) {
  const response = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'tools/call',
      params: { name: tool, arguments: args },
    }),
  });
  if (!response.ok) throw new Error('FTN ibis returned HTTP ' + response.status + '.');
  const envelope = await response.json();
  if (envelope.error) throw new Error(envelope.error.message || 'FTN ibis could not complete the request.');
  return envelope.result?.structuredContent || {};
}

export function resultRows(payload) {
  if (Array.isArray(payload.opportunities)) return payload.opportunities;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

export function sourceLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}
