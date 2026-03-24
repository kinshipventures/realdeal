# Requirements: Kinship Brain

**Defined:** 2026-03-23
**Core Value:** Moj opens the app daily and it changes how she manages relationships

## v1.1 Requirements

### Search

- [ ] **SRCH-01**: User can search contacts by name from any view via a global search input
- [ ] **SRCH-02**: Search results show contact name, pod, and last contacted date — clicking navigates to profile

### Wrapped

- [ ] **WRAP-01**: Monthly Wrapped view shows key stats (contacts reached, intros made, top pods) as full-bleed gradient slides
- [ ] **WRAP-02**: Wrapped slides use Fraunces display type with pod-colored gradients per the design system spec

### Birthdays

- [ ] **BDAY-01**: Dashboard surfaces contacts with birthdays in the next 14 days as a dedicated section
- [ ] **BDAY-02**: Birthday section shows contact name, date, days until, and pod — clicking opens profile

### Campaigns

- [ ] **CAMP-01**: User can create a campaign (name, type, target contacts) tracked in Airtable
- [ ] **CAMP-02**: Dashboard shows active campaigns with progress (contacted / total)
- [ ] **CAMP-03**: Campaign detail view shows contact list with reach-out status per contact

## Future Requirements

### Integrations (blocked on external access)

- **GMAIL-01**: Gmail OAuth via serverless function for token exchange
- **GMAIL-02**: Email history for a contact appears in their interaction timeline
- **IMSG-01**: iMessage read-only integration via Mac Mini
- **CAL-01**: Calendar sync for automatic meeting logging

### AI Features

- **AI-01**: Auto-categorize new contacts into pods based on context
- **AI-02**: Context-aware draft emails using relationship history
- **AI-03**: Emoji/name shortcut lookups via text to AI assistant

## Out of Scope

| Feature | Reason |
|---------|--------|
| Telegram AI assistant | Separate project, already running |
| ClickUp deal pipeline | Stays in ClickUp, not migrating |
| Gwyneth/Goop workspace | Deferred, Microsoft ecosystem |
| WhatsApp integration | Future |
| Mobile native app | Works in mobile browser |
| Real authentication | Acceptable risk, private URL |
| LinkedIn enrichment | External API dependency, anti-feature per Moj |
| Bumble-style swipe | Aspirational, defer to v2 |
| Business card recognition | Requires camera/OCR pipeline |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SRCH-01 | TBD | Pending |
| SRCH-02 | TBD | Pending |
| WRAP-01 | TBD | Pending |
| WRAP-02 | TBD | Pending |
| BDAY-01 | TBD | Pending |
| BDAY-02 | TBD | Pending |
| CAMP-01 | TBD | Pending |
| CAMP-02 | TBD | Pending |
| CAMP-03 | TBD | Pending |

**Coverage:**
- v1.1 requirements: 9 total
- Mapped to phases: 0
- Unmapped: 9

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 after v1.1 milestone start*
