# FTN UX Guardian Report

Generated: 2026-09-18T03:16:37.488Z
Base: http://127.0.0.1:3000

> Adapted from ov3rf1w/ui-responsive-audit (MIT, pinned d6ef99425b51c2c0399593f1b59ef80e86988fde) and informed by Sakaax/ux-pilot (MIT)'s documented UX-rule categories. Real rendered-output audit, not a linter.

## BLOCKER (0)

None.

## MAJOR (27)

| Route | Breakpoint | Rule | Message |
|---|---|---|---|
| /ibis-ai/ | laptop-1366x768 | suspect-dead-control | 1 prominent control(s) with no href/type=submit/onclick/data-action attribute -- verify manually, this is a heuristic not a proof |
| /ibis-ai/ | small-desktop-1280x720 | suspect-dead-control | 1 prominent control(s) with no href/type=submit/onclick/data-action attribute -- verify manually, this is a heuristic not a proof |
| /ibis-ai/ | small-laptop-1024x768 | suspect-dead-control | 1 prominent control(s) with no href/type=submit/onclick/data-action attribute -- verify manually, this is a heuristic not a proof |
| /ibis-ai/ | tablet-portrait-768x1024 | suspect-dead-control | 1 prominent control(s) with no href/type=submit/onclick/data-action attribute -- verify manually, this is a heuristic not a proof |
| /ibis-ai/ | phone-430x932 | suspect-dead-control | 1 prominent control(s) with no href/type=submit/onclick/data-action attribute -- verify manually, this is a heuristic not a proof |
| /ibis-ai/ | phone-393x852 | suspect-dead-control | 1 prominent control(s) with no href/type=submit/onclick/data-action attribute -- verify manually, this is a heuristic not a proof |
| /ibis-ai/ | phone-small-360x800 | suspect-dead-control | 1 prominent control(s) with no href/type=submit/onclick/data-action attribute -- verify manually, this is a heuristic not a proof |
| /scenario-workspace/ | laptop-1366x768 | hero-occupancy | Hero/banner consumes 91.4% of the laptop-1366x768 viewport (budget 75%) -- product content pushed below the fold |
| /scenario-workspace/ | laptop-1366x768 | first-viewport-chrome | Header + hero together consume 98.8% of the laptop-1366x768 viewport (budget 62%) -- the first screen is mostly chrome/title, not product content |
| /scenario-workspace/ | small-desktop-1280x720 | hero-occupancy | Hero/banner consumes 97.5% of the small-desktop-1280x720 viewport (budget 75%) -- product content pushed below the fold |
| /scenario-workspace/ | small-desktop-1280x720 | first-viewport-chrome | Header + hero together consume 105.4% of the small-desktop-1280x720 viewport (budget 62%) -- the first screen is mostly chrome/title, not product content |
| /scenario-workspace/ | small-laptop-1024x768 | hero-occupancy | Hero/banner consumes 91.4% of the small-laptop-1024x768 viewport (budget 75%) -- product content pushed below the fold |
| /scenario-workspace/ | small-laptop-1024x768 | first-viewport-chrome | Header + hero together consume 99.3% of the small-laptop-1024x768 viewport (budget 62%) -- the first screen is mostly chrome/title, not product content |
| /scenario-workspace/ | tablet-portrait-768x1024 | first-viewport-chrome | Header + hero together consume 80.0% of the tablet-portrait-768x1024 viewport (budget 75%) -- the first screen is mostly chrome/title, not product content |
| /scenario-workspace/ | phone-430x932 | hero-occupancy | Hero/banner consumes 120.8% of the phone-430x932 viewport (budget 92%) -- product content pushed below the fold |
| /scenario-workspace/ | phone-430x932 | first-viewport-chrome | Header + hero together consume 127.4% of the phone-430x932 viewport (budget 85%) -- the first screen is mostly chrome/title, not product content |
| /scenario-workspace/ | phone-393x852 | hero-occupancy | Hero/banner consumes 140.6% of the phone-393x852 viewport (budget 92%) -- product content pushed below the fold |
| /scenario-workspace/ | phone-393x852 | first-viewport-chrome | Header + hero together consume 147.8% of the phone-393x852 viewport (budget 85%) -- the first screen is mostly chrome/title, not product content |
| /scenario-workspace/ | phone-small-360x800 | hero-occupancy | Hero/banner consumes 158.8% of the phone-small-360x800 viewport (budget 92%) -- product content pushed below the fold |
| /scenario-workspace/ | phone-small-360x800 | first-viewport-chrome | Header + hero together consume 166.4% of the phone-small-360x800 viewport (budget 85%) -- the first screen is mostly chrome/title, not product content |
| /tv/ | laptop-1366x768 | suspect-dead-control | 7 prominent control(s) with no href/type=submit/onclick/data-action attribute -- verify manually, this is a heuristic not a proof |
| /tv/ | small-desktop-1280x720 | suspect-dead-control | 7 prominent control(s) with no href/type=submit/onclick/data-action attribute -- verify manually, this is a heuristic not a proof |
| /tv/ | small-laptop-1024x768 | suspect-dead-control | 7 prominent control(s) with no href/type=submit/onclick/data-action attribute -- verify manually, this is a heuristic not a proof |
| /tv/ | tablet-portrait-768x1024 | suspect-dead-control | 7 prominent control(s) with no href/type=submit/onclick/data-action attribute -- verify manually, this is a heuristic not a proof |
| /tv/ | phone-430x932 | suspect-dead-control | 7 prominent control(s) with no href/type=submit/onclick/data-action attribute -- verify manually, this is a heuristic not a proof |
| /tv/ | phone-393x852 | suspect-dead-control | 7 prominent control(s) with no href/type=submit/onclick/data-action attribute -- verify manually, this is a heuristic not a proof |
| /tv/ | phone-small-360x800 | suspect-dead-control | 7 prominent control(s) with no href/type=submit/onclick/data-action attribute -- verify manually, this is a heuristic not a proof |

## MINOR (63)

| Route | Breakpoint | Rule | Message |
|---|---|---|---|
| / | laptop-1366x768 | small-tap-target | 5 interactive element(s) smaller than 44px |
| / | small-desktop-1280x720 | small-tap-target | 5 interactive element(s) smaller than 44px |
| / | small-laptop-1024x768 | small-tap-target | 5 interactive element(s) smaller than 44px |
| / | tablet-portrait-768x1024 | small-tap-target | 5 interactive element(s) smaller than 44px |
| / | phone-430x932 | small-tap-target | 5 interactive element(s) smaller than 44px |
| / | phone-393x852 | small-tap-target | 5 interactive element(s) smaller than 44px |
| / | phone-small-360x800 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /ibis-ai/ | laptop-1366x768 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /ibis-ai/ | small-desktop-1280x720 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /ibis-ai/ | small-laptop-1024x768 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /ibis-ai/ | tablet-portrait-768x1024 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /ibis-ai/ | phone-430x932 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /ibis-ai/ | phone-393x852 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /ibis-ai/ | phone-small-360x800 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /applications/ | laptop-1366x768 | small-tap-target | 6 interactive element(s) smaller than 44px |
| /applications/ | small-desktop-1280x720 | small-tap-target | 6 interactive element(s) smaller than 44px |
| /applications/ | small-laptop-1024x768 | small-tap-target | 6 interactive element(s) smaller than 44px |
| /applications/ | tablet-portrait-768x1024 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /applications/ | phone-430x932 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /applications/ | phone-393x852 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /applications/ | phone-small-360x800 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /scenario-workspace/ | laptop-1366x768 | small-tap-target | 6 interactive element(s) smaller than 44px |
| /scenario-workspace/ | small-desktop-1280x720 | small-tap-target | 6 interactive element(s) smaller than 44px |
| /scenario-workspace/ | small-laptop-1024x768 | small-tap-target | 6 interactive element(s) smaller than 44px |
| /scenario-workspace/ | tablet-portrait-768x1024 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /scenario-workspace/ | phone-430x932 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /scenario-workspace/ | phone-393x852 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /scenario-workspace/ | phone-small-360x800 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /learn/ | laptop-1366x768 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /learn/ | small-desktop-1280x720 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /learn/ | small-laptop-1024x768 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /learn/ | tablet-portrait-768x1024 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /learn/ | phone-430x932 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /learn/ | phone-393x852 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /learn/ | phone-small-360x800 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /parliament/ | laptop-1366x768 | small-tap-target | 6 interactive element(s) smaller than 44px |
| /parliament/ | small-desktop-1280x720 | small-tap-target | 6 interactive element(s) smaller than 44px |
| /parliament/ | small-laptop-1024x768 | small-tap-target | 6 interactive element(s) smaller than 44px |
| /parliament/ | tablet-portrait-768x1024 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /parliament/ | phone-430x932 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /parliament/ | phone-393x852 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /parliament/ | phone-small-360x800 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /riddim/ | laptop-1366x768 | small-tap-target | 6 interactive element(s) smaller than 44px |
| /riddim/ | small-desktop-1280x720 | small-tap-target | 6 interactive element(s) smaller than 44px |
| /riddim/ | small-laptop-1024x768 | small-tap-target | 6 interactive element(s) smaller than 44px |
| /riddim/ | tablet-portrait-768x1024 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /riddim/ | phone-430x932 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /riddim/ | phone-393x852 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /riddim/ | phone-small-360x800 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /tv/ | laptop-1366x768 | small-tap-target | 6 interactive element(s) smaller than 44px |
| /tv/ | small-desktop-1280x720 | small-tap-target | 6 interactive element(s) smaller than 44px |
| /tv/ | small-laptop-1024x768 | small-tap-target | 6 interactive element(s) smaller than 44px |
| /tv/ | tablet-portrait-768x1024 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /tv/ | phone-430x932 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /tv/ | phone-393x852 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /tv/ | phone-small-360x800 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /kaiso/ | laptop-1366x768 | small-tap-target | 6 interactive element(s) smaller than 44px |
| /kaiso/ | small-desktop-1280x720 | small-tap-target | 6 interactive element(s) smaller than 44px |
| /kaiso/ | small-laptop-1024x768 | small-tap-target | 6 interactive element(s) smaller than 44px |
| /kaiso/ | tablet-portrait-768x1024 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /kaiso/ | phone-430x932 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /kaiso/ | phone-393x852 | small-tap-target | 5 interactive element(s) smaller than 44px |
| /kaiso/ | phone-small-360x800 | small-tap-target | 5 interactive element(s) smaller than 44px |
