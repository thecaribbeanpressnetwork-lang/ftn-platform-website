# Deployed Supabase snapshots

These files are the exact Edge Function sources retrieved from the active FTN Supabase project during the protected master-build baseline. They are retained as deployment evidence and a rollback reference.

`../functions/` is the reviewed deployment-candidate source. A candidate may intentionally differ from this snapshot, but production must never be described as matching it until the exact candidate is deployed and verified. `manifest.json` records the active function version, JWT setting and Supabase bundle hash observed at capture time.

Secrets are not included. Never deploy a snapshot merely because it is live; review the candidate, test it in staging and deploy the exact reviewed source.
