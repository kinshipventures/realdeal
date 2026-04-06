# TODOs

## Invite email notifications
- **What:** Send email when someone is invited to a workspace (currently shareable link only)
- **Why:** Real users expect an email saying "X invited you." Link-only invites require manual sharing via chat/text.
- **Context:** workspace_invites table has email field. Need email service (Resend, Postmark, or Supabase built-in). Trigger on insert into workspace_invites.
- **Blocked by:** Choosing an email service provider

## Full-text search across notes and interactions
- **What:** Extend cmd+k search to search interaction notes, contact intel_notes, and relationship_context fields
- **Why:** Founders want to find "that person who mentioned Series A" without remembering their name
- **Context:** Current search covers entity names/emails only. Notes are in contacts.notes, contacts.intel_notes, interactions.notes. May need tsvector GIN indexes for performance at scale.
- **Blocked by:** Global search MVP shipping first (entity name search)
