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

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");
    const userId = user.id;

    const db = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { workspace_id, phase } = body;
    if (!workspace_id) throw new Error("workspace_id required");
    if (!phase) throw new Error("phase required (1-4 or 'all')");

    addLog(`normalize-companies workspace=${workspace_id} phase=${phase}`);

    async function fetchAll(table: string, select: string, filters: Record<string, any>) {
      const rows: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        let q = db.from(table).select(select).range(from, from + pageSize - 1);
        for (const [k, v] of Object.entries(filters)) {
          if (v === null) q = q.is(k, null);
          else q = q.eq(k, v);
        }
        const { data } = await q;
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return rows;
    }

    // Phase 1: Garbage removal
    if (phase === 1 || phase === "all") {
      addLog("--- Phase 1: Garbage removal ---");
      const companies = await fetchAll("companies", "id, name", { workspace_id });

      const GARBAGE_NAMES = ["na", "n/a", "none", "-", "", "tbd", "self", "freelance", "independent"];
      const TITLE_KEYWORDS = /\b(vp|ceo|cfo|coo|cto|director|manager|president|founder|partner|head of|sr\.|jr\.|associate|analyst|coordinator|consultant|advisor|strategist|specialist|executive|officer)\b/i;

      const garbageIds: string[] = [];
      for (const co of companies) {
        const name = (co.name || "").trim();
        const lower = name.toLowerCase();

        // Empty or placeholder names
        if (GARBAGE_NAMES.includes(lower)) { garbageIds.push(co.id); continue; }

        // URLs as names
        if (/^https?:\/\//i.test(name) || /^linkedin\.com/i.test(name) || /^www\./i.test(name)) {
          garbageIds.push(co.id); continue;
        }

        // Role/title patterns: "VP, Brand Partnerships - IZO" or "Director of Marketing"
        if (name.includes(",") && TITLE_KEYWORDS.test(name)) { garbageIds.push(co.id); continue; }
        if (/^(VP|Director|Head|Manager|President|Founder|Partner|CEO|CFO|COO|CTO)\s/i.test(name)) {
          garbageIds.push(co.id); continue;
        }
      }

      // Unlink contacts from garbage companies, then delete
      for (const id of garbageIds) {
        await db.from("contact_companies").delete().eq("company_id", id);
        await db.from("contacts").update({ company_id: null }).eq("company_id", id);
        await db.from("companies").delete().eq("id", id);
      }
      addLog(`Phase 1: removed ${garbageIds.length} garbage company records`);
    }

    // Phase 2: Case-insensitive dedup
    if (phase === 2 || phase === "all") {
      addLog("--- Phase 2: Case-insensitive dedup ---");
      const companies = await fetchAll("companies", "id, name, website, domain, industry, location, stage, notes, created_at", { workspace_id });

      const groups = new Map<string, any[]>();
      for (const co of companies) {
        const key = co.name.toLowerCase().trim();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(co);
      }

      let merged = 0;
      for (const [, group] of groups) {
        if (group.length <= 1) continue;

        // Pick survivor: most non-null fields, then earliest created
        group.sort((a: any, b: any) => {
          const fieldsA = [a.website, a.domain, a.industry, a.location, a.stage, a.notes].filter(Boolean).length;
          const fieldsB = [b.website, b.domain, b.industry, b.location, b.stage, b.notes].filter(Boolean).length;
          if (fieldsB !== fieldsA) return fieldsB - fieldsA;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        const survivor = group[0];
        const losers = group.slice(1);

        // Coalesce fields from losers into survivor
        const updates: any = {};
        for (const field of ["website", "domain", "industry", "location", "stage", "notes"]) {
          if (!survivor[field]) {
            for (const loser of losers) {
              if (loser[field]) { updates[field] = loser[field]; break; }
            }
          }
        }
        if (Object.keys(updates).length) {
          await db.from("companies").update(updates).eq("id", survivor.id);
        }

        for (const loser of losers) {
          // Move contact_companies junctions
          const junctions = await fetchAll("contact_companies", "id, contact_id", { company_id: loser.id });
          const existingJ = await fetchAll("contact_companies", "contact_id", { company_id: survivor.id });
          const existingSet = new Set(existingJ.map((j: any) => j.contact_id));

          for (const j of junctions) {
            if (existingSet.has(j.contact_id)) {
              await db.from("contact_companies").delete().eq("id", j.id);
            } else {
              await db.from("contact_companies").update({ company_id: survivor.id }).eq("id", j.id);
              existingSet.add(j.contact_id);
            }
          }

          // Update contacts.company_id
          await db.from("contacts").update({ company_id: survivor.id }).eq("company_id", loser.id);
          await db.from("companies").delete().eq("id", loser.id);
          merged++;
        }
      }
      addLog(`Phase 2: merged ${merged} duplicate companies`);
    }

    // Phase 3: Domain extraction from website
    if (phase === 3 || phase === "all") {
      addLog("--- Phase 3: Domain extraction ---");
      const companies = await fetchAll("companies", "id, website, domain", { workspace_id });
      const noDomain = companies.filter((co: any) => !co.domain && co.website);

      let extracted = 0;
      for (const co of noDomain) {
        try {
          const u = co.website.startsWith("http") ? co.website : `https://${co.website}`;
          const d = new URL(u).hostname.replace(/^www\./, "");
          if (d && d.includes(".")) {
            await db.from("companies").update({ domain: d }).eq("id", co.id);
            extracted++;
          }
        } catch { /* skip */ }
      }

      // Also propagate from contacts
      const linked = (await fetchAll("contacts", "id, company_id, website, domain", { workspace_id }))
        .filter((c: any) => c.company_id && (c.website || c.domain));

      const seen = new Set<string>();
      let propagated = 0;
      for (const c of linked) {
        if (seen.has(c.company_id)) continue;
        seen.add(c.company_id);
        const { data: co } = await db.from("companies").select("id, website, domain").eq("id", c.company_id).single();
        if (!co) continue;
        const upd: any = {};
        if (!co.website && c.website) upd.website = c.website;
        if (!co.domain) {
          if (c.domain) upd.domain = c.domain;
          else if (c.website) {
            try {
              const u = c.website.startsWith("http") ? c.website : `https://${c.website}`;
              upd.domain = new URL(u).hostname.replace(/^www\./, "");
            } catch { /* skip */ }
          }
        }
        if (Object.keys(upd).length) {
          await db.from("companies").update(upd).eq("id", co.id);
          propagated++;
        }
      }
      addLog(`Phase 3: ${extracted} domains extracted, ${propagated} propagated from contacts`);
    }

    // Phase 4: Domain-based dedup
    if (phase === 4 || phase === "all") {
      addLog("--- Phase 4: Domain-based dedup ---");
      const companies = await fetchAll("companies", "id, name, website, domain, industry, location, stage, notes, created_at", { workspace_id });

      const byDomain = new Map<string, any[]>();
      for (const co of companies) {
        if (!co.domain) continue;
        const d = co.domain.toLowerCase().trim();
        if (!d || d === "gmail.com" || d === "yahoo.com" || d === "hotmail.com" || d === "outlook.com" || d === "icloud.com") continue;
        if (!byDomain.has(d)) byDomain.set(d, []);
        byDomain.get(d)!.push(co);
      }

      let merged = 0;
      for (const [, group] of byDomain) {
        if (group.length <= 1) continue;

        group.sort((a: any, b: any) => {
          const fieldsA = [a.website, a.industry, a.location, a.stage, a.notes].filter(Boolean).length;
          const fieldsB = [b.website, b.industry, b.location, b.stage, b.notes].filter(Boolean).length;
          if (fieldsB !== fieldsA) return fieldsB - fieldsA;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        const survivor = group[0];
        const losers = group.slice(1);

        const updates: any = {};
        for (const field of ["website", "industry", "location", "stage", "notes"]) {
          if (!survivor[field]) {
            for (const loser of losers) {
              if (loser[field]) { updates[field] = loser[field]; break; }
            }
          }
        }
        if (Object.keys(updates).length) {
          await db.from("companies").update(updates).eq("id", survivor.id);
        }

        for (const loser of losers) {
          const junctions = await fetchAll("contact_companies", "id, contact_id", { company_id: loser.id });
          const existingJ = await fetchAll("contact_companies", "contact_id", { company_id: survivor.id });
          const existingSet = new Set(existingJ.map((j: any) => j.contact_id));

          for (const j of junctions) {
            if (existingSet.has(j.contact_id)) {
              await db.from("contact_companies").delete().eq("id", j.id);
            } else {
              await db.from("contact_companies").update({ company_id: survivor.id }).eq("id", j.id);
              existingSet.add(j.contact_id);
            }
          }

          await db.from("contacts").update({ company_id: survivor.id }).eq("company_id", loser.id);
          await db.from("companies").delete().eq("id", loser.id);
          merged++;
        }
      }
      addLog(`Phase 4: merged ${merged} domain-duplicate companies`);
    }

    // Final counts
    const { count: fc } = await db.from("companies").select("*", { count: "exact", head: true }).eq("workspace_id", workspace_id);
    addLog(`Final: ${fc} companies remaining`);

    return new Response(JSON.stringify({ success: true, log }), {
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
