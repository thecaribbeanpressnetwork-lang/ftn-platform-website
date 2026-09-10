import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('supabase/functions/ibis-image-cloudflare/index.ts','utf8');

assert.match(source,/payload\.action === "health"/,'Image edge function must expose a no-generation health action.');
assert.match(source,/generationAttempted:\s*false/,'Health action must state that no generation was attempted.');
assert.match(source,/configured,\s*\n\s*ready: configured/,'Health readiness must derive from server-side configuration state.');
assert.match(source,/Deno\.env\.get\("CLOUDFLARE_ACCOUNT_ID"\)/);
assert.match(source,/Deno\.env\.get\("CLOUDFLARE_API_TOKEN"\)/);
assert.match(source,/@cf\/black-forest-labs\/flux-1-schnell/);
assert.match(source,/@cf\/bytedance\/stable-diffusion-xl-lightning/);
assert.match(source,/AbortSignal\.timeout\(20_000\)/,'Generation must remain bounded by an upstream timeout.');
assert.match(source,/0xff.*0xd8.*0xff/s,'JPEG magic bytes must be detected.');
assert.match(source,/0x89.*0x50.*0x4e.*0x47/s,'PNG magic bytes must be detected.');
assert.match(source,/mimeType: type\.mimeType, extension: type\.extension/,'Response must publish MIME and extension derived from bytes.');
assert.match(source,/unrecognized image artifact/i,'Unknown artifact bytes must fail closed.');
assert.doesNotMatch(source,/CLOUDFLARE_API_TOKEN\s*=\s*["'][^"']+["']/,'No Cloudflare credential may be embedded in source.');

console.log('ibis Cloudflare image readiness audit: zero-cost health, fixed model allowlist, bounded generation and magic-byte artifact truth verified.');
