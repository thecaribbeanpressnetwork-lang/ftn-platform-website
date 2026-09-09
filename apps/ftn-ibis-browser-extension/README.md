# FTN ibis browser companion

A privacy-minimal Manifest V3 extension for Chrome and Opera. It gives FTN ibis a persistent toolbar identity, searches the public read-only MCP endpoint, and adds an Ask FTN ibis action for selected text.

## Privacy and permissions

- contextMenus is used only to show the selected-text action.
- The only host permission is the public FTN ibis MCP endpoint.
- There are no content scripts, broad browsing permissions, analytics SDKs, ads, cookies, account access or background page collection.
- Selected text is sent to FTN ibis only after the user explicitly chooses the context-menu action.
- Search text is limited to 160 characters. Results remain read-only and link to original sources.

## Local verification

Run `node build-package.mjs` and `node test.mjs`, then use Load unpacked in a Chromium browser and select this directory. The package test verifies that the ZIP preserves the `icons/` paths required by the manifest and contains no stale files. Store installation and publication are separate actions because they require a developer account, real rendered screenshots, store attestations and review.

## Store identity

- Name: FTN ibis — Caribbean Intelligence
- Short summary: Source-backed Caribbean opportunities and intelligence from your browser.
- Website: https://ftnplatform.org/ibis/
- Support: https://ftnplatform.org/contact/
- Privacy: https://ftnplatform.org/legal/privacy-policy/
- Terms: https://ftnplatform.org/legal/terms-of-service/
