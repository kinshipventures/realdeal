#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const failures = []

function file(path) {
  const absolute = resolve(root, path)
  if (!existsSync(absolute)) {
    failures.push(`${path}: file is missing`)
    return ''
  }
  return readFileSync(absolute, 'utf8')
}

function mustContain(path, label, expected) {
  const content = file(path)
  const ok = expected instanceof RegExp ? expected.test(content) : content.includes(expected)
  if (!ok) failures.push(`${path}: missing ${label}`)
}

function mustJson(path, label, check) {
  const content = file(path)
  if (!content) return
  try {
    check(JSON.parse(content))
  } catch (error) {
    failures.push(`${path}: ${label}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const gmailSync = 'api/_lib/gmail-sync.ts'
const gmailCron = 'api/_lib/gmail-cron.ts'
const manualEndpoint = 'api/google/sync-gmail.ts'
const cronEndpoint = 'api/cron/sync-gmail.ts'
const googleConnection = 'api/_lib/google-connection.ts'
const authContext = 'src/contexts/AuthContext.tsx'
const googleIntegration = 'src/lib/googleIntegration.ts'
const gmailFallback = 'src/lib/gmail.ts'
const googleScopes = 'src/lib/googleScopes.ts'
const settings = 'src/components/settings/GoogleIntegrationSettings.tsx'
const widget = 'src/components/dashboard/widgets/GmailSyncWidget.tsx'
const contactDetail = 'src/components/contacts/ContactDetail.tsx'
const interactionSection = 'src/components/contacts/InteractionSection.tsx'
const integrationTests = 'src/lib/googleWorkspaceIntegration.test.ts'
const diagnosticsMigration = 'supabase/migrations/20260708192000_google_workspace_gmail_sync_diagnostics.sql'
const realtimeMigration = 'supabase/migrations/20260708210000_enable_interactions_realtime.sql'
const legacySyncFunction = 'supabase/functions/sync-gmail/index.ts'
const lockedDoc = 'docs/GOOGLE_INTEGRATION_LOCKED_BEHAVIOR.md'

for (const path of [
  gmailSync,
  gmailCron,
  manualEndpoint,
  cronEndpoint,
  googleConnection,
  authContext,
  googleIntegration,
  gmailFallback,
  googleScopes,
  settings,
  widget,
  contactDetail,
  interactionSection,
  integrationTests,
  diagnosticsMigration,
  realtimeMigration,
  legacySyncFunction,
  lockedDoc,
]) {
  file(path)
}

mustContain(gmailSync, 'diagnostic sync summary fields', /messages_scanned[\s\S]*contacts_indexed[\s\S]*email_addresses_indexed[\s\S]*mode/)
mustContain(gmailSync, '14-day rolling reconciliation window', 'const GMAIL_ROLLING_LOOKBACK_DAYS = 14')
mustContain(gmailSync, 'rolling reconciliation Gmail query', 'newer_than:${GMAIL_ROLLING_LOOKBACK_DAYS}d')
mustContain(gmailSync, 'incremental plus rolling mode', "mode: 'incremental+rolling'")
mustContain(gmailSync, 'full plus rolling mode', "mode: 'full+rolling'")
mustContain(gmailSync, 'contact emails include email_2 and email_3', /contact\.email,\s*contact\.email_2,\s*contact\.email_3/)
mustContain(gmailSync, 'strict user-to-contact matching helper', 'matchGmailMessageContacts')
mustContain(gmailSync, 'normal email pair matching requires user/contact sender recipient pair', /fromUserToContact[\s\S]*fromContactToUser/)
mustContain(gmailSync, 'self-email matching requires sender and recipient', /selfEmail[\s\S]*fromSet\.has\(userEmail\)[\s\S]*recipientSet\.has\(userEmail\)/)
mustContain(gmailSync, 'affected contact ids returned for UI refresh', 'affected_contact_ids')
mustContain(gmailSync, 'workspace member isolation', ".from('workspace_members').select('workspace_id').eq('user_id', userId)")
mustContain(gmailSync, 'workspace-scoped contact lookup', ".from('contacts')")
mustContain(gmailSync, 'workspace-scoped contact filter', ".in('workspace_id', workspaceIds)")
mustContain(gmailSync, 'existing Gmail interaction dedupe lookup', ".eq('source', 'Gmail')")
mustContain(gmailSync, 'stable Gmail message key', 'const gmailKey = `gmail:${message.id}`')
mustContain(gmailSync, 'email interaction insert', "type: 'email'")
mustContain(gmailSync, 'Gmail source insert', "source: 'Gmail'")
mustContain(gmailSync, 'message direction metadata', /event_detail:\s*JSON\.stringify\([\s\S]*direction[\s\S]*messageId[\s\S]*threadId/)
mustContain(gmailSync, 'duplicate interaction handling', 'isDuplicateInteractionError')
mustContain(gmailSync, 'last contacted update', 'last_contacted_at')
mustContain(gmailSync, 'diagnostic persistence patch', 'gmailDiagnosticPatch')
mustContain(gmailSync, 'messages scanned diagnostic column', 'gmail_last_messages_scanned')
mustContain(gmailSync, 'inserted diagnostic column', 'gmail_last_inserted')
mustContain(gmailSync, 'duplicates diagnostic column', 'gmail_last_duplicates')

mustContain(gmailCron, 'all enabled Google connections query', ".from('google_connections')")
mustContain(gmailCron, 'requires refresh token for cron processing', ".not('refresh_token_encrypted', 'is', null)")
mustContain(gmailCron, 'Gmail-enabled connection filter', 'connection.gmail_sync_enabled !== false')
mustContain(gmailCron, 'multi-connection sync call', 'syncGmailForConnection(admin, connection)')
mustContain(gmailCron, 'cron diagnostic totals', /messages_scanned[\s\S]*contacts_indexed[\s\S]*email_addresses_indexed[\s\S]*inserted[\s\S]*duplicates/)

mustContain(manualEndpoint, 'manual sync is authenticated', 'requireUser(request)')
mustContain(manualEndpoint, 'manual sync loads user connection', 'getGoogleConnection(admin, user.id)')
mustContain(manualEndpoint, 'manual sync runs app-owned sync', 'syncGmailForConnection(admin, connection)')
mustContain(manualEndpoint, 'manual sync returns full result', 'return json(response, 200, result)')
mustContain(manualEndpoint, 'manual sync logs diagnostics', 'Gmail sync completed')
mustContain(manualEndpoint, 'manual sync logs failed diagnostics', 'Gmail sync failed')
mustContain(manualEndpoint, 'manual sync returns reconnect state', 'needs_reconnect')

mustContain(cronEndpoint, 'cron uses GET', "request.method !== 'GET'")
mustContain(cronEndpoint, 'cron secret required', 'CRON_SECRET')
mustContain(cronEndpoint, 'cron bearer auth', 'Bearer ${cronSecret}')
mustContain(cronEndpoint, 'cron syncs enabled connections', 'syncGmailForEnabledConnections(admin)')
mustContain(cronEndpoint, 'cron logs diagnostics', 'Gmail cron completed')

mustContain(googleConnection, 'diagnostic fields on Google connection', /gmail_last_messages_scanned[\s\S]*gmail_last_contacts_indexed[\s\S]*gmail_last_email_addresses_indexed[\s\S]*gmail_last_matches_found[\s\S]*gmail_last_inserted[\s\S]*gmail_last_duplicates[\s\S]*gmail_last_sync_mode/)
mustContain(googleConnection, 'refresh token storage path remains server-side', 'refresh_token_encrypted')
mustContain(googleConnection, 'Google refresh uses env client ID', 'process.env.GOOGLE_CLIENT_ID')
mustContain(googleConnection, 'Google refresh uses env client secret', 'process.env.GOOGLE_CLIENT_SECRET')
mustContain(googleConnection, 'reconnect error detection includes invalid_grant', 'invalid_grant')

mustContain(authContext, 'approved active-session sync cadence', 'const GMAIL_BACKGROUND_SYNC_INTERVAL_MS = 10 * 60 * 1000')
mustContain(authContext, 'automatic interval sync', 'window.setInterval(sync, GMAIL_BACKGROUND_SYNC_INTERVAL_MS)')
mustContain(authContext, 'focus-triggered sync', "window.addEventListener('focus', sync)")
mustContain(authContext, 'visibility-triggered sync', "document.addEventListener('visibilitychange', handleVisibilityChange)")
mustContain(authContext, 'Google connection save followed by Gmail sync', 'saveGoogleConnection(nextSession).then(() => syncGmailInBackground(nextSession))')

mustContain(googleIntegration, 'manual sync posts to API route', "authorizedApi<GmailSyncResult>('/api/google/sync-gmail', { method: 'POST' })")
mustContain(googleIntegration, 'cache invalidates only after inserted rows', 'if (result.inserted > 0)')
mustContain(googleIntegration, 'sync completion event for open timelines', 'GMAIL_SYNC_COMPLETE_EVENT')
mustContain(googleIntegration, 'affected contact ids in sync result', 'affected_contact_ids')
mustContain(googleIntegration, 'background status check', 'const status = await getGoogleConnectionStatus().catch(() => null)')
mustContain(googleIntegration, 'background sync requires connected Gmail enabled healthy connection', '!status?.connected || !status.gmail_sync_enabled || status.needs_reconnect')
mustContain(googleIntegration, 'background in-flight dedupe', 'gmailBackgroundSyncInFlight')

mustContain(gmailFallback, 'legacy fallback carries affected contact ids', 'affected_contact_ids')
mustContain(gmailFallback, 'legacy fallback uses sync completion notification', 'notifyGmailSyncComplete')
mustContain(legacySyncFunction, 'legacy fallback uses strict user-to-contact matcher', 'matchGmailMessageContacts')
mustContain(legacySyncFunction, 'legacy fallback supports self-email matching', 'selfEmail')
mustContain(legacySyncFunction, 'legacy fallback returns affected contact ids', 'affected_contact_ids')

mustContain(contactDetail, 'contact email changes trigger Gmail reconciliation', 'previousGmailSyncEmails')
mustContain(contactDetail, 'contact email reconciliation calls Gmail sync', 'syncGmailActivity().catch')
mustContain(interactionSection, 'Realtime watches interaction inserts', 'postgres_changes')
mustContain(interactionSection, 'Realtime scoped to current contact', 'filter: `contact_id=eq.${contact.id}`')
mustContain(interactionSection, 'Gmail sync event refreshes Recent Activity', 'GMAIL_SYNC_COMPLETE_EVENT')

mustContain(googleScopes, 'Gmail readonly OAuth scope', 'https://www.googleapis.com/auth/gmail.readonly')
mustContain(googleScopes, 'Calendar readonly OAuth scope', 'https://www.googleapis.com/auth/calendar.readonly')
mustContain(googleScopes, 'Contacts readonly OAuth scope', 'https://www.googleapis.com/auth/contacts.readonly')
mustContain(googleScopes, 'OpenID OAuth scope', "'openid'")
mustContain(googleScopes, 'profile OAuth scope', "'profile'")
mustContain(googleScopes, 'email OAuth scope', "'email'")

mustContain(settings, 'manual sync diagnostics in settings UI', 'Gmail sync checked ${result.messages_scanned}')
mustContain(settings, 'manual sync inserted and duplicate summary', 'duplicates')
mustContain(widget, 'dashboard sync uses inserted count', 'inserted')

mustContain(integrationTests, 'three contact email fields covered', 'matches Gmail messages against secondary and tertiary contact emails')
mustContain(integrationTests, 'self-email behavior covered', 'matches real self-emails when the contact email is the connected Gmail address')
mustContain(integrationTests, 'rolling recovery test covered', 'recovers recent Gmail messages when history has no message events')
mustContain(integrationTests, 'incremental plus rolling behavior covered', "mode: 'incremental+rolling'")
mustContain(integrationTests, 'full plus rolling behavior covered', "mode: 'full+rolling'")

for (const column of [
  'gmail_last_messages_scanned',
  'gmail_last_contacts_indexed',
  'gmail_last_email_addresses_indexed',
  'gmail_last_matches_found',
  'gmail_last_inserted',
  'gmail_last_duplicates',
  'gmail_last_sync_mode',
]) {
  mustContain(diagnosticsMigration, `diagnostic column ${column}`, column)
}

mustContain(realtimeMigration, 'interactions added to Supabase Realtime publication', 'ALTER PUBLICATION supabase_realtime ADD TABLE public.interactions')

mustContain(lockedDoc, 'sensitive data boundary', 'Never hard-code or commit')
mustContain(lockedDoc, 'app owns Gmail logic boundary', 'Gmail sync is owned by the app/API')
mustContain(lockedDoc, 'Supabase storage-only boundary', 'Supabase only stores')
mustContain(lockedDoc, 'email_2 and email_3 locked matching', "`email`, `email_2`, and `email_3`")
mustContain(lockedDoc, 'self-email locked matching', 'supports self-email contacts')
mustContain(lockedDoc, 'realtime recent activity locked refresh', 'Supabase Realtime')
mustContain(lockedDoc, '14-day rolling reconciliation locked', '14-day lookback window')

mustJson('vercel.json', 'Vercel Gmail cron contract', json => {
  const cron = json.crons?.find(item => item.path === '/api/cron/sync-gmail')
  if (!cron) throw new Error('missing /api/cron/sync-gmail cron')
  if (cron.schedule !== '0 12 * * *') throw new Error('cron schedule changed from approved daily Hobby-safe schedule')
  if (json.functions?.['api/google/sync-gmail.ts']?.maxDuration !== 60) throw new Error('manual Gmail sync maxDuration must stay 60')
  if (json.functions?.['api/cron/sync-gmail.ts']?.maxDuration !== 60) throw new Error('cron Gmail sync maxDuration must stay 60')
})

mustJson('package.json', 'package guardrail scripts', json => {
  if (json.scripts?.['verify:google-integration'] !== 'node scripts/verify-google-integration-guardrails.mjs') {
    throw new Error('verify:google-integration script is missing or changed')
  }
  if (!String(json.scripts?.prebuild ?? '').includes('verify:google-integration')) {
    throw new Error('prebuild must run verify:google-integration')
  }
})

mustContain('.github/workflows/ci.yml', 'CI Google integration guardrail step', 'pnpm verify:google-integration')

if (failures.length > 0) {
  console.error('Google integration guardrail failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Google integration guardrail passed.')
