# Requirements: Kinship Brain

**Defined:** 2026-03-20
**Core Value:** Moj opens the app daily and it changes how she manages relationships

## v1 Requirements

### Data Import

- [x] **DATA-01**: Import script has dedup logic — checks name + email before creating contacts
- [ ] **DATA-02**: LP investor list imported and clean in Airtable
- [ ] **DATA-03**: Talent list imported and clean in Airtable
- [ ] **DATA-04**: Any additional lists Briell preps are imported

### Contact Profiles

- [x] **PROF-01**: Contact profile shows birthday field with countdown when within 30 days
- [x] **PROF-02**: Contact profile has milestones freeform text field
- [x] **PROF-03**: Contact profile has interests freeform text field
- [x] **PROF-04**: Contact profile has relationship context freeform text field
- [x] **PROF-05**: Contact profile displays per-contact equity score with breakdown

### Visual Design

- [x] **VIS-01**: Design tokens defined as CSS custom properties (colors, typography, spacing)
- [x] **VIS-02**: Dashboard visuals aligned with Trolley CRM PDF (scoped to 3-5 specific deltas)
- [x] **VIS-03**: App looks polished enough to demo to Gwyneth

### Close-Out

- [ ] **CLOSE-01**: HANDOFF.md written — Briell can operate the app independently after engagement ends

## v2 Requirements

### Gmail Integration

- **GMAIL-01**: Gmail OAuth via Vercel serverless function for token exchange
- **GMAIL-02**: Email history for a contact appears in their interaction timeline
- **GMAIL-03**: Multiple Gmail accounts supported

### Bot Integration

- **BOT-01**: Toast bot writes to Airtable, app reads bot-logged interactions
- **BOT-02**: App can trigger Toast actions (bidirectional)

### Team Features

- **TEAM-01**: User accounts with login
- **TEAM-02**: Per-user filtered views

## Out of Scope

| Feature | Reason |
|---------|--------|
| Telegram AI assistant (Toast) | Separate project, already running |
| Lovable case study | Gabby's project, separate repo |
| Gwyneth/Goop workspace | Different ecosystem (Microsoft), deferred |
| ClickUp migration | Deal pipeline stays in ClickUp |
| WhatsApp integration | Future |
| Campaign management | Future |
| Mobile app | Desktop-first |
| Push notifications | Future |
| Real authentication | Acceptable risk, private URL |
| API proxy server | Accepted risk |
| Calendar sync | Future, tied to Gmail access |
| AI auto-categorization | Future |
| External enrichment APIs | Anti-feature — Moj's network is too high-signal for Clearbit/PDL |
| Reusable import framework | Over-engineering — Claude Code handles column mapping per CSV |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| PROF-01 | Phase 2 | Complete |
| PROF-02 | Phase 2 | Complete |
| PROF-03 | Phase 2 | Complete |
| PROF-04 | Phase 2 | Complete |
| PROF-05 | Phase 2 | Complete |
| VIS-01 | Phase 3 | Complete |
| VIS-02 | Phase 3 | Complete |
| VIS-03 | Phase 3 | Complete |
| CLOSE-01 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after initial definition*
