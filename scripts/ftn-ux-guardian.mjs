#!/usr/bin/env node
/**
 * FTN UX Guardian
 *
 * A real, rendered-output UX/layout audit tool -- not a linter, not Prettier. Runs a headless
 * browser against real FTN pages at real viewports and reports geometry/console findings ranked
 * BLOCKER / MAJOR / MINOR.
 *
 * Adapted from the real, primary-source-verified methodology of ov3rf1w/ui-responsive-audit
 * (MIT License), pinned upstream revision d6ef99425b51c2c0399593f1b59ef80e86988fde -- specifically
 * its breakpoint-driven Playwright audit approach and its check categories (horizontal overflow,
 * broken images, small tap targets, clipped text, hidden-but-space-reserved elements, layer/z-index
 * occlusion). This is an independent, FTN-authored implementation written from that project's
 * documented technique (its exact source file could not be retrieved verbatim during this pass),
 * not a copied file -- see SCOUT-INTELLIGENCE-LEDGER.md / GOVERNANCE for the attribution record.
 * Sakaax/ux-pilot (MIT License) is a Claude Code plugin installed via that project's own
 * marketplace mechanism, not something this script can invoke directly; its documented UX-rule
 * categories (navigation comprehension, CTA quality, first-time-user clarity, accessibility,
 * responsive review) inform the FTN-specific checks below rather than being executed by it.
 *
 * Usage:
 *   node scripts/ftn-ux-guardian.mjs --base http://127.0.0.1:PORT --routes /,/account/,...
 *   node scripts/ftn-ux-guardian.mjs --self-test
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

// The 6 mandatory FTN breakpoints (this pass's own directive) -- a deliberate subset of the
// upstream tool's broader 17-viewport matrix, focused on the laptop-header-occupancy problem and
// the real device classes FTN's own analytics-free judgment call prioritizes: common laptop
// desktop sizes, one tablet size each orientation, and the two most common phone viewports.
export const BREAKPOINTS = [
  { name: 'laptop-1366x768', width: 1366, height: 768, klass: 'desktop' },
  { name: 'small-desktop-1280x720', width: 1280, height: 720, klass: 'desktop' },
  { name: 'small-laptop-1024x768', width: 1024, height: 768, klass: 'desktop' },
  { name: 'tablet-portrait-768x1024', width: 768, height: 1024, klass: 'tablet' },
  { name: 'phone-393x852', width: 393, height: 852, klass: 'mobile' },
  { name: 'phone-small-360x800', width: 360, height: 800, klass: 'mobile' },
];

export const SEVERITY = ['BLOCKER', 'MAJOR', 'MINOR'];

// Header viewport-occupancy budget (FTN Rule 1). A header eating more than this share of a
// laptop viewport's height is the specific defect this pass's directive named -- "do not allow
// the global header/navigation system to dominate the first laptop viewport."
const HEADER_BUDGET = { desktop: 0.14, tablet: 0.16, mobile: 0.20 };

// Hero/first-fold occupancy budget (FTN Rule 7). A hero eating more than this share of a laptop
// viewport pushes a product's real, useful capability below the fold.
const HERO_BUDGET = { desktop: 0.75, tablet: 0.85, mobile: 0.92 };

const MIN_TAP_TARGET_PX = 44; // WCAG 2.2 SC 2.5.8 minimum, matches the upstream tool's ~43.5px check
const TRAILING_BLANK_BUDGET_PX = { desktop: 260, tablet: 320, mobile: 320 };

export function classify(name) {
  const bp = BREAKPOINTS.find((b) => b.name === name);
  return bp ? bp.klass : 'desktop';
}

// Pure function -- the actual finding-building logic, factored out so it's independently
// unit-testable without a real browser (see tests/ftn-ux-guardian-audit.mjs).
export function evaluatePage(route, breakpoint, metrics) {
  const findings = [];
  const klass = breakpoint.klass;
  const push = (severity, rule, message, detail) => findings.push({ route, breakpoint: breakpoint.name, severity, rule, message, detail: detail || null });

  if (metrics.consoleErrors && metrics.consoleErrors.length) {
    push('BLOCKER', 'console-error', `${metrics.consoleErrors.length} console error(s) during render/interaction`, metrics.consoleErrors.slice(0, 5));
  }
  if (metrics.horizontalOverflowPx > 1) {
    push('BLOCKER', 'horizontal-overflow', `Page scrolls horizontally by ${metrics.horizontalOverflowPx}px at ${breakpoint.width}px width`);
  }
  if (Array.isArray(metrics.brokenImages) && metrics.brokenImages.length) {
    push('BLOCKER', 'broken-image', `${metrics.brokenImages.length} broken image(s)`, metrics.brokenImages.slice(0, 5));
  }

  if (typeof metrics.headerHeight === 'number' && metrics.headerHeight > 0) {
    const ratio = metrics.headerHeight / breakpoint.height;
    const budget = HEADER_BUDGET[klass];
    if (ratio > budget * 1.4) push('BLOCKER', 'header-occupancy', `Header consumes ${(ratio * 100).toFixed(1)}% of the ${breakpoint.name} viewport height (budget ${(budget * 100).toFixed(0)}%)`, { headerHeight: metrics.headerHeight, viewportHeight: breakpoint.height });
    else if (ratio > budget) push('MAJOR', 'header-occupancy', `Header consumes ${(ratio * 100).toFixed(1)}% of the ${breakpoint.name} viewport height (budget ${(budget * 100).toFixed(0)}%)`, { headerHeight: metrics.headerHeight, viewportHeight: breakpoint.height });
  }

  if (typeof metrics.heroHeight === 'number' && metrics.heroHeight > 0) {
    const ratio = metrics.heroHeight / breakpoint.height;
    const budget = HERO_BUDGET[klass];
    if (ratio > budget) push('MAJOR', 'hero-occupancy', `Hero/banner consumes ${(ratio * 100).toFixed(1)}% of the ${breakpoint.name} viewport (budget ${(budget * 100).toFixed(0)}%) -- product content pushed below the fold`, { heroHeight: metrics.heroHeight, viewportHeight: breakpoint.height });
  }

  if (Array.isArray(metrics.smallTapTargets) && metrics.smallTapTargets.length) {
    push('MINOR', 'small-tap-target', `${metrics.smallTapTargets.length} interactive element(s) smaller than ${MIN_TAP_TARGET_PX}px`, metrics.smallTapTargets.slice(0, 8));
  }

  if (typeof metrics.trailingBlankPx === 'number') {
    const budget = TRAILING_BLANK_BUDGET_PX[klass];
    if (metrics.trailingBlankPx > budget) {
      const severity = metrics.trailingBlankPx > budget * 2 ? 'MAJOR' : 'MINOR';
      push(severity, 'trailing-blank-space', `${metrics.trailingBlankPx}px of unexplained blank space below the last visible content (budget ${budget}px)`);
    }
  }

  if (Array.isArray(metrics.suspectDeadControls) && metrics.suspectDeadControls.length) {
    push('MAJOR', 'suspect-dead-control', `${metrics.suspectDeadControls.length} prominent control(s) with no href/type=submit/onclick/data-action attribute -- verify manually, this is a heuristic not a proof`, metrics.suspectDeadControls.slice(0, 8));
  }

  return findings;
}

// The real in-page evaluation function, injected via page.evaluate(). Kept as a single string-safe
// function (not relying on closures from the Node side) so it can run inside the browser context.
function browserProbe() {
  const win = window;
  const doc = document;
  const header = doc.querySelector('.site-header, header.site-header, [data-ftn-header]');
  const hero = doc.querySelector('.page-hero, .nexus-hero, .observatory-hero, .mc-demo-hero, .hero, [data-ftn-hero]');
  const horizontalOverflowPx = Math.max(0, doc.documentElement.scrollWidth - doc.documentElement.clientWidth);

  const brokenImages = Array.from(doc.images)
    .filter((img) => img.complete && img.naturalWidth === 0)
    .map((img) => img.src)
    .slice(0, 10);

  const interactive = Array.from(doc.querySelectorAll('a, button, input, select, [role="button"]'));
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const style = win.getComputedStyle(el);
    return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
  };
  const smallTapTargets = interactive
    .filter(visible)
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.width < 44 && r.height < 44 && r.width > 0)
    .map(({ el, r }) => `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''} (${Math.round(r.width)}x${Math.round(r.height)})`);

  // Suspect dead-control heuristic: visually prominent (.btn/.cta/class mentions primary|generate|
  // action|submit) interactive elements with no href, no type=submit inside a form, no inline
  // onclick, and no data-* attribute at all. This is a HEURISTIC CANDIDATE LIST, not proof of a
  // dead control -- a real addEventListener() call elsewhere leaves no DOM trace this probe can
  // see, which is exactly why the finding severity/message says "verify manually."
  const prominent = interactive.filter(visible).filter((el) => {
    const cls = String(el.className || '');
    return /\bbtn\b|\bcta\b|primary|generate|action/i.test(cls) || (el.tagName === 'BUTTON');
  });
  const suspectDeadControls = prominent
    .filter((el) => {
      const hasHref = el.tagName === 'A' && el.getAttribute('href') && el.getAttribute('href') !== '#';
      const isSubmit = el.getAttribute('type') === 'submit' && el.closest('form');
      const hasOnclick = !!el.getAttribute('onclick');
      const hasDataAttr = Array.from(el.attributes).some((a) => a.name.startsWith('data-') && a.name !== 'data-audit-section');
      const isDisabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
      // FTN's own JS convention (confirmed by direct code reading across ftn-daw.js, ftn-fire.js,
      // ftn-dj-workstation.js, etc.) is near-universally $(id).onclick=... assigned from an
      // external script, never an inline onclick= attribute or data-action marker. An element
      // with a real, specific id is therefore NOT a reliable dead-control signal on this
      // codebase -- only an id-less element with none of the other signals is flagged. This
      // still won't catch every real dead control (a handler can be missing despite a real id),
      // but it removes the dominant false-positive source this heuristic had without any id check.
      const hasSpecificId = !!el.id && !/^(undefined|null)$/.test(el.id);
      return !hasHref && !isSubmit && !hasOnclick && !hasDataAttr && !isDisabled && !hasSpecificId;
    })
    .map((el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className ? '.' + String(el.className).split(' ')[0] : ''} "${(el.textContent || '').trim().slice(0, 40)}"`);

  // Trailing blank space: distance from the bottommost visible, non-empty element to the true
  // bottom of the document. A large gap with nothing in it is the "huge blank tail" defect.
  let lastBottom = 0;
  doc.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height === 0 && r.width === 0) return;
    const style = win.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return;
    const hasText = (el.textContent || '').trim().length > 0 && el.children.length === 0;
    const isMedia = ['IMG', 'CANVAS', 'VIDEO', 'IFRAME', 'SVG'].includes(el.tagName);
    if (!hasText && !isMedia) return;
    const bottom = r.bottom + win.scrollY;
    if (bottom > lastBottom) lastBottom = bottom;
  });
  const trailingBlankPx = Math.max(0, Math.round(doc.documentElement.scrollHeight - lastBottom));

  return {
    headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
    heroHeight: hero ? Math.round(hero.getBoundingClientRect().height) : null,
    horizontalOverflowPx,
    brokenImages,
    smallTapTargets,
    suspectDeadControls,
    trailingBlankPx,
  };
}

export async function auditRoute({ chromium, base, route }) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const breakpoint of BREAKPOINTS) {
      const page = await browser.newPage({ viewport: { width: breakpoint.width, height: breakpoint.height } });
      const consoleErrors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', (err) => consoleErrors.push(String(err)));
      const url = base.replace(/\/$/, '') + route;
      try {
        // Deliberately NOT 'networkidle': pages carrying a Cloudflare Turnstile widget keep a
        // background worker (a long-lived blob: connection) open indefinitely, which makes
        // Playwright's networkidle wait time out on an otherwise-fully-rendered page -- a known
        // false-hang, not a real site defect. 'load' + a fixed settle delay is robust to that.
        await page.goto(url, { waitUntil: 'load', timeout: 20_000 });
      } catch (navError) {
        results.push(...evaluatePage(route, breakpoint, { consoleErrors: [`Navigation failed: ${navError.message}`] }));
        await page.close();
        continue;
      }
      await page.waitForTimeout(900); // let reveal.js / late layout / lazy scripts settle
      const metrics = await page.evaluate(browserProbe);
      metrics.consoleErrors = consoleErrors;
      results.push(...evaluatePage(route, breakpoint, metrics));
      await page.close();
    }
  } finally {
    await browser.close();
  }
  return results;
}

function markdown(allFindings, meta) {
  const lines = [
    '# FTN UX Guardian Report', '',
    `Generated: ${meta.generatedAt}`, `Base: ${meta.base}`, '',
    '> Adapted from ov3rf1w/ui-responsive-audit (MIT, pinned d6ef99425b51c2c0399593f1b59ef80e86988fde) and informed by Sakaax/ux-pilot (MIT)\'s documented UX-rule categories. Real rendered-output audit, not a linter.', '',
  ];
  for (const severity of SEVERITY) {
    const items = allFindings.filter((f) => f.severity === severity);
    lines.push(`## ${severity} (${items.length})`, '');
    if (!items.length) { lines.push('None.', ''); continue; }
    lines.push('| Route | Breakpoint | Rule | Message |', '|---|---|---|---|');
    for (const f of items) lines.push(`| ${f.route} | ${f.breakpoint} | ${f.rule} | ${f.message.replaceAll('|', '\\|')} |`);
    lines.push('');
  }
  return lines.join('\n');
}

export async function run({ base, routes }) {
  const { chromium } = await import('playwright');
  const allFindings = [];
  for (const route of routes) {
    allFindings.push(...await auditRoute({ chromium, base, route }));
  }
  const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), base, routes, findings: allFindings };
  return { report, markdown: markdown(allFindings, report) };
}

async function main() {
  if (process.argv.includes('--self-test')) {
    const findings = evaluatePage('/x/', BREAKPOINTS[0], { headerHeight: 300, horizontalOverflowPx: 0 });
    if (!findings.some((f) => f.rule === 'header-occupancy' && f.severity === 'BLOCKER')) throw new Error('Header-occupancy BLOCKER self-test failed');
    const okHeader = evaluatePage('/x/', BREAKPOINTS[0], { headerHeight: 80, horizontalOverflowPx: 0 });
    if (okHeader.some((f) => f.rule === 'header-occupancy')) throw new Error('Header-occupancy false-positive self-test failed');
    const overflow = evaluatePage('/x/', BREAKPOINTS[0], { horizontalOverflowPx: 40 });
    if (!overflow.some((f) => f.rule === 'horizontal-overflow' && f.severity === 'BLOCKER')) throw new Error('Horizontal-overflow self-test failed');
    console.log('FTN UX Guardian self-test passed.');
    return;
  }
  const baseIdx = process.argv.indexOf('--base');
  const routesIdx = process.argv.indexOf('--routes');
  const outIdx = process.argv.indexOf('--out');
  const base = baseIdx >= 0 ? process.argv[baseIdx + 1] : 'http://127.0.0.1:3000';
  const routes = routesIdx >= 0 ? process.argv[routesIdx + 1].split(',') : ['/'];
  const out = outIdx >= 0 ? resolve(process.cwd(), process.argv[outIdx + 1]) : resolve(root, 'GOVERNANCE/FTN_UX_Guardian_Latest.md');
  const result = await run({ base, routes });
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, result.markdown, 'utf8');
  await writeFile(out.replace(/\.md$/i, '.json'), JSON.stringify(result.report, null, 2) + '\n', 'utf8');
  const counts = SEVERITY.map((s) => `${s}:${result.report.findings.filter((f) => f.severity === s).length}`).join(' ');
  console.log(`FTN UX Guardian wrote ${out} (${counts})`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main().catch((error) => { console.error(error); process.exitCode = 1; });
