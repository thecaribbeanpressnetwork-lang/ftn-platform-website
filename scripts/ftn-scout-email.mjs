#!/usr/bin/env node
/**
 * Sends the completed Open-Source Scout report to the FTN founder mailbox.
 * Credentials are supplied only as GitHub Actions secrets; they are never
 * written to the report, repository, browser, or log output.
 */
import { readFile } from 'node:fs/promises';

const required = ['FTN_SCOUT_GMAIL_CLIENT_ID', 'FTN_SCOUT_GMAIL_CLIENT_SECRET', 'FTN_SCOUT_GMAIL_REFRESH_TOKEN', 'FTN_SCOUT_EMAIL_TO'];
for (const key of required) if (!process.env[key]) throw new Error(`Missing required GitHub secret: ${key}`);

const reportPath = process.argv[2];
if (!reportPath) throw new Error('Usage: node scripts/ftn-scout-email.mjs <report.json>');
const report = JSON.parse(await readFile(reportPath, 'utf8'));
const esc = value => String(value || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const visible = report.areas.flatMap(area => area.candidates.filter(candidate => candidate.gate?.decision !== 'exclude').slice(0, 5));
const rows = visible.map(candidate => `<tr><td><a href="${esc(candidate.url)}">${esc(candidate.name)}</a><br><small>${esc(candidate.source)} · score ${esc(candidate.score)}/100</small></td><td>${esc(candidate.ftnArea)}<br><small>${esc(candidate.ftnReason)}</small></td><td>${esc(candidate.gate?.decision)}<br><small>${esc(candidate.gate?.reason)}</small></td><td><a href="${esc(candidate.actionUrl)}" style="display:inline-block;background:#e10613;color:#fff;padding:9px 12px;border-radius:6px;text-decoration:none;font-weight:700">${esc(candidate.actionLabel)}</a></td></tr>`).join('');
const subject = `FTN Open-Source Scout — ${visible.length} candidates for founder review`;
const html = `<!doctype html><html><body style="margin:0;background:#080808;color:#f5f5f5;font:15px/1.45 Arial,sans-serif"><main style="max-width:940px;margin:0 auto;padding:30px 18px"><p style="color:#e10613;font-weight:800;letter-spacing:.1em">FTN OPEN-SOURCE SCOUT</p><h1 style="margin:0 0 12px">${esc(visible.length)} recommendations require your decision.</h1><p>Scout searched public registries on ${esc(report.generatedAt)}. Each recommendation below states the FTN use case and the licence gate. Nothing has been installed, connected, published or approved.</p><table role="presentation" style="width:100%;border-collapse:collapse;background:#111"><thead><tr><th align="left">Candidate</th><th align="left">Why FTN can use it</th><th align="left">Gate</th><th align="left">Action</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No eligible recommendations were returned. Review the attached report for source availability.</td></tr>'}</tbody></table><p style="margin-top:22px;color:#b9b9b9">“Start FTN adoption review” opens a prefilled private-repository issue for your approval. It starts a review record only; it does not add code or give a third party access to FTN.</p></main></body></html>`;
const plain = `FTN Open-Source Scout\n\n${visible.map(c => `${c.name}\nFTN area: ${c.ftnArea}\nWhy: ${c.ftnReason}\nGate: ${c.gate?.decision} — ${c.gate?.reason}\nReview: ${c.actionUrl}`).join('\n\n')}\n\nNothing has been installed, connected, published or approved.`;
const message = [`To: ${process.env.FTN_SCOUT_EMAIL_TO}`, `Subject: ${subject}`, 'MIME-Version: 1.0', 'Content-Type: multipart/alternative; boundary="ftn-scout"', '', '--ftn-scout', 'Content-Type: text/plain; charset="UTF-8"', '', plain, '--ftn-scout', 'Content-Type: text/html; charset="UTF-8"', '', html, '--ftn-scout--'].join('\r\n');
if (process.env.FTN_SCOUT_EMAIL_DRY_RUN === '1') {
  if (!message.includes('Start FTN adoption review')) throw new Error('Founder action was not included in email output');
  console.log(`FTN Scout email dry run passed (${visible.length} recommendations).`);
  process.exit(0);
}
const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.FTN_SCOUT_GMAIL_CLIENT_ID, client_secret: process.env.FTN_SCOUT_GMAIL_CLIENT_SECRET, refresh_token: process.env.FTN_SCOUT_GMAIL_REFRESH_TOKEN, grant_type: 'refresh_token' }) });
if (!tokenResponse.ok) throw new Error(`Gmail authorization refresh failed (${tokenResponse.status})`);
const accessToken = (await tokenResponse.json()).access_token;
if (!accessToken) throw new Error('Gmail authorization refresh returned no access token');
const encoded = Buffer.from(message).toString('base64url');
const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ raw: encoded }) });
if (!sendResponse.ok) throw new Error(`Gmail report delivery failed (${sendResponse.status})`);
console.log(`FTN Scout email delivered to configured founder mailbox (${visible.length} recommendations).`);
