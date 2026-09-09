# FTN ibis OpenAI and Google submission runbook

## Release decision

**PREPARE NOW.** Submit the same narrow, read-only FTN ibis capability through two distribution surfaces. The MCP endpoint remains the shared FTN-owned interface; neither OpenAI nor Google becomes the source of truth.

## OpenAI plugin submission

- Submission type: **With MCP**
- Connection type: **Universal / public MCP URL**
- Name: **FTN ibis — Caribbean Intelligence**
- Endpoint: `https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ftn-ibis-mcp`
- Authentication: **None** for the initial public read-only release
- Website: `https://ftnplatform.org/ibis/`
- Privacy: `https://ftnplatform.org/legal/privacy-policy/`
- Terms: `https://ftnplatform.org/legal/terms-of-service/`
- Support: `https://ftnplatform.org/contact/`
- Support email: `facethenationtt@gmail.com`
- Category: **Productivity**

Use `apps/ftn-ibis-mcp/submission-metadata.json` for the exact description, six tool annotations, six positive tests, three negative tests and release notes.

### OpenAI account gates

1. Open ChatGPT Settings → Security and login; enable Developer mode.
2. Open ChatGPT Plugins, add a plugin, and enter the production MCP endpoint.
3. Review all six discovered tools and run the supplied positive and negative cases.
4. In the OpenAI Platform submission portal, select the verified FTN/RealityArtTV publisher identity and confirm Apps Management write permission.
5. Create a **With MCP** draft, scan the live endpoint, complete attestations and stop at the final Submit control for confirmation.

## Chrome Web Store submission

- Upload package: `apps/ftn-ibis-browser-extension/dist/ftn-ibis-chrome-store-0.1.1.zip`
- Store icon: `apps/ftn-ibis-browser-extension/icons/ibis-128.png`
- Small promo tile: `apps/ftn-ibis-browser-extension/store-assets/ftn-ibis-small-promo-440x280.png`
- Exact listing/privacy/distribution/test fields: `apps/ftn-ibis-browser-extension/store-listing.json`

### Chrome account gates

1. Register or open the Chrome Web Store developer account.
2. Add a new item and upload the ZIP.
3. Install the unpacked extension locally, run one real search and capture one real 1280×800 or 640×400 screenshot. Do not use a fabricated UI screenshot.
4. Add `ftnplatform.org` as the official URL after verifying it in Google Search Console.
5. Complete Store Listing, Privacy, Distribution and Test Instructions using `store-listing.json`.
6. Choose deferred publishing so approval does not publish automatically.
7. Stop at the final **Submit for Review** control for confirmation.

## Provider repair required before public promotion

The gateway and MCP endpoint return bounded HTTP responses, but the optional model-answer layer currently reports unauthorized credentials for both configured providers. Replace `ANTHROPIC_API_KEY` and `GEMINI_API_KEY` directly in Supabase Edge Function secrets. Never paste provider keys into chat, source control, issue text or store fields. `GEMINI_MODEL=gemini-2.5-flash` remains a valid model setting.

