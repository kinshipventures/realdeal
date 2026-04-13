import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const log: string[] = [];
  const addLog = (msg: string) => { console.log(msg); log.push(msg); };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const db = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { workspace_id, batch_size = 20 } = body;
    if (!workspace_id) throw new Error("workspace_id required");

    // Fetch companies needing enrichment: have name but missing key fields
    const rows: any[] = [];
    let from = 0;
    while (true) {
      const { data } = await db.from("companies")
        .select("id, name, website, domain, industry, location")
        .eq("workspace_id", workspace_id)
        .is("domain", null)
        .range(from, from + 999);
      if (!data || data.length === 0) break;
      rows.push(...data);
      if (data.length < 1000) break;
      from += 1000;
    }

    // Filter to companies missing most fields
    const candidates = rows.filter((co: any) => {
      const name = (co.name || "").trim();
      if (name.length < 2) return false;
      const missing = [co.website, co.domain, co.industry, co.location].filter(v => !v).length;
      return missing >= 2;
    });

    addLog(`Found ${candidates.length} companies needing enrichment`);
    const batch = candidates.slice(0, batch_size);
    if (batch.length === 0) {
      return new Response(JSON.stringify({ success: true, enriched: 0, log }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt with all company names
    const nameList = batch.map((co: any, i: number) => `${i + 1}. ${co.name}`).join("\n");
    const prompt = `For each company below, provide the company website URL, domain, industry, and headquarters location. If you don't know, use null.

Companies:
${nameList}

Return a JSON array with objects: { "index": 1, "website": "https://...", "domain": "example.com", "industry": "Technology", "location": "San Francisco, CA" }
Only return the JSON array, no other text.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a business data enrichment assistant. Return only valid JSON arrays." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      if (aiResp.status === 429) throw new Error("Rate limited - try again later");
      if (aiResp.status === 402) throw new Error("Credits exhausted - add funds in Settings > Workspace > Usage");
      throw new Error(`AI gateway error ${aiResp.status}: ${errText}`);
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response (may be wrapped in markdown code block)
    let enriched: any[] = [];
    try {
      const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      enriched = JSON.parse(jsonStr);
    } catch {
      addLog(`Failed to parse AI response: ${content.substring(0, 200)}`);
      return new Response(JSON.stringify({ success: false, error: "Failed to parse AI response", log }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updated = 0;
    for (const item of enriched) {
      const idx = (item.index || 0) - 1;
      if (idx < 0 || idx >= batch.length) continue;
      const co = batch[idx];
      const updates: any = {};

      if (item.website && !co.website) updates.website = item.website;
      if (item.domain && !co.domain) updates.domain = item.domain;
      if (item.industry && !co.industry) updates.industry = item.industry;
      if (item.location && !co.location) updates.location = item.location;

      if (Object.keys(updates).length) {
        await db.from("companies").update(updates).eq("id", co.id);
        updated++;
      }
    }

    addLog(`Enriched ${updated}/${batch.length} companies (${candidates.length - batch.length} remaining)`);

    return new Response(JSON.stringify({
      success: true,
      enriched: updated,
      remaining: candidates.length - batch.length,
      log,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    addLog(`ERROR: ${msg}`);
    return new Response(JSON.stringify({ success: false, error: msg, log }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
