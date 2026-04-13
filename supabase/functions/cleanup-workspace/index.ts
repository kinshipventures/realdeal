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
    if (!phase) throw new Error("phase required (1-5 or 'all')");

    addLog(`Cleanup workspace=${workspace_id} phase=${phase}`);

    // Helper: fetch all rows paging through 1000-row limit
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

    // ─── Phase 1: Split first/last names ───
    if (phase === 1 || phase === "all") {
      addLog("--- Phase 1: Split first/last names ---");
      // Fetch contacts missing first_name in pages
      const allContacts = await fetchAll("contacts", "id, name, first_name, last_name", { workspace_id });
      const toSplit = allContacts.filter((c: any) => !c.first_name && !c.last_name && c.name && c.name.trim().includes(" "));

      let count = 0;
      for (const c of toSplit) {
        const trimmed = c.name.trim();
        const idx = trimmed.indexOf(" ");
        await db.from("contacts").update({
          first_name: trimmed.substring(0, idx),
          last_name: trimmed.substring(idx + 1).trim(),
        }).eq("id", c.id);
        count++;
      }
      addLog(`Phase 1: split ${count} names`);
    }

    // ─── Phase 2: Link contacts to existing companies ───
    if (phase === 2 || phase === "all") {
      addLog("--- Phase 2: Link to existing companies ---");
      const companies = await fetchAll("companies", "id, name", { workspace_id });
      const companyByName = new Map<string, string>();
      for (const co of companies) companyByName.set(co.name.toLowerCase().trim(), co.id);

      const unlinked = (await fetchAll("contacts", "id, company, company_id", { workspace_id }))
        .filter((c: any) => !c.company_id && c.company);

      const existingJ = await fetchAll("contact_companies", "contact_id, company_id", { workspace_id });
      const jSet = new Set(existingJ.map((j: any) => `${j.contact_id}:${j.company_id}`));

      let linked = 0;
      const jBatch: any[] = [];
      for (const c of unlinked) {
        const cid = companyByName.get(c.company.toLowerCase().trim());
        if (!cid) continue;
        await db.from("contacts").update({ company_id: cid }).eq("id", c.id);
        const jk = `${c.id}:${cid}`;
        if (!jSet.has(jk)) {
          jBatch.push({ contact_id: c.id, company_id: cid, is_primary: true, user_id: userId, workspace_id });
          jSet.add(jk);
        }
        linked++;
      }
      for (let i = 0; i < jBatch.length; i += 100) {
        await db.from("contact_companies").insert(jBatch.slice(i, i + 100));
      }
      addLog(`Phase 2: linked ${linked} contacts`);
    }

    // ─── Phase 3: Auto-create companies ───
    if (phase === 3 || phase === "all") {
      addLog("--- Phase 3: Auto-create companies ---");
      const companies = await fetchAll("companies", "id, name", { workspace_id });
      const companyByName = new Map<string, string>();
      for (const co of companies) companyByName.set(co.name.toLowerCase().trim(), co.id);

      const unlinked = (await fetchAll("contacts", "id, company, company_id, website, domain, location, industry, stage", { workspace_id }))
        .filter((c: any) => !c.company_id && c.company && c.company.trim());

      // Group by company name
      const groups = new Map<string, any[]>();
      for (const c of unlinked) {
        const key = c.company.toLowerCase().trim();
        if (companyByName.has(key)) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
      }

      const existingJ = await fetchAll("contact_companies", "contact_id, company_id", { workspace_id });
      const jSet = new Set(existingJ.map((j: any) => `${j.contact_id}:${j.company_id}`));

      let created = 0, linked = 0;
      for (const [key, contacts] of groups) {
        const name = contacts[0].company.trim();
        let website: string | null = null, domain: string | null = null,
            location: string | null = null, industry: string | null = null, stage: string | null = null;
        for (const c of contacts) {
          if (!website && c.website) website = c.website;
          if (!domain && c.domain) domain = c.domain;
          if (!location && c.location) location = c.location;
          if (!industry && c.industry) industry = c.industry;
          if (!stage && c.stage) stage = c.stage;
        }
        if (!domain && website) {
          try {
            const u = website.startsWith("http") ? website : `https://${website}`;
            domain = new URL(u).hostname.replace(/^www\./, "");
          } catch { /* skip */ }
        }

        const { data: newCo, error } = await db.from("companies")
          .insert({ name, website, domain, location, industry, stage, user_id: userId, workspace_id })
          .select("id").single();
        if (error || !newCo) { addLog(`  Failed: "${name}" ${error?.message}`); continue; }

        created++;
        companyByName.set(key, newCo.id);

        const jBatch: any[] = [];
        for (const c of contacts) {
          await db.from("contacts").update({ company_id: newCo.id }).eq("id", c.id);
          const jk = `${c.id}:${newCo.id}`;
          if (!jSet.has(jk)) {
            jBatch.push({ contact_id: c.id, company_id: newCo.id, is_primary: true, user_id: userId, workspace_id });
            jSet.add(jk);
          }
          linked++;
        }
        for (let i = 0; i < jBatch.length; i += 100) {
          await db.from("contact_companies").insert(jBatch.slice(i, i + 100));
        }
      }
      addLog(`Phase 3: created ${created} companies, linked ${linked} contacts`);
    }

    // ─── Phase 4: Move Company-type contacts ───
    if (phase === 4 || phase === "all") {
      addLog("--- Phase 4: Move Company-type contacts ---");
      const SKIP = ["(formerly goop)", "freelance"];
      const companyContacts = await fetchAll("contacts", "*", { workspace_id, type: "Company" });

      const companies = await fetchAll("companies", "id, name", { workspace_id });
      const companyByName = new Map<string, string>();
      for (const co of companies) companyByName.set(co.name.toLowerCase().trim(), co.id);

      let moved = 0;
      for (const cc of companyContacts) {
        if (SKIP.includes(cc.name.toLowerCase().trim())) { addLog(`  Skip "${cc.name}"`); continue; }

        let targetId = companyByName.get(cc.name.toLowerCase().trim());
        if (!targetId) {
          const { data: newCo } = await db.from("companies")
            .insert({ name: cc.name, website: cc.website, domain: cc.domain, location: cc.location,
              industry: cc.industry, stage: cc.stage, ticker: cc.ticker, notes: cc.notes,
              custom_fields: cc.custom_fields || {}, user_id: userId, workspace_id })
            .select("id").single();
          if (!newCo) { addLog(`  Failed: "${cc.name}"`); continue; }
          targetId = newCo.id;
        }

        for (const t of ["contact_pods", "contact_categories", "contact_companies", "campaign_contacts", "opportunity_contacts", "project_contacts"]) {
          await db.from(t).delete().eq("contact_id", cc.id);
        }
        await db.from("interactions").delete().eq("contact_id", cc.id);
        await db.from("contacts").delete().eq("id", cc.id);
        moved++;
        addLog(`  Moved "${cc.name}"`);
      }
      addLog(`Phase 4: moved ${moved}`);
    }

    // ─── Phase 5: Backfill domains ───
    if (phase === 5 || phase === "all") {
      addLog("--- Phase 5: Backfill domains ---");
      const noDomain = (await fetchAll("companies", "id, website, domain", { workspace_id }))
        .filter((co: any) => !co.domain && co.website);

      let extracted = 0;
      for (const co of noDomain) {
        try {
          const u = co.website.startsWith("http") ? co.website : `https://${co.website}`;
          const d = new URL(u).hostname.replace(/^www\./, "");
          await db.from("companies").update({ domain: d }).eq("id", co.id);
          extracted++;
        } catch { /* skip */ }
      }

      // Propagate from contacts to companies
      const linked = (await fetchAll("contacts", "id, company_id, website, domain", { workspace_id }))
        .filter((c: any) => c.company_id && c.website);

      const seen = new Set<string>();
      let propagated = 0;
      for (const c of linked) {
        if (seen.has(c.company_id)) continue;
        seen.add(c.company_id);
        const { data: co } = await db.from("companies").select("id, website, domain").eq("id", c.company_id).single();
        if (!co) continue;
        const updates: any = {};
        if (!co.website && c.website) updates.website = c.website;
        if (!co.domain) {
          if (c.domain) updates.domain = c.domain;
          else if (c.website) {
            try {
              const u = c.website.startsWith("http") ? c.website : `https://${c.website}`;
              updates.domain = new URL(u).hostname.replace(/^www\./, "");
            } catch { /* skip */ }
          }
        }
        if (Object.keys(updates).length) {
          await db.from("companies").update(updates).eq("id", co.id);
          propagated++;
        }
      }
      addLog(`Phase 5: ${extracted} domains extracted, ${propagated} propagated`);
    }

    // Final counts
    const { count: fc } = await db.from("contacts").select("*", { count: "exact", head: true }).eq("workspace_id", workspace_id);
    const { count: fco } = await db.from("companies").select("*", { count: "exact", head: true }).eq("workspace_id", workspace_id);
    addLog(`Final: ${fc} contacts, ${fco} companies`);

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
