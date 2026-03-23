# Phase 3: Close-Out - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Briell can operate the app independently after Gabe's engagement ends March 31. Two deliverables: (1) a CSV import UI in the app so Briell can import contacts without terminal access, and (2) HANDOFF.md covering app usage, Airtable conventions, known issues, and a plain-language backlog of what's next.

</domain>

<decisions>
## Implementation Decisions

### Audience and voice
- **D-01:** Two readers: Briell (non-technical ops, browser-only, lives in Airtable) and Moj (executive, will skim). No jargon, no terminal commands, no dev assumptions.
- **D-02:** Executive overview at top for Moj — what the app does, what's built, what's not. Briell's operational sections follow.
- **D-03:** Assume app sits as-is after March 31 — no active dev planned. Handoff is about operating what exists.

### CSV import UI (new scope)
- **D-04:** Build a simple drag-and-drop CSV upload UI in the app so Briell never touches terminal
- **D-05:** Located behind settings/admin area (Moj hub orb or gear icon). Out of Moj's daily view, Briell knows where to find it.
- **D-06:** Auto-detect columns from CSV headers, preview rows before confirming import. No manual column mapping UI — expects Briell's format (Name, Email, Phone, etc. matching Airtable field names).
- **D-07:** Dedup built in — same name+email check as existing import script. Skip duplicates, show count of skipped vs imported.
- **D-08:** Target pod/list selection before import — Briell picks which pod the contacts go into.
- **D-09:** Success/error feedback inline — "Imported 47 contacts, skipped 3 duplicates" not a toast.

### HANDOFF.md structure
- **D-10:** Sections: Overview (for Moj), How to Use the App (Briell), Airtable Field Guide (Briell), Importing Contacts (Briell — references the new UI), Known Issues, What's Next (structured backlog), Escalation Contact
- **D-11:** "What's Next" backlog in plain language — what it is, why it matters, what's blocking it. No requirement IDs, no dev jargon. Moj and Briell should be able to read it and understand priorities.
- **D-12:** Known issues section covers real bugs/limitations discovered during dev, not hypothetical edge cases

### Airtable field guide
- **D-13:** Document all tables (Contacts, Lists, Categories, Interactions), their fields, naming conventions (Title Case with spaces), and which fields the app reads vs. which are Airtable-only
- **D-14:** Call out fields Briell should NOT rename or restructure (linked fields, fields the app depends on)

### Claude's Discretion
- Exact HANDOFF.md prose and formatting
- How to surface the import UI entry point (gear icon vs. hub orb settings area)
- CSV preview table styling (matches existing app design system)
- Error handling for malformed CSVs (missing columns, bad encoding)
- Whether import supports creating new pods/lists or only imports into existing ones

</decisions>

<specifics>
## Specific Ideas

- Briell manages Airtable directly — "handles bulk imports and cleanup" (context-map.md). The import UI replaces the terminal script workflow.
- Moj wants pre-aligned recommendations — the handoff doc should feel like answers, not questions
- "I'm nervous about waiting 6 weeks and not having something" — the handoff should make clear what IS built and working, not just what's missing
- Keep the backlog honest — don't oversell what's "almost done" vs. what needs real dev work

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product context
- `docs/context-map.md` — Stakeholder map, Briell's role description, decision history
- `.planning/PROJECT.md` — Requirements, constraints, key decisions, out-of-scope items

### Import script (pattern to port to UI)
- `src/scripts/importServiceProviders.ts` — Current CSV import logic. Dedup, field mapping, Airtable create calls. Port this logic to browser-side.
- `src/scripts/seedLists.ts` — List seeding script

### Data layer
- `src/lib/airtable.ts` — All Airtable operations. Import UI will use `request()` / `fetchAll()` helpers and cache invalidation.
- `src/lib/types.ts` — Contact, Pod, Category, Interaction types

### Design system
- `DESIGN.md` — Visual system spec (tokens, typography, spacing, component patterns)
- `docs/design-system.md` — Token documentation

### App structure
- `src/components/map/MojNode.tsx` — Hub orb (settings entry point candidate)
- `src/App.tsx` — Routes, nav structure

### Requirements
- `.planning/REQUIREMENTS.md` — CLOSE-01 requirement, v2 requirements for backlog section

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `importServiceProviders.ts` — CSV parsing + Airtable field mapping + dedup logic. Core logic ports to browser-side with minimal changes.
- `request()` / `fetchAll()` in airtable.ts — same helpers the import UI will call
- `invalidateContactsCache()` — must be called after import to refresh the app's cached data
- Design tokens from DESIGN.md — import UI inherits the existing visual system (green brand, Fraunces headings, Plus Jakarta Sans body)

### Established Patterns
- Settings/admin currently accessed via Moj hub orb — could add an import tab or gear icon
- Drag-and-drop not yet used in the app — new pattern, keep it simple
- Inline feedback pattern (not toasts) — matches existing contact auto-save feedback

### Integration Points
- New route or modal for import UI — needs to be accessible but not in primary nav
- Airtable batch create (10 records per batch) — existing script handles this, port the batching
- Pod/list selection — reuse existing pod fetching from airtable.ts
- After import: invalidate cache so Dashboard/Map reflect new contacts immediately

</code_context>

<deferred>
## Deferred Ideas

- Column mapping UI for arbitrary CSVs — over-engineering for Briell's use case
- Import history / undo — future, not close-out scope
- Scheduled/automated imports — future
- Export functionality (app → CSV) — future
- Video walkthrough for Briell — nice but out of scope, written docs are the deliverable

</deferred>

---

*Phase: 03-close-out*
*Context gathered: 2026-03-23*
