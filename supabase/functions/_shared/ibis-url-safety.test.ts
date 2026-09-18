import { assert, assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { validateExternalUrl } from "./ibis-url-safety.ts";

console.log("ibis-url-safety.test.ts: HTTPS-only, no embedded credentials, no localhost/private-IP/link-local/carrier-grade-NAT targets -- a generalization of ftn-owner-control/index.ts's existing safeExternalUrl(), reused by the Phase 5 Retrieval Adapter.");

Deno.test("a genuine https URL is safe", () => {
  const v = validateExternalUrl("https://www.gov.tt/some-record");
  assert(v.safe);
});

Deno.test("a plain http URL is rejected (https-only)", () => {
  const v = validateExternalUrl("http://example.com/page");
  assertFalse(v.safe);
  if (!v.safe) assertEquals(v.reason, "NON_HTTPS_SCHEME");
});

Deno.test("localhost is rejected", () => {
  const v = validateExternalUrl("https://localhost/admin");
  assertFalse(v.safe);
  if (!v.safe) assertEquals(v.reason, "PRIVATE_OR_LOOPBACK_HOST");
});

Deno.test("a .internal hostname is rejected", () => {
  const v = validateExternalUrl("https://service.internal/secrets");
  assertFalse(v.safe);
});

Deno.test("RFC1918 private IPv4 (10.x/172.16-31.x/192.168.x) is rejected", () => {
  for (const host of ["10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1"]) {
    const v = validateExternalUrl(`https://${host}/`);
    assertFalse(v.safe, `expected ${host} to be rejected`);
  }
});

Deno.test("172.32.x.x is NOT in the private range (boundary correctness)", () => {
  const v = validateExternalUrl("https://172.32.0.1/");
  assert(v.safe);
});

Deno.test("loopback 127.0.0.1 is rejected", () => {
  const v = validateExternalUrl("https://127.0.0.1/");
  assertFalse(v.safe);
});

Deno.test("link-local 169.254.169.254 (cloud metadata endpoint) is rejected", () => {
  const v = validateExternalUrl("https://169.254.169.254/latest/meta-data/");
  assertFalse(v.safe);
});

Deno.test("carrier-grade NAT range 100.64.0.0/10 is rejected", () => {
  const v = validateExternalUrl("https://100.64.0.1/");
  assertFalse(v.safe);
});

Deno.test("IPv6 loopback ::1 is rejected", () => {
  const v = validateExternalUrl("https://[::1]/");
  assertFalse(v.safe);
});

Deno.test("IPv6 unique-local (fd00::/8) is rejected", () => {
  const v = validateExternalUrl("https://[fd12:3456:789a::1]/");
  assertFalse(v.safe);
});

Deno.test("embedded credentials in the URL are rejected", () => {
  const v = validateExternalUrl("https://user:pass@example.com/");
  assertFalse(v.safe);
  if (!v.safe) assertEquals(v.reason, "EMBEDDED_CREDENTIALS");
});

Deno.test("a malformed URL string is rejected, never throws", () => {
  const v = validateExternalUrl("not a url at all");
  assertFalse(v.safe);
  if (!v.safe) assertEquals(v.reason, "INVALID_URL");
});
