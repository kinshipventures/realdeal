# Arc Design Principles

Arc's visual language is the consequence of five opinions about how software should feel. If your design reads as "generic", it's usually because it's missing one of these.

## 1. Calm

Arc stays quiet until the user acts. There are no persistent notifications, no red badges begging for attention, no default modals greeting you at launch. The sidebar is a single material with a user-chosen wash behind it. Content is the loudest thing on screen.

Apply this by:
- Defaulting every surface to neutral glass, not brand color.
- Removing any notification that does not require a decision in the next 10 minutes.
- Replacing badges with dots, and dots with nothing when possible.
- Auto-archiving transient state (tabs, completed todos, stale drafts) on a time window instead of asking.

## 2. Playful

Arc is not serious. Feature names are pets. Empty states crack jokes. Changelogs read like personal letters. This is load-bearing, not decoration - it's what signals "we made this for a human" instead of "we made this for an enterprise license".

Apply this by:
- Naming features like characters: Little Arc, Max, Boosts.
- Writing empty states as reassurances, not instructions.
- Keeping microcopy in first/second person, sentence case, with contractions.
- Letting release notes have a theme and a voice, not a bullet list.

## 3. Opinionated

Arc picks a direction and commits. The sidebar replaces horizontal tabs. Today tabs auto-archive after 12 hours. The command bar is the default entry point, not a power-user feature. There is no setting for most of these choices.

Apply this by:
- Removing toggles that let the user restore a pattern you're trying to replace.
- Making the default behavior the preferred behavior.
- Accepting that some users won't like the choice. Don't water it down.
- Writing docs that explain the choice, not apologize for it.

## 4. Command-first

Every important action in Arc has a keyboard path, usually through the command bar. The mouse is for reading, the keyboard is for doing. This isn't a power-user accommodation - it's the primary UX.

Apply this by:
- Starting feature design with the keyboard shortcut, not the button.
- Making Cmd+K / Cmd+T the entry point for new features wherever it fits.
- Showing shortcuts in tooltips and command bar rows, right-aligned.
- Treating any feature that requires a pointer-only path as a design smell.

## 5. Spatial

Arc treats the browser as a place. Spaces are rooms. Little Arc is a side door. The archive is a shelf. Content lives somewhere, not nowhere. Motion carries users between these places - a Space switch is a horizontal slide, not a content swap.

Apply this by:
- Giving features a home (a Space, a panel, a Library category), not floating them in a generic feed.
- Using spring motion with direction, so state changes imply travel.
- Preserving scroll/selection/state in returned-to places.
- Avoiding generic dashboards. Ask: "where is this thing?"

## Anti-patterns

Things that will pull a design away from Arc:

- Default system gray (#e5e7eb-style palettes). Arc's neutrals are warm.
- Horizontal tab bars.
- Heavy drop shadows with long y-offsets. Arc uses small, soft, layered shadows.
- Sharp 90-degree corners.
- Bright accent colors used decoratively (accents signal state, not style).
- Title Case headlines.
- Corporate passive voice. "Your settings have been saved." -> "Saved."
- Settings for every choice. Opinionated means fewer toggles.
- Static empty states with illustrations that don't address the user.
- Any animation that uses linear easing or a fixed 300ms duration without character.

## The test

A feature passes an Arc design review if, stripped of the screenshot, a user could answer:

1. Is it quieter by default than its category norm?
2. Does the copy sound like a person?
3. Does it take a clear position, not offer five options?
4. Can you reach every important action with the keyboard?
5. Does it live somewhere - or is it floating?

If any answer is no, redesign that dimension before shipping.
