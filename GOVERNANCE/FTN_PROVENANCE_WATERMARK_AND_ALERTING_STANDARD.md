# FTN provenance, watermark and usage-alerting standard

**Status:** PREPARE NOW / BUILD NOW for provenance; BUILD LATER for usage alerts  
**Owner:** Ricardo Gill / FTN Platform  
**Applies to:** FTN ibis, Headspace, FTN websites, graphics, video, audio, documents, code and public data records

## Short answer

There are two different problems:

1. **Can we prove that FTN possessed and published an original?** Yes, using dated source control, cryptographic hashes, signed manifests, immutable releases and provider revision history.
2. **Can we know when somebody uses or copies it?** Sometimes. A hosted tracking beacon can alert when the original asset is loaded, and a robust watermark/fingerprint can help identify a reused image, video or audio file. Neither detects every copy, and a beacon is not proof of copying.

Invisible “micro-pixels” are therefore one optional sensor, not the ownership system. They are stripped by downloads, blocked by browsers, absent from screenshots and inappropriate in some privacy contexts. They must never be used covertly in private user content.

## FTN’s layered evidence stack

### 1. Public attribution

Every public asset should carry a readable FTN ibis / FTN Platform attribution, canonical URL, creator/steward and contact path where the format allows it. The public page should link to the ownership/IP declaration and machine-readable project record.

### 2. Cryptographic release manifest

At each release, hash the exact source files, images, video masters, audio masters, documents and data snapshots with SHA-256. Store a manifest containing:

- asset path and media type;
- byte length and SHA-256 digest;
- creator/steward and licence boundary;
- canonical URL;
- Git commit/tag and release timestamp;
- source or provider attribution where applicable.

A hash proves that a later file matches an earlier recorded file. It does not, by itself, prove legal title; the chain-of-title declaration and dated repository/Drive history remain necessary.

### 3. Signed provenance

Use a founder-controlled signing key stored outside the website repository to sign release manifests. Keep the public verification key in the repository and on the public project page. Rotate keys with a documented transition record. Never place private signing keys in JavaScript, Supabase, GitHub Actions logs or Drive public files.

### 4. Media provenance

For images, video and audio, prefer C2PA/Content Credentials where the production toolchain supports it. Retain the original master, edit project, export log and final hash. Add a robust visible or forensic watermark only where it does not degrade the work. Watermarks identify a work; they do not replace contracts or registration.

### 5. Code and document provenance

Use Git commit history, signed tags, release archives, Drive revision history and dated exports. For documents, include a footer with FTN ibis, author/steward, version, date and canonical record. For code, keep the repository, commit and manifest together.

### 6. Optional usage beacons

A hosted image can include a one-pixel or otherwise minimal beacon that records timestamp, asset identifier, referrer where available and coarse technical information. The beacon must:

- be first-party and disclosed in the privacy notice;
- avoid collecting unnecessary personal data;
- use a short-lived, non-identifying asset token;
- never be embedded in private user conversations or sensitive documents;
- support a no-tracking/plain-export version;
- be treated as an alert that an asset URL was requested, not proof that a person copied the work.

Static Cloudflare Pages cannot receive an alert by itself. A beacon requires an authenticated, privacy-reviewed event endpoint and an alert destination such as email or a private dashboard. CDN logs can provide limited evidence without adding a pixel.

## Recommended FTN implementation order

1. **BUILD NOW:** release-manifest generator and SHA-256 hashes for the FTN ibis public pages, logo files, governance documents and key JavaScript modules.
2. **BUILD NOW:** visible attribution, canonical URLs, Git commits/tags and Drive archival copies.
3. **PREPARE NOW:** signing-key procedure and public verification-key location.
4. **BUILD LATER:** C2PA export support for final graphics/video/audio masters.
5. **EXPERIMENT:** first-party beacon for selected public marketing assets only, after privacy review and an alert-routing decision.
6. **DEFER:** universal invisible encoding of every page, code file or private user artifact. It would create false confidence, maintenance cost and privacy risk.

## Incident workflow when a match appears

Preserve the discovered URL, screenshot, HTML headers, downloaded file and timestamp. Hash the suspected copy and compare it with the FTN release manifest. Record the first-publication commit/Drive revision, the relevant licence and the degree of transformation. Contact the operator with a factual notice; escalate to a platform or legal process only after the evidence is reviewed.

## Ownership boundary

This system documents provenance for FTN-created material. It does not claim ownership of third-party code, models, fonts, stock media, provider outputs, public facts or user-submitted content. Those remain governed by their licences, terms and agreements.
