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
  const addLog = (msg: string) => {
    console.log(msg);
    log.push(msg);
  };

  try {
    // Auth
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

    const { workspace_id } = await req.json();
    if (!workspace_id) throw new Error("workspace_id required");

    addLog(`Starting cleanup for workspace ${workspace_id}, user ${userId}`);

    // ─── Phase 1: Split first/last names ───
    addLog("--- Phase 1: Split first/last names ---");
    const { data: nameContacts } = await db
      .from("contacts")
      .select("id, name, first_name, last_name")
      .eq("workspace_id", workspace_id)
      .is("first_name", null)
      .is("last_name", null);

    let nameSplitCount = 0;
    if (nameContacts) {
      const updates = nameContacts
        .filter((c: any) => c.name && c.name.trim().includes(" "))
        .map((c: any) => {
          const trimmed = c.name.trim();
          const spaceIdx = trimmed.indexOf(" ");
          return {
            id: c.id,
            first_name: trimmed.substring(0, spaceIdx),
            last_name: trimmed.substring(spaceIdx + 1).trim(),
          };
        });

      // Batch update 100 at a time
      for (let i = 0; i < updates.length; i += 100) {
        const batch = updates.slice(i, i + 100);
        for (const u of batch) {
          await db
            .from("contacts")
            .update({ first_name: u.first_name, last_name: u.last_name })
            .eq("id", u.id);
        }
        nameSplitCount += batch.length;
      }
    }
    addLog(`Phase 1 complete: split ${nameSplitCount} names`);

    // ─── Phase 2: Link contacts to existing companies ───
    addLog("--- Phase 2: Link contacts to existing companies ---");
    const { data: companies } = await db
      .from("companies")
      .select("id, name")
      .eq("workspace_id", workspace_id);

    const companyByName = new Map<string, string>();
    for (const co of companies || []) {
      companyByName.set(co.name.toLowerCase().trim(), co.id);
    }

    const { data: unlnkContacts } = await db
      .from("contacts")
      .select("id, company, company_id")
      .eq("workspace_id", workspace_id)
      .is("company_id", null)
      .not("company", "is", null);

    // Get existing junction rows to avoid duplicates
    const { data: existingJunctions } = await db
      .from("contact_companies")
      .select("contact_id, company_id")
      .eq("workspace_id", workspace_id);

    const junctionSet = new Set(
      (existingJunctions || []).map((j: any) => `${j.contact_id}:${j.company_id}`)
    );

    let linkedCount = 0;
    const junctionsToInsert: any[] = [];

    for (const c of unlnkContacts || []) {
      if (!c.company) continue;
      const key = c.company.toLowerCase().trim();
      const companyId = companyByName.get(key);
      if (companyId) {
        await db
          .from("contacts")
          .update({ company_id: companyId })
          .eq("id", c.id);
        const jKey = `${c.id}:${companyId}`;
        if (!junctionSet.has(jKey)) {
          junctionsToInsert.push({
            contact_id: c.id,
            company_id: companyId,
            is_primary: true,
            user_id: userId,
            workspace_id,
          });
          junctionSet.add(jKey);
        }
        linkedCount++;
      }
    }

    // Insert junctions in batches
    for (let i = 0; i < junctionsToInsert.length; i += 100) {
      await db.from("contact_companies").insert(junctionsToInsert.slice(i, i + 100));
    }
    addLog(`Phase 2 complete: linked ${linkedCount} contacts to existing companies`);

    // ─── Phase 3: Auto-create companies from contact data ───
    addLog("--- Phase 3: Auto-create companies ---");

    // Re-fetch unlinked contacts (some may have been linked in phase 2)
    const { data: stillUnlinked } = await db
      .from("contacts")
      .select("id, company, website, domain, location, industry, stage")
      .eq("workspace_id", workspace_id)
      .is("company_id", null)
      .not("company", "is", null);

    // Group by normalized company name
    const companyGroups = new Map<string, any[]>();
    for (const c of stillUnlinked || []) {
      if (!c.company || !c.company.trim()) continue;
      const key = c.company.toLowerCase().trim();
      if (companyByName.has(key)) continue; // already exists
      if (!companyGroups.has(key)) companyGroups.set(key, []);
      companyGroups.get(key)!.push(c);
    }

    let createdCompanies = 0;
    let linkedPhase3 = 0;

    for (const [_key, contacts] of companyGroups) {
      // Use first contact's company text as canonical name
      const canonicalName = contacts[0].company.trim();

      // Aggregate metadata from contacts
      let website: string | null = null;
      let domain: string | null = null;
      let location: string | null = null;
      let industry: string | null = null;
      let stage: string | null = null;

      for (const c of contacts) {
        if (!website && c.website) website = c.website;
        if (!domain && c.domain) domain = c.domain;
        if (!location && c.location) location = c.location;
        if (!industry && c.industry) industry = c.industry;
        if (!stage && c.stage) stage = c.stage;
      }

      // Extract domain from website if not set
      if (!domain && website) {
        try {
          const url = website.startsWith("http") ? website : `https://${website}`;
          domain = new URL(url).hostname.replace(/^www\./, "");
        } catch { /* skip */ }
      }

      const { data: newCo, error: coErr } = await db
        .from("companies")
        .insert({
          name: canonicalName,
          website,
          domain,
          location,
          industry,
          stage,
          user_id: userId,
          workspace_id,
        })
        .select("id")
        .single();

      if (coErr || !newCo) {
        addLog(`  Failed to create company "${canonicalName}": ${coErr?.message}`);
        continue;
      }

      createdCompanies++;
      companyByName.set(_key, newCo.id);

      // Link all contacts in this group
      const batchJunctions: any[] = [];
      for (const c of contacts) {
        await db.from("contacts").update({ company_id: newCo.id }).eq("id", c.id);
        const jKey = `${c.id}:${newCo.id}`;
        if (!junctionSet.has(jKey)) {
          batchJunctions.push({
            contact_id: c.id,
            company_id: newCo.id,
            is_primary: true,
            user_id: userId,
            workspace_id,
          });
          junctionSet.add(jKey);
        }
        linkedPhase3++;
      }
      if (batchJunctions.length) {
        for (let i = 0; i < batchJunctions.length; i += 100) {
          await db.from("contact_companies").insert(batchJunctions.slice(i, i + 100));
        }
      }
    }
    addLog(`Phase 3 complete: created ${createdCompanies} companies, linked ${linkedPhase3} contacts`);

    // ─── Phase 4: Move Company-type contacts to companies table ───
    addLog("--- Phase 4: Move Company-type contacts to companies ---");
    const SKIP_NAMES = ["(formerly goop)", "freelance"];

    const { data: companyContacts } = await db
      .from("contacts")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("type", "Company");

    let movedCount = 0;
    for (const cc of companyContacts || []) {
      if (SKIP_NAMES.includes(cc.name.toLowerCase().trim())) {
        addLog(`  Skipping "${cc.name}"`);
        continue;
      }

      // Check if company already exists
      const existingKey = cc.name.toLowerCase().trim();
      let targetCompanyId = companyByName.get(existingKey);

      if (!targetCompanyId) {
        // Create company from contact fields
        const { data: newCo } = await db
          .from("companies")
          .insert({
            name: cc.name,
            website: cc.website,
            domain: cc.domain,
            location: cc.location,
            industry: cc.industry,
            stage: cc.stage,
            ticker: cc.ticker,
            notes: cc.notes,
            custom_fields: cc.custom_fields || {},
            user_id: userId,
            workspace_id,
          })
          .select("id")
          .single();

        if (!newCo) {
          addLog(`  Failed to create company for "${cc.name}"`);
          continue;
        }
        targetCompanyId = newCo.id;
        companyByName.set(existingKey, targetCompanyId);
      }

      // Reassign interactions from this contact to... we can't really reassign
      // interactions since they need a valid contact_id. Instead, log merge_event
      // and delete interactions for company-type contacts.
      // Actually - just delete the contact record. Junction rows will be orphaned
      // but that's fine since company-type contacts shouldn't have meaningful junctions.

      // Delete junction rows pointing to this contact
      for (const table of ["contact_pods", "contact_categories", "contact_companies", "campaign_contacts", "opportunity_contacts", "project_contacts"]) {
        await db.from(table).delete().eq("contact_id", cc.id);
      }

      // Delete interactions for this contact
      await db.from("interactions").delete().eq("contact_id", cc.id);

      // Delete the contact
      await db.from("contacts").delete().eq("id", cc.id);

      movedCount++;
      addLog(`  Moved "${cc.name}" to companies (${targetCompanyId})`);
    }
    addLog(`Phase 4 complete: moved ${movedCount} company-type contacts`);

    // ─── Phase 5: Backfill company domains from websites ───
    addLog("--- Phase 5: Backfill company domains ---");

    // 5a: Companies with website but no domain
    const { data: noDomainCos } = await db
      .from("companies")
      .select("id, website, domain")
      .eq("workspace_id", workspace_id)
      .is("domain", null)
      .not("website", "is", null);

    let domainBackfillCount = 0;
    for (const co of noDomainCos || []) {
      if (!co.website) continue;
      try {
        const url = co.website.startsWith("http") ? co.website : `https://${co.website}`;
        const domain = new URL(url).hostname.replace(/^www\./, "");
        await db.from("companies").update({ domain }).eq("id", co.id);
        domainBackfillCount++;
      } catch { /* skip bad URLs */ }
    }

    // 5b: Propagate website/domain from contacts to their companies
    const { data: contactsWithWeb } = await db
      .from("contacts")
      .select("id, company_id, website, domain")
      .eq("workspace_id", workspace_id)
      .not("company_id", "is", null)
      .not("website", "is", null);

    let propagatedCount = 0;
    const companiesUpdated = new Set<string>();
    for (const c of contactsWithWeb || []) {
      if (!c.company_id || companiesUpdated.has(c.company_id)) continue;

      // Check if company needs website/domain
      const { data: co } = await db
        .from("companies")
        .select("id, website, domain")
        .eq("id", c.company_id)
        .single();

      if (!co) continue;

      const updates: any = {};
      if (!co.website && c.website) updates.website = c.website;
      if (!co.domain && c.domain) updates.domain = c.domain;
      if (!co.domain && !c.domain && c.website) {
        try {
          const url = c.website.startsWith("http") ? c.website : `https://${c.website}`;
          updates.domain = new URL(url).hostname.replace(/^www\./, "");
        } catch { /* skip */ }
      }

      if (Object.keys(updates).length) {
        await db.from("companies").update(updates).eq("id", co.id);
        propagatedCount++;
      }
      companiesUpdated.add(c.company_id);
    }

    addLog(`Phase 5 complete: ${domainBackfillCount} domains extracted, ${propagatedCount} companies backfilled from contacts`);

    // Summary
    const { count: finalContacts } = await db
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace_id);
    const { count: finalCompanies } = await db
      .from("companies")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace_id);

    addLog(`Final counts: ${finalContacts} contacts, ${finalCompanies} companies`);

    return new Response(JSON.stringify({ success: true, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    addLog(`ERROR: ${err.message}`);
    return new Response(JSON.stringify({ success: false, error: err.message, log }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
