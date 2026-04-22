# Arc Brand

## Identity

Arc is a browser that behaves like a place, not a tool. The brand is warm, confident, and a little weird. It treats users as collaborators, not operators. Every surface should feel personal - chosen by the person sitting in front of it, not issued to them.

## Logo

- Wordmark: "Arc" in a rounded, slightly geometric sans. Always lowercase in running copy ("arc"), Title Case in product ("Arc"). Never all caps.
- Mark: a stylized arc / swoosh rendered in the user's chosen gradient. When locked to brand, it uses the signature multi-hue gradient.
- Clear space: reserve at least one cap-height on every side.
- Minimum size: 16px for the mark, 48px for the wordmark.
- Never place the mark on a busy photo without a solid surface behind it.

## Signature colors

| Role | Hex | Use |
|---|---|---|
| Brand Blue | `#3139FB` | Primary action, links |
| Brand Red | `#FF5060` | Live state, record, "new" accents |
| Deep Purple | `#2702C2` | Gradient anchor, hero wash |
| Gradient Purple | `#6E56FF` | Default user gradient stop 0 |
| Gradient Pink | `#FF5CA8` | Default user gradient stop 1 |
| Warm Orange | `#FF8A4C` | Gradient heat stop |
| Sun Yellow | `#FFD447` | Gradient sun stop |
| Teal | `#3DD9C4` | Cool gradient stop |

Observed hex values are inferred. Documented hex values: `#3139FB`, `#FF5060`, `#2702C2`.

## The Arc Gradient

Arc's signature visual is a multi-hue linear gradient that appears in the mark, marketing, and as the backdrop of the app when brand-themed.

```css
background: linear-gradient(
  135deg,
  #2702C2 0%,
  #3139FB 18%,
  #6E56FF 38%,
  #FF5CA8 58%,
  #FF5060 76%,
  #FF8A4C 92%
);
```

Rules:
- Always at a 135deg angle unless the layout demands otherwise.
- Do not add more than six stops. Arc's gradients read cleanly because they respect a small number of bright stops.
- Do not compress it into a button. The gradient is a mood, not a fill. Reserve it for hero surfaces and the app's ambient wash.
- Never pair with another gradient. Monochrome surfaces or neutral glass do the supporting work.

## User gradients

Users pick their own 1- or 2-color "theme" at setup. The chosen color bleeds through the sidebar as ambient color behind a translucent glass surface. The design system should support:

- A solid primary (`--arc-background-gradient-color0`).
- An optional secondary (`--arc-background-gradient-color1`) for a 2-stop gradient, 160deg.
- A translucent overlay material on top so UI legibility survives bold user picks.

## Voice and tone

Arc writes like a friend who has strong opinions and good manners.

Rules:
- First person plural when the product speaks ("we'll remember that for you"), second person when addressing the user ("your Spaces are waiting").
- Sentence case everywhere. Never Title Case headlines. Never ALL CAPS.
- Contractions always. "Don't", "you'll", "it's".
- Playful feature names. Not "Quick Switcher", "AI Assistant", "Extensions". Arc calls them "Little Arc", "Max", "Boosts".
- Short sentences. One idea per line. Leave room for the reader.
- Humor lives in the margins - empty states, tooltips, changelogs - never in error states where the user is stuck.
- No hedging. "This might help" becomes "Try this".
- No corporate throat-clearing. No "powered by AI", no "best-in-class", no "revolutionary".

## Copy patterns

### Naming

Name features like you'd name a pet or a small character. Short, concrete, slightly whimsical.

| Pattern | Example | Not |
|---|---|---|
| Small thing as character | "Little Arc" | "Quick View" |
| AI as a person | "Max" | "AI Assistant" |
| Customization as action | "Boosts" | "Themes" |
| Place as metaphor | "Spaces" | "Workspaces" |
| Shelving as metaphor | "Archive" | "History" |

### Empty states

Reassure, then give one concrete action. Never more.

Good: "Nothing pinned yet. Drag a tab here to keep it close."
Bad: "You don't have any pinned items. Click the + button in the toolbar above to pin tabs, bookmarks, folders, and more."

### Error states

Acknowledge, explain, offer a next step. Skip apologies.

Good: "That page didn't load. Check your connection, or try again."
Bad: "We're sorry, an error occurred while loading the page you requested."

### Changelogs ("Arc Release Notes")

Written like a personal letter. Casual headers, story arcs, playful screenshots. Each release has a theme, not a bullet list. This is where Arc's voice is loudest - permission to be strange.

### Marketing headlines

Declarative, emotional, under 8 words.

- "Meet Arc."
- "A browser that cares."
- "Make the internet your home."

## Typography

Confirmed from raw CSS on arc.net and thebrowser.company (April 2026).

### Marketing - arc.net

| Slot | Font | Foundry | License | Evidence |
|---|---|---|---|---|
| Display / hero (weight 800) | Marlin | Custom / Typeverything | Proprietary | `@font-face{font-family:Marlin;font-weight:800;src:url(/fonts/marlin.woff2)}` in `arc.net/_next/static/css/df28c1bc1b1a6c7d.css` |
| Body copy (400 roman + italic) | Marlin Soft Basic | Wild Type Studio / Typeverything | Commercial | same CSS, `MarlinSoftBasic-Regular.otf`, `MarlinSoftBasic-RegularItalic.otf` |
| Mono / code | Space Mono | Colophon Foundry (via Google Fonts) | Free (OFL) | `<link href="fonts.googleapis.com/css2?family=Space+Mono">` in arc.net HTML |

### Corporate - thebrowser.company

| Slot | Font | Foundry | License | Evidence |
|---|---|---|---|---|
| Display / UI (400-700) | Ivar Text | Letters from Sweden | Commercial | `IvarText-Regular.otf`, `-Medium`, `-SemiBold`, `-Bold` in `/_next/static/css/835cecb91fb7717e.css` |
| Mono / accent | ABC Diatype Mono | Dinamo Typefaces | Commercial | `ABCDiatypeMono-Regular.woff2` in same CSS |
| Fallback body | Inter | Rasmus Andersson | Free (OFL) | bundled as `/_next/static/media/inter-latin-400-normal` |

### Product UI (Arc browser app)

The Arc app renders with system fonts - `-apple-system` / SF Pro on macOS, Segoe UI on Windows. No custom UI face is bundled with the app shell; custom faces only appear inside web content served from arc.net.

### Free substitutes

| Proprietary | Free alternative | Why |
|---|---|---|
| Marlin (display, 800) | **Space Grotesk** (Florian Karsten, OFL) | Same geometric-humanist DNA, open counters, comparable x-height, quirky single-story `a`. Drop-in replacement for hero display. |
| Marlin Soft Basic (body) | **Inter** (OFL) | Neutral grotesque that sits quietly under Space Grotesk display; Arc's own fallback stack already includes it. |
| Ivar Text (corporate body) | **EB Garamond** (OFL) or **Source Serif 4** (OFL) | Old-style serif with warm transitional tone, similar stroke contrast and readable at text sizes. EB Garamond is already loaded on thebrowser.company. |
| ABC Diatype Mono | **JetBrains Mono** (OFL) | Neo-grotesque monospace, rounded terminals, large x-height, designed for screen use. |
| Space Mono (already free) | keep as-is | OFL via Google Fonts. |

## Iconography

- Style: SF Symbols-aligned. Thin to regular weight, rounded joins, consistent optical size.
- Sizes: 14px (inline), 16px (sidebar), 20px (toolbar), 24px (header).
- Color: mono by default, using `--arc-palette-foreground-primary`. Only hero icons get the brand gradient.
- Never ship emoji as UI icons. Emoji is fine for user-authored labels (folder titles, Space names).
- Never mix icon weights in a single row.
