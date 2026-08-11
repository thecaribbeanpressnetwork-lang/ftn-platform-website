# FTN Platform release, rollback and incident runbook

This runbook applies to the master-build release candidate. It does not authorize spend, production database changes, DNS changes, provider contracts or a production merge.

## Verified environment map

| Environment | Website | Supabase | State |
|---|---|---|---|
| Development | Local static server from this branch | Git-owned migrations/functions only | Verified with deterministic browser suites. |
| Staging | No isolated website target configured | Development branch not created | Blocked by branch cost confirmation and staging-host choice. |
| Production | `https://ftnplatform.org` via the repository's `main`-only GitHub Pages workflow/custom domain | `jshmidfpqrajxtukzges`, `ACTIVE_HEALTHY` | Read-only audit performed; not mutated by this build. |

## Before opening the release gate

1. Ricardo confirms the Supabase development-branch cost (currently US$0.01344/hour) and a maximum staging lifetime/budget.
2. Ricardo confirms the isolated website staging host and who controls its credentials.
3. Owner records immutable `FTN_OWNER_USER_ID` and separately controlled break-glass identity; complete authenticator MFA/passkey validation.
4. Owner/legal review resolves visual provenance, FTN Love legal text, provider terms, output ownership, retention and affiliate disclosure.
5. Keep all paid generation flags false and providers disabled during schema and isolation testing.

## Staging sequence

1. Create the paid Supabase development branch only after cost confirmation.
2. Record branch ID, project ref, start time and mandatory deletion time.
3. Apply in order:
   - `20260810130000_master_build_shared_identity_controls.sql`
   - `20260810150000_ibis_creative_cost_controls.sql`
4. Deploy candidate functions to the branch only: `ftn-account-control`, `ftn-love-control`, `ftn-owner-control`, `ibis-query`, `ibis-creative-control`, and the disabled `dj-tube-stems` candidate.
5. Use staging-only secrets and URLs. Never copy production service-role/provider secrets into client code or logs.
6. Generate two normal users, one suspended user, one operator, the owner and break-glass identity. Use synthetic test data only.
7. Prove:
   - anonymous and cross-user reads/writes are denied;
   - user A cannot read or alter user B preferences, saves, projects, Love records or messages;
   - non-owner and altered client claims cannot invoke owner actions;
   - owner dry-run Pause/Lockdown/Nuclear records append-only evidence and do not erase data;
   - views `issues_public`, `issue_confirmation_counts` and `issue_verification_counts` are `security_invoker` and retain the approved Community Connect public boundary;
   - credit reserve is idempotent, never negative and bound to the Edge-verified user; provider-disabled requests reserve zero credits and make zero provider calls;
   - failure refunds exactly once;
   - private audio policies isolate user folders and reject arbitrary external URLs;
   - deletion/export requests cannot bypass evidence-hold handling.
8. Run Supabase security/performance advisors. No unresolved external-facing error may be promoted.
9. Restore test: create a clean second non-production target or reset the disposable branch to the recorded migration baseline, reapply migrations/functions, and repeat isolation smoke tests. A backup is not “verified” until this completes.
10. Delete the paid branch by its mandatory time unless the owner explicitly extends the budget.

## Website release candidate

1. Run all GitHub release-gate jobs against the exact commit.
2. Inspect the generated artifact without deploying it to `main`.
3. Capture mobile (390×844), tablet, desktop (1280×900) and wide desktop screenshots for every indexed route plus Account, Love and God Mode denial states.
4. Manually verify keyboard navigation, 200% zoom, reduced motion, screen-reader names, uploads, downloads, cancelled shares and offline wording.
5. Test live provider adapters separately with production-like staging credentials, explicit quotas and no sensitive user data.
6. Record exact commit SHA, workflow run, migration versions, function versions, advisor output and owner sign-off.

## Production sequence (requires separate approval)

1. Confirm backups/restore evidence and a staffed rollback window.
2. Promote database/functions first with paid generation disabled. Re-run advisors and identity/isolation smoke tests.
3. Merge the reviewed website PR to `main`; GitHub Pages deploys automatically.
4. Verify apex TLS, canonical URLs, sitemap/robots, PWA update, all protected transactions and Community Connect handoffs.
5. With DNS/edge access, enforce one canonical apex host and verify HSTS, CSP/frame policy, Referrer-Policy and Permissions-Policy. GitHub Pages alone cannot express the full required header policy.
6. Do not enable a provider until the specific provider gate has its own signed approval, cost cap, tested refund path and owner-visible kill switch.

## Rollback / containment

- Website regression: revert the release commit with a new Git commit and allow the normal Pages workflow to deploy it. Do not rewrite shared history.
- Schema regression: set affected product/provider controls to safe maintenance/disabled through the server path, preserve logs, and apply a reviewed forward-fix migration. Do not drop tables or erase evidence as an emergency reflex.
- Function regression: disable the function/feature flag, restore the last known Git-owned function version, and verify Auth/CORS/rate-limit behavior.
- Provider/cost incident: set global and provider generation flags false, stop new reservations, preserve job/ledger/provider IDs, reconcile succeeded/failed jobs and refund only through the idempotent server RPC.
- Credential incident: disable the affected integration, rotate/revoke the credential in its owning service, redeploy server configuration, inspect logs for misuse, and record the incident timeline. Never place replacement secrets in Git or chat.
- Privacy/safety incident: Pause the affected product, restrict processing, preserve legally required evidence, notify the owner/privacy contact, and follow the published retention/deletion exception process.

The “Nuclear” control is a recoverable containment state, never a client-side delete operation.
