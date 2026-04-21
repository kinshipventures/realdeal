# Real Deal - Design System

## Product Direction

Real Deal should feel like a calm command surface for the day.

The right mix is:
- Dia's calm, report-like clarity
- Arc's shell, framing, and product feel
- Real Deal's practical daily utility

This is not a loud dashboard and not an internal admin tool.
It should feel composed, premium, and useful.

## Core Rules

- Design the shell before the cards.
- Start the home screen with one clear daily thesis.
- Keep the base UI warm and neutral.
- Use green as framing, not wallpaper.
- Do not give every module the same weight.

## Visual Direction

### Mood

- Calm
- Focused
- Premium
- Light, not sterile
- Structured, not busy

### What The App Should Feel Like

- A morning report with controls
- A designed environment
- A place to decide what matters fast

### What To Avoid

- Big green sections that take over the whole screen
- Generic dashboard gradients
- Equal-weight cards from top to bottom
- Too many pills, chips, and boxed stats
- Styling that feels like a prettier admin panel

## Typography

- Display and hero: Instrument Serif
- Body and UI: Instrument Sans
- Data accents and timestamps: Space Mono, used sparingly

### Type Scale

| Usage | Size | Weight | Font |
|---|---|---|---|
| Hero thesis | 48-56px | 400-500 | Instrument Serif |
| Page title | 32-40px | 500 | Instrument Serif |
| Section title | 22-28px | 500 | Instrument Serif |
| Card title | 17-20px | 500-600 | Instrument Sans |
| Body | 14-16px | 400-500 | Instrument Sans |
| Secondary body | 13-14px | 400-500 | Instrument Sans |
| Meta / status | 11-12px | 500-600 | Instrument Sans / Space Mono |

## Color

### Base Palette

- Page background: `#FAF8F4`
- Elevated wash: `#F2EEE7`
- Soft divider: `#E1D9CD`
- Muted text: `#B2AAA0`
- Secondary text: `#6F675F`
- Primary ink: `#201D1A`

### Shell And Signal

- Primary shell accent: `#3147FF`
- Secondary shell tint: `#EDEBFF`
- Brand framing green: `#25B439`

### Support Accents

- Thesis highlight: `#FFF1C7`
- Info wash: `#C9E7FF`
- Watch state: `#F4D3D8`

### Usage Rules

- Blue is for cooler shell moments, selection, and secondary framing.
- Green is allowed in the shell, top framing, success states, and a few high-confidence actions.
- Most surfaces should stay neutral.
- Do not flood the page with brand color.

## Layout

- Editorial opening at the top
- Disciplined app grid below
- 12-column desktop structure
- Strong left rail
- One dominant action area above the fold

### Home Screen Order

1. Show the daily thesis.
2. Show what needs action now.
3. Show waiting, drift, and movement.

If a section is not changing the next hour, it should not dominate the first screen.

## Surfaces

- Base surfaces should be light, warm, and low-contrast.
- Use shell tint and blur on large containers, nav, and overlays.
- Green-tinted framing is allowed for the rail and top shell moments.
- Card borders should be soft but visible.
- Shadows should be broad and subtle.

### Surface Tokens

- `surface-base`: `rgba(255,255,255,0.70)`
- `surface-elevated`: `rgba(255,255,255,0.86)`
- `surface-shell`: `rgba(237,235,255,0.55)`
- `surface-overlay`: `rgba(255,255,255,0.62)`
- `border-soft`: `rgba(32,29,26,0.08)`
- `border-strong`: `rgba(32,29,26,0.14)`
- `shadow-soft`: `0 12px 40px rgba(24, 20, 16, 0.08)`
- `shadow-shell`: `0 20px 80px rgba(49, 71, 255, 0.10)`

## Key Components

### Left Rail

- It should feel like part of the product identity.
- Use green-tinted shell treatment or a soft framed treatment.
- Keep it quieter than the main content.
- Active states should feel selected by the shell, not just highlighted with a pill.

### Thesis Band

- One strong statement about the day
- One supporting line
- Two or three compact summary signals
- This is the calmest and most editorial part of the screen
- A restrained green frame can support this area without turning it into a hero banner

### Cards

- Cards should feel like grouped report sections
- Lower the fill contrast
- Reduce visual clutter inside each card
- Keep labels quieter than the main content

### Status And Tags

- Use strong color only when the state matters
- Default tags should lean neutral
- Save the strongest saturation for framing, urgency, readiness, and selection

## Motion

- Keep motion quiet and helpful
- Use it for orientation, not decoration
- Panels should glide in
- Hover states should be polished but subtle

### Motion Tokens

- Enter: `cubic-bezier(0.2, 0.8, 0.2, 1)`
- Exit: `cubic-bezier(0.4, 0, 0.2, 1)`
- Move: `cubic-bezier(0.22, 1, 0.36, 1)`
- Micro: `80ms`
- Short: `160ms`
- Medium: `240ms`
- Long: `360ms`

## Copy

- Keep the voice direct and calm.
- Headings should be short and confident.
- Support text should reduce stress and make the next move obvious.

## Build Priorities

1. Redesign the shell and left rail.
2. Replace the current opening with a stronger thesis band.
3. Rebalance module weight on the home screen.
4. Keep green in the frame, but let neutrals carry the main reading surfaces.
5. Tighten type and spacing before adding effects.

## Source Of Truth

`DESIGN.md` is the main design direction document.
Use this file as the quicker implementation guide.
