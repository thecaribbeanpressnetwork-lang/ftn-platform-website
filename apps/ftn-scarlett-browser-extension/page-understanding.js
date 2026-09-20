(() => {
  'use strict';
  if (globalThis.__FTN_SCARLETT_PAGE__) return;

  const clean = (value, max = 300) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  const visible = (el) => {
    if (!el?.getBoundingClientRect) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 2 && rect.height > 2;
  };
  const text = (el, max = 1000) => clean(el?.innerText || el?.textContent || '', max);
  const hostname = () => location.hostname.toLowerCase();

  function knownApp() {
    const host = hostname();
    const path = location.pathname;
    if (host === 'docs.google.com' && path.includes('/spreadsheets/')) return { id:'google-sheets', label:'Google Sheets', defaultMode:'ASSIST' };
    if (host === 'docs.google.com' && path.includes('/document/')) return { id:'google-docs', label:'Google Docs', defaultMode:'ASSIST' };
    if (host === 'mail.google.com') return { id:'gmail', label:'Gmail', defaultMode:'ASSIST' };
    if (host === 'calendar.google.com') return { id:'google-calendar', label:'Google Calendar', defaultMode:'ASSIST' };
    return null;
  }

  function sensitivity() {
    const host = hostname();
    const sample = clean((document.title || '') + ' ' + text(document.body, 12000), 14000).toLowerCase();
    const passwordField = !!document.querySelector('input[type="password"]');
    const paymentField = !!document.querySelector('input[autocomplete^="cc-"], input[name*="card" i], input[id*="card" i]');
    const health = /patient|medical|health record|prescription|diagnosis|clinic|hospital/.test(sample);
    // Deliberately excludes a bare "bank" match: false-positived live during QA against a real
    // Wikipedia article (matched "World Bank"/"Bahama Banks"-style institutional/geographic usage,
    // not a banking transaction context) and forced an ordinary article into HIGH risk for no real
    // reason. Every remaining phrase requires an actual transactional/account context.
    const financial = /online banking|internet banking|bank account|banking details|bank transfer|credit card|debit card|wire transfer|account balance|mortgage|loan payment/.test(sample);
    const identity = /passport|national id|identity verification|social security|taxpayer id|two-factor|2fa|security code/.test(sample);
    const governmentAuth = /gov\.|government|ministry/.test(host + ' ' + sample) && passwordField;
    const sensitive = passwordField || paymentField || health || financial || identity || governmentAuth;
    return {
      level: sensitive ? 'HIGH' : 'NORMAL',
      reasons: [
        passwordField && 'PASSWORD_FIELD',
        paymentField && 'PAYMENT_FIELD',
        health && 'HEALTH_CONTEXT',
        financial && 'FINANCIAL_CONTEXT',
        identity && 'IDENTITY_CONTEXT',
        governmentAuth && 'GOVERNMENT_AUTH'
      ].filter(Boolean)
    };
  }

  function pageType(app) {
    if (app) return 'APP';
    const schema = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(x => x.textContent || '').join(' ').toLowerCase();
    const body = clean(text(document.body, 18000), 18000).toLowerCase();
    const articleCount = document.querySelectorAll('article').length;
    // Investor-QA fix (2026-09-20): confirmed live -- a bare document.querySelector('article') check
    // (any <article> tag anywhere) misclassified books.toscrape.com's product-tile grid as ARTICLE,
    // because a common, valid HTML5 pattern wraps each self-contained card (product tile, search
    // hit, forum post) in its own <article> element -- the tag means "self-contained composition",
    // not "this is a news article". A real single reading article has one primary <article> (rarely
    // two, e.g. with a "related" aside); a whole page of them is a collection/grid, i.e. LISTING.
    // Separately, the bare keyword OR-match (.../news|opinion|article/.test(body)) misclassified
    // discord.com as ARTICLE purely because the word "News" appeared once in nav/footer copy --
    // ordinary marketing/app pages routinely contain these words without being an article. Both are
    // generic structural/metadata fixes (article count, schema.org/OpenGraph article typing, byline/
    // publish-date presence), not a hardcoded site name for either site.
    const ogType = (document.querySelector('meta[property="og:type"]')?.content || '').toLowerCase();
    const isArticleTyped = ogType === 'article' || /"@type"\s*:\s*"(news ?article|article|blogposting)"/.test(schema);
    const hasByline = !!document.querySelector('[rel="author"], [itemprop="author"], time[datetime], time[pubdate]');
    if (/product|offer|pricecurrency/.test(schema) || /add to cart|buy now|property details|for sale|listing/.test(body)) return 'LISTING';
    if (articleCount >= 3) return 'LISTING';
    if (document.querySelector('form') && /apply|application|submit|eligibility|required documents|appointment|request/.test(body)) return 'FORM_SERVICE';
    if (isArticleTyped || (articleCount >= 1 && articleCount <= 2 && (hasByline || /published|author|read time/.test(body)))) return 'ARTICLE';
    if (document.querySelector('[role="application"], [contenteditable="true"]')) return 'APP';
    return 'GENERIC';
  }

  function siteDNA() {
    const theme = document.querySelector('meta[name="theme-color"]')?.content || '';
    const link = Array.from(document.querySelectorAll('a[href]')).find(visible);
    const button = Array.from(document.querySelectorAll('button,[role="button"]')).find(visible);
    const body = document.body ? getComputedStyle(document.body) : null;
    const accent = clean(theme || (button ? getComputedStyle(button).backgroundColor : '') || (link ? getComputedStyle(link).color : ''), 80);
    return {
      title: clean(document.title, 180),
      hostname: hostname(),
      accent,
      fontFamily: clean(body?.fontFamily || '', 180),
      background: clean(body?.backgroundColor || '', 80),
      foreground: clean(body?.color || '', 80)
    };
  }

  function regions() {
    const selectors = {
      navigation:'nav,[role="navigation"]',
      main:'main,[role="main"],article',
      forms:'form',
      tables:'table,[role="grid"]',
      dialogs:'dialog,[role="dialog"]'
    };
    return Object.fromEntries(Object.entries(selectors).map(([key, selector]) => [
      key,
      Array.from(document.querySelectorAll(selector)).filter(visible).length
    ]));
  }

  function actions() {
    return Array.from(document.querySelectorAll('a[href],button,input[type="submit"],[role="button"]'))
      .filter(visible)
      .slice(0, 250)
      .map((el) => {
        const label = clean(el.getAttribute('aria-label') || el.getAttribute('title') || el.value || text(el, 160), 160);
        const raw = (label + ' ' + clean(el.className, 160)).toLowerCase();
        let score = 0;
        if (/apply|submit|continue|buy|book|save|download|contact|sign in|log in|next|checkout|send|reply/.test(raw)) score += 3;
        if (el.tagName === 'BUTTON' || el.matches('input[type="submit"]')) score += 1;
        if (el.getBoundingClientRect().top < innerHeight * 1.25) score += 1;
        return { label, score, tag:el.tagName.toLowerCase() };
      })
      .filter(x => x.label)
      .sort((a,b) => b.score - a.score)
      .slice(0, 8);
  }

  function clutterCandidates() {
    const candidates = Array.from(document.querySelectorAll('aside,[role="complementary"],[class*="promo" i],[class*="advert" i],[id*="advert" i],[class*="newsletter" i],[class*="cookie" i]'))
      .filter(visible)
      .filter(el => !el.matches('form') && !el.querySelector('input[type="password"],input[autocomplete^="cc-"]'))
      .slice(0, 24);
    return candidates;
  }

  function contentFacts() {
    const heading = Array.from(document.querySelectorAll('h1,h2,[role="heading"]')).find(visible);
    const description = document.querySelector('meta[name="description"]')?.content || '';
    const headings = Array.from(document.querySelectorAll('h1,h2,h3')).filter(visible).map(el => text(el, 160)).filter(Boolean).slice(0, 8);
    const listCount = Array.from(document.querySelectorAll('ul,ol')).filter(visible).length;
    return {
      title: clean(text(heading, 220) || document.title, 220),
      description: clean(description, 420),
      headings,
      lists: listCount
    };
  }

  // Bounded single-pass scans over a capped slice of body text (20k chars) -- these look for
  // decision-relevant facts (price, deadline, eligibility, required documents) that a task-aware
  // interface should be able to surface, without ever calling a network/AI service to interpret
  // them. Deterministic pattern matching only; capped result counts keep this cheap even on dense
  // pages.
  function bodySample(max = 20000) {
    return clean(text(document.body, max), max);
  }

  function pricingFacts() {
    const sample = bodySample();
    const matches = sample.match(/(?:US\$|TT\$|BBD\$|EC\$|\$|USD|TTD)\s?\d[\d,]*(?:\.\d{2})?/g) || [];
    return Array.from(new Set(matches)).slice(0, 5);
  }

  function deadlineFacts() {
    const sample = bodySample();
    const matches = sample.match(/\b(?:deadline|closes?|due (?:by|date)|apply by|expires?|last date)\b[^.\n]{0,90}/gi) || [];
    return matches.slice(0, 5).map((s) => clean(s, 150));
  }

  function eligibilitySignal() {
    const sample = bodySample().toLowerCase();
    return /eligib|must be (?:a|an|over|under|resident)|requirements?:|who can apply|qualifying criteria/.test(sample);
  }

  function downloadFacts() {
    return Array.from(document.querySelectorAll('a[href$=".pdf" i],a[href$=".doc" i],a[href$=".docx" i],a[download]'))
      .filter(visible)
      .slice(0, 10)
      .map((a) => clean(a.textContent || a.getAttribute('href') || '', 140))
      .filter(Boolean);
  }

  function warningFacts() {
    return Array.from(document.querySelectorAll('[role="alert"],[class*="warning" i],[class*="error" i]'))
      .filter(visible)
      .slice(0, 6)
      .map((el) => clean(text(el, 160), 160))
      .filter(Boolean);
  }

  function accessibilitySignals() {
    const imagesMissingAlt = Array.from(document.querySelectorAll('img')).filter(visible)
      .filter((img) => !img.alt || !img.alt.trim()).length;
    const formFieldsMissingLabel = Array.from(document.querySelectorAll('input,select,textarea')).filter(visible)
      .filter((el) => {
        const id = el.id;
        const hasLabel = id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
        return !hasLabel && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.closest('label');
      }).length;
    return {
      imagesMissingAlt,
      formFieldsMissingLabel,
      reducedMotionPreferred: matchMedia('(prefers-reduced-motion: reduce)').matches
    };
  }

  function focusFacts() {
    const el = document.activeElement;
    const hasFocus = !!(el && el !== document.body && el !== document.documentElement);
    const editableSurface = !!(el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable));
    return { hasFocus, editableSurface, focusTag: hasFocus ? el.tagName.toLowerCase() : null };
  }

  function analyze() {
    const app = knownApp();
    const risk = sensitivity();
    const type = pageType(app);
    const facts = contentFacts();
    const clutter = clutterCandidates();
    const model = {
      version:'SCARLETT_PAGE_MODEL_V2',
      pageType:type,
      app,
      risk,
      site:siteDNA(),
      regions:regions(),
      actions:actions(),
      content:facts,
      commerce:{ pricing:pricingFacts() },
      deadlines:deadlineFacts(),
      eligibilitySignal:eligibilitySignal(),
      downloads:downloadFacts(),
      warnings:warningFacts(),
      accessibility:accessibilitySignals(),
      focus:focusFacts(),
      potentialClutterCount:clutter.length,
      selection: clean(getSelection()?.toString() || '', 4000),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      capturedAt:new Date().toISOString()
    };
    Object.defineProperty(model, '_clutterNodes', { value:clutter, enumerable:false });
    Object.defineProperty(model, '_mainRegion', { value:document.querySelector('article,main,[role="main"]')||null, enumerable:false });
    return model;
  }

  globalThis.__FTN_SCARLETT_PAGE__ = { analyze, clean, visible };
})();
