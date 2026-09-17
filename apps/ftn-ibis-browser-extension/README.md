# FTN ibis browser companion

A privacy-minimal Manifest V3 extension for Chrome and Opera. It lets a user search normally in Google, Bing or DuckDuckGo — including while signed in to their own browser profile — and then explicitly pass the visible search-result titles, destination URLs and snippets to FTN ibis for Caribbean-first reasoning. It also keeps the existing read-only FTN ibis tools and selected-text action.

## User flow

1. Search normally in Google, Bing or DuckDuckGo.
2. Open the FTN ibis browser companion on that search-results tab.
3. Press **Include browser search**.
4. Ask ibis what you want it to work out from those results.
5. ibis returns a reasoned answer with the captured result sources preserved as snippet-level evidence.

The browser remains the search tool. ibis is the research/CEO reasoning layer over the evidence the user deliberately supplies.

## Privacy and permissions

- `activeTab` and `scripting` are used only after the user presses **Include browser search**, so the extension can read the currently visible search-result cards on that one active tab.
- `contextMenus` is used only for the selected-text action.
- Host permissions are restricted to FTN's two Supabase Edge Function endpoints used by the companion (`ftn-ibis-mcp` and `ibis-browser-context`).
- There are no persistent content scripts, broad all-sites host permissions, analytics SDKs, ads, cookie access, password access, Google account-token access, browser-history access or background page collection.
- Captured search context contains the engine, search query, sanitized search URL, capture time, and up to 10 visible organic-result titles, HTTPS destination URLs and snippets.
- Sensitive URL parameters such as tokens, authorization codes, API keys, passwords and session identifiers are stripped before a result URL is sent.
- Browser-result snippets are labelled `SNIPPET`; ibis does not claim they are full-page verification.
- Selected text is sent to FTN ibis only after the user explicitly chooses the context-menu action.

## Verification

Run `node build-package.mjs` and `node test.mjs`, then use **Load unpacked** in a Chromium browser and select this directory. CI also deploys `ibis-browser-context` and executes a live authenticated acceptance proof against the public function, requiring `USER_PROVIDED_WEB_CONTEXT`, preserved snippet provenance and a non-empty ibis answer.

The release workflow packages `dist/ftn-ibis-chrome-store-0.2.0.zip` and publishes the verified ZIP as a GitHub Release asset. Chrome Web Store / Opera Add-ons publication remains a separate store-review action because it requires developer-account attestations and marketplace review.

## Store identity

- Name: FTN ibis — Caribbean Intelligence
- Short summary: Bring your browser search evidence into Caribbean-first ibis reasoning.
- Website: https://ftnplatform.org/ibis-ai/
- Companion help: https://ftnplatform.org/ibis-browser-companion/
- Support: https://ftnplatform.org/contact/
- Privacy: https://ftnplatform.org/legal/privacy-policy/
- Terms: https://ftnplatform.org/legal/terms-of-service/
