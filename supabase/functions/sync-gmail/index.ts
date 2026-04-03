import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"
const MAX_RESULTS = 50
const DEFAULT_DAYS_BACK = 30

interface GmailMessage {
  id: string
  threadId: string
  payload: {
    headers: Array<{ name: string; value: string }>
    parts?: Array<{ mimeType: string; body: { data?: string } }>
    body?: { data?: string }
  }
  internalDate: string
}

interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>
  nextPageToken?: string
  resultSizeEstimate?: number
}

function getHeader(msg: GmailMessage, name: string): string {
  return msg.payload.headers.find(
    h => h.name.toLowerCase() === name.toLowerCase()
  )?.value ?? ""
}

function extractEmails(headerValue: string): string[] {
  const matches = headerValue.match(/[\w.+-]+@[\w.-]+\.\w+/g)
  return matches ? [...new Set(matches.map(e => e.toLowerCase()))] : []
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { google_access_token } = await req.json()
    if (!google_access_token) {
      return new Response(JSON.stringify({ error: "Missing google_access_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Init Supabase client with user's JWT
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Get sync state
    const { data: syncState } = await supabase
      .from("gmail_sync_state")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    // Build query - fetch recent messages
    const after = Math.floor(
      (Date.now() - DEFAULT_DAYS_BACK * 24 * 60 * 60 * 1000) / 1000
    )
    const query = `after:${after}`

    // Fetch message list from Gmail
    const listUrl = `${GMAIL_API}/messages?q=${encodeURIComponent(query)}&maxResults=${MAX_RESULTS}`
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${google_access_token}` },
    })

    if (!listRes.ok) {
      const errText = await listRes.text()
      return new Response(JSON.stringify({ error: "Gmail API error", detail: errText }), {
        status: listRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const listData: GmailListResponse = await listRes.json()
    const messageIds = listData.messages ?? []

    if (messageIds.length === 0) {
      return new Response(JSON.stringify({ synced: 0, matched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Get all user's contacts with email addresses
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, email, email_2, email_3, name, last_contacted_at")
      .eq("user_id", user.id)

    // Build email -> contact ID map
    const emailMap = new Map<string, { id: string; last_contacted_at: string | null }>()
    for (const c of contacts ?? []) {
      for (const field of [c.email, c.email_2, c.email_3]) {
        if (field) emailMap.set(field.toLowerCase(), { id: c.id, last_contacted_at: c.last_contacted_at })
      }
    }

    // Check existing Gmail interactions to avoid duplicates (by email_link = gmail msg ID)
    const { data: existingInteractions } = await supabase
      .from("interactions")
      .select("email_link")
      .eq("user_id", user.id)
      .eq("source", "Gmail")
      .not("email_link", "is", null)

    const existingMsgIds = new Set(
      (existingInteractions ?? []).map(i => i.email_link).filter(Boolean)
    )

    // Fetch individual messages and create interactions
    let synced = 0
    let matched = 0
    const contactsToUpdate = new Map<string, string>() // contactId -> latest date

    // Process in batches of 10
    for (let i = 0; i < messageIds.length; i += 10) {
      const batch = messageIds.slice(i, i + 10)
      const messages = await Promise.all(
        batch.map(async ({ id }) => {
          if (existingMsgIds.has(id)) return null
          const msgRes = await fetch(
            `${GMAIL_API}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${google_access_token}` } }
          )
          if (!msgRes.ok) return null
          return (await msgRes.json()) as GmailMessage
        })
      )

      for (const msg of messages) {
        if (!msg) continue

        const from = getHeader(msg, "From")
        const to = getHeader(msg, "To")
        const subject = getHeader(msg, "Subject")
        const dateStr = getHeader(msg, "Date")
        const allEmails = [...extractEmails(from), ...extractEmails(to)]

        // Find matching contacts
        const matchedContacts = new Set<string>()
        for (const email of allEmails) {
          const match = emailMap.get(email)
          if (match) matchedContacts.add(match.id)
        }

        if (matchedContacts.size === 0) continue

        // Parse date
        let date: string
        try {
          date = new Date(parseInt(msg.internalDate)).toISOString().slice(0, 10)
        } catch {
          date = new Date().toISOString().slice(0, 10)
        }

        // Create interaction for each matched contact
        for (const contactId of matchedContacts) {
          const { error: insertError } = await supabase.from("interactions").insert({
            user_id: user.id,
            contact_id: contactId,
            type: "email",
            source: "Gmail",
            date,
            summary: subject || "(no subject)",
            email_link: msg.id,
            notes: null,
          })

          if (!insertError) {
            synced++
            matched++

            // Track latest date per contact for last_contacted_at update
            const prev = contactsToUpdate.get(contactId)
            if (!prev || date > prev) {
              contactsToUpdate.set(contactId, date)
            }
          }
        }
      }
    }

    // Update last_contacted_at for matched contacts
    for (const [contactId, latestDate] of contactsToUpdate) {
      const contact = (contacts ?? []).find(c => c.id === contactId)
      if (!contact?.last_contacted_at || latestDate > contact.last_contacted_at) {
        await supabase
          .from("contacts")
          .update({ last_contacted_at: latestDate })
          .eq("id", contactId)
          .eq("user_id", user.id)
      }
    }

    // Update sync state
    const now = new Date().toISOString()
    if (syncState) {
      await supabase
        .from("gmail_sync_state")
        .update({ last_synced_at: now })
        .eq("user_id", user.id)
    } else {
      await supabase
        .from("gmail_sync_state")
        .insert({ user_id: user.id, last_synced_at: now })
    }

    return new Response(
      JSON.stringify({ synced, matched, total_messages: messageIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
