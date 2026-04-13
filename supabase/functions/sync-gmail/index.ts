import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    const { google_access_token } = await req.json();
    if (!google_access_token) {
      return new Response(JSON.stringify({ error: "Missing google_access_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for DB writes
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get sync state
    const { data: syncState } = await supabaseAdmin
      .from("gmail_sync_state")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // Fetch recent messages from Gmail API
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const query = `after:${thirtyDaysAgo}`;
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100`;

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${google_access_token}` },
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      return new Response(
        JSON.stringify({ error: "Gmail API error", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const listData = await listRes.json();
    const messageIds: string[] = (listData.messages || []).map((m: { id: string }) => m.id);

    if (messageIds.length === 0) {
      // Update sync state
      await upsertSyncState(supabaseAdmin, userId, null);
      return new Response(
        JSON.stringify({ synced: 0, matched: 0, total_messages: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get workspace contacts with emails
    // First get user's workspaces
    const { data: memberships } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId);

    const workspaceIds = (memberships || []).map((m: { workspace_id: string }) => m.workspace_id);

    // Get contacts with emails
    const { data: contacts } = await supabaseAdmin
      .from("contacts")
      .select("id, email, email_2, email_3, workspace_id")
      .in("workspace_id", workspaceIds);

    // Build email -> contact map
    const emailToContact = new Map<string, { id: string; workspace_id: string }>();
    for (const c of contacts || []) {
      for (const field of [c.email, c.email_2, c.email_3]) {
        if (field) emailToContact.set(field.toLowerCase(), { id: c.id, workspace_id: c.workspace_id });
      }
    }

    // Get existing email_links to avoid duplicates
    const { data: existingInteractions } = await supabaseAdmin
      .from("interactions")
      .select("email_link")
      .eq("source", "Gmail")
      .in("workspace_id", workspaceIds)
      .not("email_link", "is", null);

    const existingLinks = new Set((existingInteractions || []).map((i: { email_link: string }) => i.email_link));

    // Fetch message details in batches of 10
    let synced = 0;
    let matched = 0;

    for (let i = 0; i < messageIds.length; i += 10) {
      const batch = messageIds.slice(i, i + 10);
      const details = await Promise.all(
        batch.map(async (msgId) => {
          const res = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date&metadataHeaders=Subject`,
            { headers: { Authorization: `Bearer ${google_access_token}` } }
          );
          if (!res.ok) { await res.text(); return null; }
          return res.json();
        })
      );

      for (const msg of details) {
        if (!msg) continue;

        const gmailId = `gmail:${msg.id}`;
        if (existingLinks.has(gmailId)) continue;

        const headers = msg.payload?.headers || [];
        const from = headers.find((h: { name: string }) => h.name === "From")?.value || "";
        const to = headers.find((h: { name: string }) => h.name === "To")?.value || "";
        const dateStr = headers.find((h: { name: string }) => h.name === "Date")?.value || "";
        const subject = headers.find((h: { name: string }) => h.name === "Subject")?.value || "";

        // Extract emails from From and To
        const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
        const allEmails = [...(from.match(emailRegex) || []), ...(to.match(emailRegex) || [])];

        // Match to contacts
        for (const addr of allEmails) {
          const contact = emailToContact.get(addr.toLowerCase());
          if (contact) {
            const date = dateStr ? new Date(dateStr).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

            await supabaseAdmin.from("interactions").insert({
              contact_id: contact.id,
              user_id: userId,
              workspace_id: contact.workspace_id,
              type: "email",
              source: "Gmail",
              date,
              email_link: gmailId,
              summary: subject || null,
              notes: null,
            });

            // Update last_contacted_at
            await supabaseAdmin
              .from("contacts")
              .update({ last_contacted_at: date })
              .eq("id", contact.id)
              .lt("last_contacted_at", date);

            matched++;
            break; // one interaction per message
          }
        }
        synced++;
      }
    }

    await upsertSyncState(supabaseAdmin, userId, listData.resultSizeEstimate?.toString() || null);

    return new Response(
      JSON.stringify({ synced, matched, total_messages: messageIds.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function upsertSyncState(supabase: any, userId: string, historyId: string | null) {
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("gmail_sync_state")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("gmail_sync_state")
      .update({ last_synced_at: now, last_history_id: historyId, updated_at: now })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("gmail_sync_state")
      .insert({ user_id: userId, last_synced_at: now, last_history_id: historyId });
  }
}
