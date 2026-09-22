# Scarlett — Claude Worker Brief

You are the implementation worker for Scarlett, an FTN product.

Scarlett is the adaptive interface layer. It is not ibis and not Headspace.

Canonical boundaries:
- ibis = intelligence, evidence, reasoning, governed actions
- Headspace = workspace generated around an intention
- Scarlett = adaptive interface to an existing digital environment

Work only from branch `feature/scarlett-adaptive-interface-v1`.
Do not merge to main.

Read first:
1. `docs/SCARLETT_V1_AUDIT_AND_BUILD_PLAN_2026-09-19.md`
2. `GOVERNANCE/FTN_IBIS_Canonical_Architecture_2026-09-18.md`
3. `apps/ftn-ibis-browser-extension/`
4. `js/ibis-permission-ledger.js`
5. `js/ibis-connection-fabric.js`
6. `js/ibis-headspace-window-manager.js`
7. `apps/ftn-scarlett-browser-extension/`

Immediate worker mission:
- run/review Scarlett tests;
- inspect V1 extension behavior against article, listing, government information page, Google Docs and Google Sheets;
- fix only real failures;
- preserve Original/Assist/Adapt scope;
- preserve local-first behavior;
- do not add broad host permissions;
- do not add automatic page upload;
- do not build Transform/Compare/Blend yet;
- do not duplicate ibis reasoning;
- do not redesign the product family;
- record any defect with exact reproduction and fix;
- keep PR #83 draft until all required gates and browser QA pass.

Google apps:
- remain ASSIST only in V1;
- do not move native editor/grid/mail/calendar controls;
- verify selection handoff does not interfere with editing.

Sensitive surfaces:
- must downgrade ADAPT to ASSIST;
- payment/password/security controls must not be obscured or relocated.

Ibis handoff:
- must remain review-before-send;
- raw context stays in extension session storage until user chooses Insert;
- do not put private context in URL parameters;
- do not auto-submit.

Success report must include:
- exact tests run;
- exact pages tested;
- failures found;
- fixes made;
- remaining risks;
- changed files;
- commit SHA;
- whether PR #83 is ready for human visual QA.
