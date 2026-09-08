# FTN ibis WAM activation

The FTN-side Standard/Pro entitlement, checkout and signed-webhook services are deployed. They deliberately fail closed until WAM merchant credentials are stored in Supabase secrets.

## Offer

- Standard: free public MCP tools.
- Pro: TT$99 for 30 days.
- Renewal: customer initiated; no automatic renewal in this release.
- Fulfilment: only a verified `payment_intent.succeeded` webhook grants access.

## WAM Business Portal

The personal WAM profile is not the merchant API surface. Use **Switch Account** and select or create the FTN business account, then open **Developers → Merchant Keys**.

Start with WAM staging:

1. Copy the staging Business ID.
2. Create a staging API key. It is shown once.
3. Add this webhook endpoint and subscribe to `payment_intent.*`:
   `https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ftn-ibis-wam-webhook`
4. Copy the `whsec_` webhook signing secret when it is shown.
5. Store all three values directly in **Supabase Dashboard → Edge Functions → Secrets**. Never paste them into source control, a website field, email or chat.

Required secret names:

```text
WAM_BUSINESS_ID
WAM_API_KEY
WAM_WEBHOOK_SECRET
WAM_ENVIRONMENT=staging
```

After staging checkout and WAM's test webhook both pass, create separate production credentials at `app.wam.money`, replace the three credential values, and set `WAM_ENVIRONMENT=production`. Staging and production Business IDs are different.

## FTN endpoints

- Authenticated checkout/status: `https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ftn-ibis-billing`
- Signed WAM webhook: `https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ftn-ibis-wam-webhook`
- Authenticated Pro tools: `https://jshmidfpqrajxtukzges.supabase.co/functions/v1/ftn-ibis-pro`
- Public plan page: `https://ftnplatform.org/ibis/pricing/`
- Private Pro workspace: `https://ftnplatform.org/ibis/pro/`

FTN stores order/status identifiers, event hashes and entitlement dates. Card numbers, CVV values and WAM wallet credentials stay on WAM-hosted checkout.
