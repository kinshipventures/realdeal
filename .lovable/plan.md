

## Plan: Full Rebrand to Trolley Design System

### Scope

Replace all brand identity - fonts, colors, shape language, and app name - with the Trolley design system. This touches tokens, Google Fonts imports, and ~47 component files that reference `font-serif` or brand colors inline.

### Changes

**1. Google Fonts swap** (`index.html` + `src/index.css`)

Replace Fraunces + Plus Jakarta Sans with:
- **IBM Plex Sans** (body/general) - weights 400, 500, 600
- **Space Mono** (logo/monospaced accents) - weight 400, 700
- **Roboto Condensed** (compact UI text) - weight 400, 500, 600

Note: Solgan and DISKET MONO are not on Google Fonts. IBM Plex Sans becomes the primary body font. For headings that currently use the serif, we switch to IBM Plex Sans bold or Space Mono for brand-forward moments.

Update `<title>` from "RealDeal" to "Trolley".

**2. CSS token overhaul** (`src/index.css` `:root` + dark mode block)

| Token | Current | New |
|---|---|---|
| `--font-serif` | Fraunces | Space Mono (brand accent) |
| `--font-sans` | Plus Jakarta Sans | IBM Plex Sans |
| `--color-brand` | #25B439 | #34B15D (Vibrant Green) |
| `--color-bg` | #F5F4F0 | #F5F5F5 (Off-White) |
| `--color-surface` | #FFFFFF | #FFFFFF |
| `--color-text-primary` | rgba(0,0,0,0.82) | #222222 |
| `--header-band-bg` | #25B439 | #012F6C (Deep Blue) |
| `--header-band-text` | #ffffff | #ffffff |

New tokens to add:
- `--color-deep-blue`: #012F6C
- `--color-soft-purple`: #D2BFFF
- `--color-bright-lime`: #7ED957
- `--color-mint`: #AAECE2
- `--color-deep-indigo`: #312774

Dark mode tokens updated to match (deep blue surfaces, green accents).

**3. Shape language** (`src/index.css`)

- Increase `--panel-radius` from 16px to 20px (rounder, more tactile)
- Add softer shadow tokens aligned with the "soft shadows" direction
- Focus ring color switches to `--color-brand` (green) or `--color-deep-blue`

**4. Heading font references** (~47 component files)

All inline `fontFamily: 'var(--font-serif)'` references remain valid since the CSS variable changes. No component edits needed for the font swap itself - it flows through the token.

However, the visual character changes: headings move from editorial serif to monospaced/technical. This is intentional per the Trolley system.

**5. Brand name references**

- `index.html` title: "RealDeal" -> "Trolley"
- `LandingPage.tsx`: update hero copy, brand name references
- `Sidebar.tsx`: update any "RealDeal" / "Kinship Brain" logo text
- `MojNode.tsx` / hub orb: update label if it shows brand name
- `SharedListPage.tsx`: update brand references

**6. Orb color palette** (`SolidOrb.tsx`)

Update `POD_SHIFT_COLORS` to use Trolley palette derivatives (deep blue, soft purple, mint, lime as shift colors instead of current warm greens).

**7. Tailwind config** (`tailwind.config.ts`)

Update `fontFamily.serif` and `fontFamily.sans` to match new fonts.

### Files modified

- `index.html` - fonts, title
- `src/index.css` - all token values, dark mode, shape tokens
- `tailwind.config.ts` - font family definitions
- `src/components/map/SolidOrb.tsx` - POD_SHIFT_COLORS palette
- `src/components/landing/LandingPage.tsx` - brand copy
- `src/components/nav/Sidebar.tsx` - brand name
- `src/components/map/MojNode.tsx` - hub label

### What stays the same

- Component structure, layout, routing - unchanged
- Interaction patterns (hover, press, drill-down) - unchanged
- All 47 files using `var(--font-serif)` inline - no edits needed, token swap handles it
- Spacing grid, motion curves, accessibility patterns - unchanged

### Risk

- Solgan and DISKET MONO are not available on Google Fonts. Plan uses IBM Plex Sans + Space Mono as closest available alternatives. If you have the font files for Solgan/DISKET MONO, we can self-host them instead.

