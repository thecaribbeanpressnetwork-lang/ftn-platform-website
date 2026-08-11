# FTN Fire — Managed Generation Runbook

Status: **prepared, deliberately disabled**. This is the production contract for FTN-controlled instrumental generation with Stable Audio 3 Medium. It does not authorize launch by itself.

## What is built

- `ftn-fire-generate` is an authenticated Supabase Edge Function. Browser code never receives a Hugging Face token.
- A user job atomically reserves ibis Credits before a provider call. If submitting the job fails, the function refunds them.
- A gateway job is polled; it must report a verified actual cost before Fire finalizes delivery.
- Audio is copied to FTN's private `ftn-fire-output` bucket. Only the job owner gets a five-minute signed URL.
- Full instrumentals use `stable-audio-3-medium`. DJ drops/SFX remain a separate disabled capability: `stable-audio-3-small-sfx`.

## FTN-owned gateway contract

Deploy a private FTN gateway in front of the managed Hugging Face Inference Endpoint. The Edge Function uses a bearer token and requires HTTPS.

`POST /v1/jobs` receives `ftn_job_id`, `model`, `prompt`, `style`, `key`, `duration_seconds`, `format`, `instrumental_only`, and `no_artist_imitation`; it returns `202 {"id":"provider-job-id","status":"QUEUED"}`.

`GET /v1/jobs/:id` returns a queued/processing status, or on completion:

```json
{"status":"SUCCEEDED","output_url":"https://approved-output-host/...","content_type":"audio/wav","actual_cost_microusd":123456}
```

For a failure it returns `{"status":"FAILED","error_code":"..."}`. The gateway must retain job state long enough for Fire to poll it. It must not make a result public by default.

## Supabase secrets

Add only in the FTN Supabase secret manager, never Git:

- `FTN_FIRE_INFERENCE_URL` — private gateway base HTTPS URL
- `FTN_FIRE_INFERENCE_TOKEN` — gateway bearer token
- `FTN_FIRE_OUTPUT_ALLOWED_HOSTS` — comma-separated output hosts exactly as supplied by the gateway
- `FTN_CREATIVE_GENERATION_ENABLED=true`
- `FTN_FIRE_GENERATION_ENABLED=true`

Keep both enable switches **off** until the steps below are complete. The Hugging Face token stays only in the gateway as `HF_TOKEN`.

## Required owner actions before enabling

1. Accept and archive the applicable Stability commercial licence under the FTN/Boss Entertainment entity. Record the entity, date, model/version and any restrictions.
2. Create the FTN-controlled Hugging Face account/token and approve the monthly managed-endpoint budget.
3. Deploy and test the private gateway using the contract above. Set a hard provider-side spend cap.
4. In staging, set the Medium provider's `customer_credit_cost` and `provider_cost_microusd`, then explicitly set `enabled=true` and `generation_enabled=true` only after a measured generation cost and refund test.
5. Deploy `ftn-fire-generate`, run successful, slow, failed, retry and oversized-output tests, then enable the two server switches.

## Rollback

Set either server switch to a value other than `true`. New generations fail closed before credit reservation or gateway contact. Existing jobs remain auditable and can be reconciled/refunded.
