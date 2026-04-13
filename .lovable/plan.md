

# Spotlight-style Search Palette

## What changes

Redesign `SearchPalette.tsx` to feel like macOS Spotlight / Apple's liquid glass aesthetic:

### Visual overhaul
- **Larger, centered modal** - wider (540px), positioned ~15vh from top instead of 20vh
- **Liquid glass backdrop** - heavier blur (24px), lighter tint with subtle border glow
- **Bigger search input** - 20px font, taller padding (20px), with a subtle SF-style search icon
- **Rounded pill container** - 24px border-radius, frosted glass background with translucent white/gray
- **Result rows** - taller (48px), with smooth highlight transitions instead of instant background swap
- **Active row highlight** - soft rounded selection indicator with subtle scale, like Spotlight's blue highlight but using the brand accent
- **Type section headers** - smaller, more muted, with thin divider lines
- **Keyboard shortcut hint** - show "ESC" pill in the input area to dismiss

### Interaction polish
- **Smoother entrance animation** - scale from 0.95 with a spring-like ease curve (200ms)
- **Result hover/active transitions** - CSS transitions on background color (120ms)
- **Empty state** - centered, with a subtle icon and "No results found" in muted text
- **Initial state** (no query) - show recent/suggested items or a hint like "Search people, pods, campaigns..."
- **Type icons** - render actual SVG icons next to each result row (person, building, circle, chart, grid)

### Layout
- Search icon + input + ESC badge in the header
- Scrollable results area with type-grouped sections
- Each row: type icon + name (medium weight) + subtitle (muted, right-aligned)
- Active row gets accent background with white text

## Files modified
- `src/components/search/SearchPalette.tsx` - full visual + interaction rewrite

## Technical approach
- All styling stays inline (matching codebase convention)
- CSS keyframes for entrance animation
- CSS transitions via inline style objects for hover states
- No new dependencies

