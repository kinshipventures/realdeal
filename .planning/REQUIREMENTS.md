# Requirements: RealDeal

**Defined:** 2026-03-31
**Core Value:** One place where every relationship lives with full context

## v2.1 Requirements

Requirements for MVP completion. Closes gaps identified in Kinship Brain MVP PDF.

### Reporting

- [ ] **RPT-01**: User can view pod distribution report (contacts per pod, health breakdown)
- [ ] **RPT-02**: User can view pipeline conversion/velocity report (stage progression, time-in-stage)
- [ ] **RPT-03**: User can view engagement report (touchpoint activity over time, by type)
- [ ] **RPT-04**: User can export any report as CSV
- [ ] **RPT-05**: User can save a report configuration as a favorite for quick access

### Sharing

- [ ] **SHR-01**: User can generate a public read-only share link for any filtered list
- [ ] **SHR-02**: Share link shows contact names, roles, companies, and pod membership (no private fields)
- [ ] **SHR-03**: User can revoke a share link at any time

### Enrichment

- [ ] **ENR-01**: System can auto-fill company info, LinkedIn, and role from a web enrichment API
- [ ] **ENR-02**: Every enrichment change is logged to the contact's timeline with before/after values
- [ ] **ENR-03**: Enrichment only runs for contacts/pods where opt-in is enabled
- [ ] **ENR-04**: AI-filled fields are visually marked as enriched

### Follow-ups

- [ ] **FLW-01**: User can set a follow-up date and next action on any record
- [ ] **FLW-02**: Due and overdue follow-ups surface on the dashboard
- [ ] **FLW-03**: Nurturing hub shows a "create follow-up" action that sets date + action inline
- [ ] **FLW-04**: Completing a follow-up logs it to the timeline

### Authentication

- [ ] **AUTH-01**: User can sign up and log in (email/password, Google, or Apple via Supabase)
- [ ] **AUTH-02**: Unauthenticated users are redirected to login
- [ ] **AUTH-03**: User session persists across browser refresh

## v2.2 Requirements

Deferred to future release.

- **GMAIL-01**: Gmail Chrome extension for relationship creation/logging from inbox
- **COPILOT-01**: Read-only AI synthesis layer (meeting briefs, summaries)
- **WORKSPACE-01**: Team workspace with personal views
- **CAMP-01**: Campaign email drafts with templates and tokens
- **PERM-01**: Granular permissions per pod/project/pipeline

## Out of Scope

| Feature | Reason |
|---------|--------|
| Gmail Chrome extension | Separate project, requires Chrome extension development |
| AI Copilot | Requires LLM API integration, deferred to v2.2+ |
| Workspace architecture | Single-user MVP, team features later |
| Conditional pod logic | Future complexity, basic pods sufficient |
| Campaign email sending | Campaign tracking exists, email integration v2.2+ |
| Mobile app | Web-first, responsive layout sufficient |
| Social graph visualization | V2 expansion feature |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 18 | Pending |
| AUTH-02 | Phase 18 | Pending |
| AUTH-03 | Phase 18 | Pending |
| ENR-01 | Phase 19 | Pending |
| ENR-02 | Phase 19 | Pending |
| ENR-03 | Phase 19 | Pending |
| ENR-04 | Phase 19 | Pending |
| FLW-01 | Phase 19 | Pending |
| FLW-02 | Phase 19 | Pending |
| FLW-03 | Phase 19 | Pending |
| FLW-04 | Phase 19 | Pending |
| RPT-01 | Phase 20 | Pending |
| RPT-02 | Phase 20 | Pending |
| RPT-03 | Phase 20 | Pending |
| RPT-04 | Phase 20 | Pending |
| RPT-05 | Phase 20 | Pending |
| SHR-01 | Phase 21 | Pending |
| SHR-02 | Phase 21 | Pending |
| SHR-03 | Phase 21 | Pending |

**Coverage:**
- v2.1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 -- all 19 requirements mapped to Phases 18-21*
