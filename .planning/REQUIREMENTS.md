# Requirements: Kinship Brain

**Defined:** 2026-03-23
**Core Value:** Moj opens the app daily and it changes how she manages relationships

## v1.1 Requirements

### Search

- [x] **SRCH-01**: User can search contacts by name from any view via a global search input
- [x] **SRCH-02**: Search results show contact name, pod, and last contacted date — clicking navigates to profile

### Wrapped

- [x] **WRAP-01**: Dashboard insight card shows weekly stats (people reached, top pod, most connected) as cycling gradient cards
- [x] **WRAP-02**: Wrapped cards use Fraunces display type with pod-colored gradients per the design system spec

### Birthdays

- [x] **BDAY-01**: Dashboard surfaces contacts with birthdays in the next 14 days as a dedicated section
- [x] **BDAY-02**: Birthday section shows contact name, date, days until, and pod — clicking opens profile

### Campaigns

- [x] **CAMP-01**: User can create a campaign (name, type, target contacts) tracked in Airtable
- [x] **CAMP-02**: Dashboard shows active campaigns with progress (contacted / total)
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
| SRCH-01 | Phase 4 | Complete |
| SRCH-02 | Phase 4 | Complete |
| BDAY-01 | Phase 4 | Complete |
| BDAY-02 | Phase 4 | Complete |
| WRAP-01 | Phase 5 | Complete |
| WRAP-02 | Phase 5 | Complete |
| CAMP-01 | Phase 6 | Complete |
| CAMP-02 | Phase 6 | Complete |
| CAMP-03 | Phase 6 | Pending |

**Coverage:**
- v1.1 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-24 after Phase 5 completion*
