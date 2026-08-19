# FTN Homepage Design QA — 2026-08-19

**Comparison target**

- Source visual truth: `assets/home/ftn-approved-caribbean-ecosystem.png` (exact copy of the approved board supplied by the founder), 1536 × 1024 px.
- Rendered implementation: GitHub Actions artifact `ftn-surface-visual-evidence`, run 156, artifact ID `9352180083`.
  - `homepage-1440x900.png`, 1440 × 900 px.
  - `homepage-390x844.png`, 390 × 844 px.
- Local evidence paths used for the final review:
  - `/tmp/ftn-visual-evidence-156.z80Xy4/desktop-source-vs-build.png`
  - `/tmp/ftn-visual-evidence-156.z80Xy4/focused-hero-source-vs-build.png`
  - `/tmp/ftn-visual-evidence-156.z80Xy4/extracted/homepage-390x844.png`
- Desktop CSS viewport: 1440 × 900 at `deviceScaleFactor: 1`.
- Mobile CSS viewport: 390 × 844 at `deviceScaleFactor: 1`.
- Density normalization: the 1536 × 1024 source was proportionally normalized to 1440 × 960 for the focused desktop comparison, then both source and implementation were cropped to the same 1440 × 710 header/hero region.
- State: signed-out public homepage, ecosystem directory collapsed, dark theme, default motion preference.

**Findings**

- No actionable P0, P1, or P2 differences remain in the approved desktop surface or the responsive mobile adaptation.
- The implementation uses the approved raster artwork directly. No replacement map, handcrafted bird, inline SVG illustration, placeholder, or stretched product reference is present.
- The live left-side gradient is intentionally denser than the baked board beneath the HTML copy. This prevents duplicate raster text from showing through while retaining the approved map and purple ibis. The visible hierarchy and balance remain faithful to the source.

**Required fidelity surfaces**

- Fonts and typography: Montserrat is used for the display hierarchy and Inter for supporting/UI copy. Weight, uppercase treatment, line height, tracking, two-line headline wrap, and small navigation scale preserve the approved hierarchy at desktop and remain legible at 390 px.
- Spacing and layout rhythm: header, hero, two-action row, support line, and lower two-column introduction follow the approved sequence. Desktop alignment, button spacing, section divider, and mobile stacking are stable with no horizontal overflow at 1440, 390, or 320 px.
- Colors and visual tokens: the near-black surface, white typography, restrained grey support copy, FTN red CTA/eyebrows, cyan-violet network lights, and purple ibis match the approved palette. No red bird treatment is present.
- Image quality and asset fidelity: the production asset is the founder-approved 1536 × 1024 PNG with intrinsic proportions preserved. The map and ibis remain sharp at the tested viewports; product-shell imagery uses `object-fit: contain` and does not force low-resolution references into heroes.
- Copy and content: headline, regional subcopy, exactly two hero actions, support line, and “A living network of people, places and purpose.” introduction match the locked brief. Rejected three-action copy is absent.

**Interaction and runtime evidence**

- Primary actions rendered as live controls; “EXPLORE THE ECOSYSTEM” opened the 21-product, six-group directory by keyboard at desktop, 390 px, and 320 px.
- “HELP MY COMMUNITY” remains a live link to Community Connect.
- Reduced-motion mode disables decorative glimmer.
- The full functional release suite passed the homepage state, content, keyboard interaction, responsive overflow, navigation, and browser console/page-error gates in run 156.

**Focused region comparison**

- The combined 1440 × 710 source/build hero comparison confirmed logo/nav scale, headline wrap, CTA order, image subject/crop, purple ibis treatment, and support-line placement.
- The full-view comparison confirmed the lower living-network section and overall vertical composition.
- The 390 × 844 capture confirmed the mobile header, one-column content, full-width actions, clean map crop, and absence of raster-text ghosting.

**Comparison history**

1. Run 155 / artifact `9352055932` — blocked.
   - [P1] Baked reference text and button outlines ghosted behind the live hero copy.
   - [P1] The approved lower “A living network of people, places and purpose.” section was missing, causing the footer to follow the hero immediately.
   - Fixes: strengthened the live-copy masking gradient; shifted and enlarged the mobile artwork crop; added the approved lower intro with a horizon treatment derived from the same approved asset; added a regression assertion for the lower headline.
2. Run 156 / artifact `9352180083` — passed.
   - Post-fix desktop and mobile captures show no ghost text, no missing approved section, no overflow, and no actionable P0/P1/P2 fidelity issue.

**Open Questions**

- None.

**Implementation Checklist**

- [x] Approved source asset used unchanged.
- [x] Live semantic copy and exactly two actions retained.
- [x] Purple ibis and verified Caribbean geography retained.
- [x] Lower living-network section restored.
- [x] Desktop, mobile, keyboard, reduced-motion, console, and overflow checks passed.

**Follow-up Polish**

- No blocking polish remains. Any later motion tuning should preserve reduced-motion behavior and the current quiet, institutional presentation.

final result: passed
