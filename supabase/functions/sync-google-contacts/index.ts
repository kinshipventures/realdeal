import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GoogleContact {
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
}

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

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workspace_id, dry_run } = await req.json();
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "Missing workspace_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Google provider token from user's identity
    const googleIdentity = user.identities?.find(i => i.provider === "google");
    if (!googleIdentity) {
      return new Response(JSON.stringify({ error: "No Google account linked. Please sign in with Google." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get session to access provider_token
    const { data: { session } } = await supabaseUser.auth.getSession();
    const providerToken = session?.provider_token;
    if (!providerToken) {
      return new Response(JSON.stringify({ error: "Google access token expired. Please sign out and sign in again with Google." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch contacts from Google People API
    const contacts: GoogleContact[] = [];
    let nextPageToken = "";
    let pageCount = 0;
    const maxPages = 10; // ~2500 contacts max

    do {
      const url = new URL("https://people.googleapis.com/v1/people/me/connections");
      url.searchParams.set("personFields", "names,emailAddresses,phoneNumbers,organizations");
      url.searchParams.set("pageSize", "250");
      if (nextPageToken) url.searchParams.set("pageToken", nextPageToken);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${providerToken}` },
      });

      if (!res.ok) {
        const errBody = await res.text();
        if (res.status === 403) {
          return new Response(JSON.stringify({
            error: "Google Contacts access not granted. Please sign out, then sign back in with Google to grant contacts permission.",
          }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: `Google API error: ${res.status}`, detail: errBody }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      const connections = data.connections || [];

      for (const person of connections) {
        const names = person.names?.[0];
        const email = person.emailAddresses?.[0]?.value;
        const phone = person.phoneNumbers?.[0]?.value;
        const org = person.organizations?.[0];

        const displayName = names?.displayName;
        if (!displayName) continue; // Skip contacts without names

        contacts.push({
          name: displayName,
          first_name: names?.givenName || null,
          last_name: names?.familyName || null,
          email: email || null,
          phone: phone || null,
          company: org?.name || null,
          role: org?.title || null,
        });
      }

      nextPageToken = data.nextPageToken || "";
      pageCount++;
    } while (nextPageToken && pageCount < maxPages);

    // If dry_run, just return the contacts for preview
    if (dry_run) {
      return new Response(JSON.stringify({
        contacts,
        total: contacts.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Import contacts - use service role for cross-check
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get existing contacts by email to avoid duplicates
    const { data: existingContacts } = await supabaseAdmin
      .from("contacts")
      .select("email")
      .eq("workspace_id", workspace_id)
      .not("email", "is", null);

    const existingEmails = new Set(
      (existingContacts || []).map((c: { email: string }) => c.email?.toLowerCase())
    );

    // Filter out duplicates
    const newContacts = contacts.filter(c => {
      if (!c.email) return true; // Keep contacts without email (might be unique by name)
      return !existingEmails.has(c.email.toLowerCase());
    });

    // Batch insert
    let imported = 0;
    let skipped = contacts.length - newContacts.length;
    const batchSize = 50;

    for (let i = 0; i < newContacts.length; i += batchSize) {
      const batch = newContacts.slice(i, i + batchSize).map(c => ({
        name: c.name,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        role: c.role,
        user_id: user.id,
        workspace_id,
        type: "Contact" as const,
        status: "Active" as const,
      }));

      const { error: insertError } = await supabaseAdmin
        .from("contacts")
        .insert(batch);

      if (!insertError) {
        imported += batch.length;
      }
    }

    return new Response(JSON.stringify({
      imported,
      skipped,
      total_from_google: contacts.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: "Internal error", detail: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
