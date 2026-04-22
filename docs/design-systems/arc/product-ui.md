# Arc Product UI Patterns

## Window frame

The browser window is a floating pane. The web content sits inside a rounded rectangle with a small inset gap to the sidebar and an even smaller gap to the top edge.

- Outer window corner radius: 14px (observed, matches macOS window).
- Inner content corner radius: 10px.
- Inset padding around content: 8px on all sides.
- Background behind the content is the user gradient (or brand gradient), slightly dimmed. This is the "scrim" / "room" that Dustin Senos describes: the light around the window matters as much as the window itself.

## Sidebar

The single most identifiable Arc surface. Always left-aligned. Vertical, collapsible, keyboard-navigable.

### Dimensions

| Property | Value |
|---|---|
| Default width | 240px |
| Min width | 200px |
| Max width | 320px |
| Horizontal padding | 8px |
| Item height | 30px |
| Item horizontal padding | 10px |
| Gap between items | 2px |
| Section gap | 14px |
| Corner radius on items | 6px |

### Material

Sidebar sits on top of the user gradient. The visible surface is a translucent white (light) / black (dark) with heavy backdrop-filter blur and saturation.

```css
background: var(--arc-sidebar-surface);
backdrop-filter: var(--arc-blur-sidebar); /* blur(28px) saturate(180%) */
```

### Three tab tiers

Sidebar content is organized top to bottom:

1. Favorites - pinned, square, icon-only, sit in a 4-column grid at the top. Survive Space switches.
2. Pinned tabs - named, stick around permanently in the current Space.
3. Today tabs - the transient zone. Auto-archive after 12 hours by default. This is the "cleanup happens for you" move.

A thin divider (`rgba(255,255,255,0.22)`) separates each tier.

### Sidebar item anatomy

- Favicon (16px), 8px gap, title (single line, `text-sm`, weight 500 for active, 400 for idle).
- Hover: background shifts to `--arc-sidebar-surface-hover`. No transform.
- Active: background `--arc-sidebar-surface-active`, subtle inner highlight.
- Long-press / right click: radial action menu.
- Drag: item lifts 2px and gains a soft shadow. Drop targets outline in the Space's accent color.

## Command Bar (Cmd+T)

The command bar is Arc's "front door". Cmd+T opens it from anywhere. It's not just navigation - it's the universal input for search, new tabs, actions, quick switch, and AI.

### Layout

- Centered horizontally, offset 22% from the top of the window.
- Width: 560px - 680px depending on content.
- Min height: 56px. Grows to 420px when showing suggestions.
- Background: `--arc-palette-background-extra` with `--arc-blur-modal`.
- Corner radius: 16px.
- Shadow: `--arc-shadow-lg`.
- Border: `--arc-border-hairline`.

### Input

- Font: `--arc-font-ui` at 16px, weight 400.
- Placeholder: single sentence, first-person. "Search or ask anything."
- Icon on the left rotates / morphs based on active mode (search, URL, AI, action).

### Entry animation

See `motion.md`. In short: the bar fades in, scales from 0.96 to 1.0 with a spring overshoot, and a colored glow bursts then collapses. Total sequence ~560ms.

### Suggestion rows

- 40px tall.
- Leading: 20px symbol or favicon.
- Trailing: small secondary type (domain, keyboard hint).
- Active row: filled pill with `--arc-palette-hover` and a 3-character keyboard hint on the right.

## Spaces

A Space is a full context - its own tabs, pinned tabs, and theme color. Users switch between Spaces via swipe, keyboard (Ctrl+1/2/3), or clicking the Space dots at the bottom of the sidebar.

### Space dots

- A horizontal row of circles at the bottom of the sidebar, each in its Space's gradient.
- 16px diameter, 10px gap.
- Active Space: outlined in `--arc-palette-cutout` with a tiny bump scale (1.1).

### Space switch motion

The whole sidebar - tabs, pinned tabs, even the ambient gradient - slides horizontally while the content pane cross-fades. Duration 380ms with `--arc-ease-in-out`. The effect is theatrical: you are moving rooms, not tabs.

### Theme per Space

Each Space can carry its own 1- or 2-stop user gradient. The sidebar ambient color, the Space dot, and any active-tab accents re-derive from the Space's gradient automatically.

## Little Arc

A mini browser window that opens when you click a link from an external app. Sized roughly 820 x 620px. Rounded corners (20px). Appears with a spring scale from the cursor position.

- No sidebar. Just a minimal chrome: back, forward, URL, and a "Send to..." button that pushes the page to a Space.
- Closes with Esc or the "Send" action.
- Copy style: "Want to keep this? Send it to a Space." The option to dismiss is framed positively, not as "cancel".

## Boosts

Per-site user customizations - change fonts, swap colors, hide elements, inject CSS/JS.

### Editor

- Opens as a right-docked panel inside the current tab. Width ~320px.
- Top row: avatar of the site (favicon), site name, toggle switch.
- Sections: Font, Color, Zap (hide elements), Code.
- Each section uses chunky controls with generous padding - closer to a consumer preferences app than a dev tool.

### Voice

Even the editor speaks in Arc's voice. "Paint this site." "Zap the ad." "Make it yours."

## Split View

Two web views side by side in one tab.

- 50/50 default split with a draggable divider.
- Divider: 4px wide, `--arc-palette-min-contrast`. Hover expands hit area to 16px.
- Each pane has a subtle `--arc-shadow-sm` + 10px inner radius.
- Close a pane by dragging the divider fully to one edge.

## Pinned tabs

Pinned tabs keep their scroll position and reload intelligently. In the sidebar they appear between Favorites and Today, with a small pin icon on hover.

- Unread pinned tab: small dot on the favicon corner in the Space accent color.
- Long-unread: the whole row gets a soft ambient glow in the Space accent.

## Archive (auto-cleanup)

Today tabs auto-archive after 12 hours. This is load-bearing behavior: it makes the "mess" disappear without the user acting.

- UI: nothing. The tab just leaves.
- Undo path: `Cmd+Shift+T` to reopen, or open Archive from the Library.
- Copy in the Library: "Nothing's lost. Just put away."

## Library

The long-term shelf: downloads, archived tabs, Easels, Notes, Boosts, screenshots. Opened from the sidebar footer. Full-window takeover with a left-nav of categories.

## Tab peek on hover

Hovering an item shows a large thumbnail preview after ~450ms delay, floating to the right of the sidebar. This is the signature "content follows intent" pattern.

## Keyboard-first principles

- Every major surface has a shortcut. Cmd+T (command bar), Cmd+S (toggle sidebar), Cmd+L (focus URL), Ctrl+Tab (next Space), Cmd+Opt+N (new Little Arc).
- Shortcuts are always visible in tooltips and command bar suggestion rows, right-aligned, secondary-weight.
- If a feature needs a mouse-only path, the design is wrong.
