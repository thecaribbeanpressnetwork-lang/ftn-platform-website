# FTN Presentation Profile Catalogue

Version: 1.0  
Status: Founder Working Draft

## Purpose

Define the reusable presentation profiles that allow one FTN data and intelligence system to serve web, phone, television, public display, broadcast, executive, educational, and future environments without duplicating the underlying truth, methodology, or indicator engines.

## Governing Principle

Presentation may adapt to context. Truth may not.

The same indicator can be simplified, enlarged, narrated, grouped, rotated, or translated for different audiences, but its source, methodology, benchmark, confidence, and classification must remain consistent.

## Profile Inputs

Every presentation profile may be described by the following dimensions:

- Audience
- Venue
- Screen type
- Screen size
- Orientation
- Viewing distance
- Ambient light
- Interaction type
- Dwell time
- Reading level
- Information density
- Motion tolerance
- Content priority
- Advertising allowance
- Rotation behaviour
- Accessibility needs
- Connectivity
- Hardware performance
- Brand layer
- Emergency override status

## Viewing Distance Bands

1. Personal: 0.25–0.75 m
2. Near: 0.75–1.5 m
3. Room: 1.5–3 m
4. Lobby: 3–6 m
5. Hall: 6–12 m
6. Large Venue: 12–20 m
7. Outdoor Long-Range: 20 m+

The Presentation Engine should use viewing distance to determine:

- Minimum primary-value font size
- Maximum text length
- Maximum simultaneous indicators
- Chart-detail level
- Line thickness
- Icon size
- Contrast level
- Animation speed
- Slide duration
- Source-detail visibility
- Number of advertisements
- Call-to-action size

## Screen Orientations

- Mobile portrait
- Mobile landscape
- Tablet portrait
- Tablet landscape
- Desktop landscape
- Television landscape 16:9
- Television portrait 9:16
- Ultra-wide
- Square
- Video wall
- Projector
- Outdoor high-brightness display
- Broadcast frame
- YouTube Live frame

## Behaviour Modes

1. Fixed Page
2. Ordered Rotation
3. Random Rotation
4. Weighted Random Rotation
5. Scheduled Rotation
6. Time-of-Day Rotation
7. Event-Driven Rotation
8. Seasonal Rotation
9. Emergency Override
10. Two-Statistic Story Mode
11. Multi-Panel Observatory Mode
12. Ticker Ribbon Mode
13. Deep-Dive Interactive Mode
14. Broadcast Mode
15. Companion QR Mode

## Reading Pace Rules

The display duration should be derived from content complexity rather than a single global timer.

Suggested baseline:

- Single number: 5–7 seconds
- Two related numbers: 8–12 seconds
- Number plus comparison: 10–14 seconds
- Short explanation: 12–18 seconds
- Chart or relationship: 15–24 seconds
- Educational slide: 20–35 seconds
- Emergency alert: persistent until cleared or acknowledged

The system should allow a configurable comprehension buffer beyond the calculated reading time.

## Core Presentation Profiles

### 1. Public Web

Audience: General public  
Interaction: Full  
Distance: Personal/Near  
Density: Balanced  
Behaviour: Scroll, search, discover  
Advertising: High to moderate  
Primary objective: Encourage daily return and exploration

### 2. Mobile Public

Audience: General public  
Interaction: Touch  
Orientation: Portrait-first  
Density: Minimal to balanced  
Primary objective: Fast comprehension, thumb-friendly interaction, strong trust-card access

### 3. Desktop Observatory

Audience: Citizens, journalists, professionals, researchers  
Interaction: Full  
Density: Balanced to dense  
Primary objective: Exploration, comparison, context, history

### 4. Bank Lobby Landscape

Audience: Broad public  
Distance: 3–8 m  
Density: Balanced  
Behaviour: Ordered or weighted rotation  
Content: Economy, weather, population, cost of living, public interest, conversation starters  
Advertising: Package-dependent  
Primary objective: High attention without visual stress

### 5. Bank Counter/Queue Portrait

Audience: Queueing customers  
Orientation: Portrait  
Distance: 2–6 m  
Behaviour: Two-statistic story mode  
Primary objective: Long dwell-time education and conversation

### 6. Airport Gate Landscape

Audience: Travellers  
Distance: 3–10 m  
Content: Weather, exchange, tourism, transport, current events, destination context  
Behaviour: Rotation  
Primary objective: Useful national context during waiting time

### 7. Airport Portrait Companion

Audience: Passengers  
Orientation: Portrait  
Content: Tourism, exchange, weather, traffic, national facts  
Primary objective: Sit visually beside arrivals/departures infrastructure without competing with it

### 8. Hotel Lobby

Audience: Visitors and local guests  
Content: Weather, events, tourism, transport, exchange, cultural facts  
Tone: Elegant and welcoming  
Advertising: Hospitality and local partners

### 9. Corporate Reception

Audience: Clients, staff, investors  
Tone: Executive  
Content: Economy, sector indicators, company-selected feeds, FTN insights  
Behaviour: Fixed or slow rotation

### 10. Government Office

Audience: Public and staff  
Tone: Neutral and institutional  
Advertising: None or public-service only  
Content: Public information, services, national indicators, emergency notices

### 11. Hospital Waiting Room

Audience: Patients and families  
Tone: Calm  
Motion: Reduced  
Content: Weather, health education, neutral national facts, service notices  
Avoid: Alarming presentation, rapid animation, distressing crime content

### 12. University

Audience: Students, staff, researchers  
Content: Economy, climate, demographics, research, public policy, education  
Behaviour: Educational rotation  
Interaction: Optional QR deep dive

### 13. School / Kids Mode

Audience: Children  
Reading level: Simplified  
Content: Comparisons, maps, science, environment, community, national milestones  
Tone: Curious, never childish  
Motion: Gentle and purposeful  
Primary objective: Civic and statistical literacy

### 14. Teen Mode

Audience: Teenagers  
Content: Jobs, education, technology, climate, public life, cost of living, entrepreneurship  
Tone: Direct and respectful  
Primary objective: Connect national data to future opportunity

### 15. Bar / Restaurant

Audience: Social patrons  
Content: Weather, sports, events, transport, lifestyle statistics, tourism, conversation starters  
Advertising: High or shared-network  
Behaviour: Faster rotation, time-of-day aware

### 16. Retail / Mall

Audience: Shoppers  
Content: Weather, events, public information, tourism, consumer-interest indicators  
Advertising: High  
Primary objective: Attention and sponsor value

### 17. Outdoor Sunlight Mode

Environment: Direct or high ambient light  
Requirements:
- Maximum contrast
- Large type
- Thick chart strokes
- Minimal gradients
- Minimal shadows
- Simplified panels
- Strong outlines
- Reduced fine print
- Automatic low-detail mode
- No subtle colour-only distinctions

### 18. Night / Low-Light Mode

Requirements:
- Reduced luminance
- Dark surfaces
- Controlled red usage
- No pure-white glare
- Slow transitions

### 19. YouTube Live

Audience: Remote public  
Format: Broadcast-safe 16:9  
Behaviour: Continuous rotation  
Requirements:
- No browser chrome
- Stable long-duration operation
- Safe-title areas
- Consistent FTN identity
- Clear sponsor labelling
- Audio-optional design
- Scene rotation support
- No reliance on user interaction

### 20. Executive Presentation

Audience: Ministers, mayors, CEOs, boards, investors  
Content: Few high-value indicators, relationships, scenario summaries  
Density: Low  
Tone: Calm and authoritative  
Behaviour: Presenter-controlled or fixed

### 21. Mission Control Wall

Audience: Authorized operational users  
Density: High but structured  
Content: Risks, opportunities, indicators, maps, relationships, alerts  
Advertising: None  
Behaviour: Fixed or event-driven

### 22. Emergency Override

Audience: Any  
Priority: Highest  
Content: Verified emergency information  
Behaviour: Interrupt all other programming  
Requirements:
- Clear source
- Timestamp
- Geographic scope
- Expiry
- Accessibility
- Manual revocation
- Audit log in future backend

## Visual Modes

- Standard Light
- Standard Dark
- Sunlight
- Night
- High Contrast
- Colour-Vision Safe
- Reduced Motion
- Corporate
- Executive
- Broadcast
- Educational
- Kids
- Teen
- Calm Healthcare
- Tourism/Hospitality
- Emergency

## Profile Selection Questions

The configuration flow should eventually ask:

1. Where will the display be installed?
2. Is it indoors, outdoors, shaded, or in direct sunlight?
3. What is the screen orientation?
4. What is the screen size?
5. How far away is the average viewer?
6. How long will viewers usually remain nearby?
7. Can viewers interact with the screen?
8. Who is the main audience?
9. Should content remain fixed, rotate in order, or rotate randomly?
10. How many statistics should appear at once?
11. How many advertisements are permitted?
12. Is customer branding required?
13. Is sound available?
14. Is the display intended for broadcast?
15. Are accessibility profiles required?
16. Should emergency override be supported?

## Reusable Engine Requirements

The future Presentation Engine should accept a profile and produce:

- Grid structure
- Typography scale
- Density
- Slide duration
- Content ranking
- Colour mode
- Motion level
- Ad allocation
- Source-detail level
- Trust-card availability
- QR companion behaviour
- Emergency behaviour
- Orientation-specific layout

## Founder Signature Principle

FTN presentation should reflect systems thinking, long-term vision, curiosity, elegance, evidence, and butterfly effects: small insights creating better conversations, better decisions, and larger national improvement.
