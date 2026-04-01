import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
  createdTime: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const AIRTABLE_TOKEN = Deno.env.get("VITE_AIRTABLE_TOKEN");
  const AIRTABLE_BASE_ID = Deno.env.get("VITE_AIRTABLE_BASE_ID");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const logs: string[] = [];
  const log = (msg: string) => { console.log(msg); logs.push(msg); };
  const errors: Array<{ table: string; id: string; msg: string }> = [];

  // Get user_id
  let userId: string;
  const body = await req.json().catch(() => ({}));
  if (body.user_id) {
    userId = body.user_id;
  } else {
    const { data } = await supabase.auth.admin.listUsers({ perPage: 1 });
    if (!data?.users?.length) {
      return new Response(JSON.stringify({ error: "No auth users. Pass user_id." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    userId = data.users[0].id;
  }

  const step = body.step || "all";
  log(`Step: ${step}, User: ${userId}`);

  // Load existing id map into memory
  const idMap = new Map<string, string>();
  const { data: existingMap } = await supabase.from("_migration_id_map").select("airtable_id, supabase_uuid");
  if (existingMap) {
    for (const row of existingMap) idMap.set(row.airtable_id, row.supabase_uuid);
    log(`Loaded ${idMap.size} existing ID mappings`);
  }

  async function saveMapping(airtableId: string, tableName: string, supabaseUuid: string) {
    idMap.set(airtableId, supabaseUuid);
    await supabase.from("_migration_id_map").upsert({
      airtable_id: airtableId, table_name: tableName,
      supabase_uuid: supabaseUuid, user_id: userId,
    }, { onConflict: "airtable_id,table_name" });
  }

  function resolve(id: string): string | undefined { return idMap.get(id); }

  async function fetchTable(name: string): Promise<AirtableRecord[]> {
    const records: AirtableRecord[] = [];
    let offset: string | undefined;
    do {
      const p = offset ? `?offset=${encodeURIComponent(offset)}` : "";
      const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(name)}${p}`, {
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      });
      if (!res.ok) throw new Error(`${name}: ${res.status}`);
      const j = await res.json() as { records: AirtableRecord[]; offset?: string };
      records.push(...j.records);
      offset = j.offset;
    } while (offset);
    log(`Fetched ${records.length} from ${name}`);
    return records;
  }

  const json = (v: unknown) => new Response(JSON.stringify(v), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  try {
    // STEP: clean - wipe all data for fresh migration
    if (step === "clean") {
      const tables = [
        "project_opportunities", "project_contacts", "opportunity_contacts",
        "campaign_contacts", "contact_categories", "contact_pods",
        "field_config", "interactions", "pipeline_stages", "opportunities",
        "campaigns", "projects", "pipelines", "contacts", "companies",
        "categories", "pods", "_migration_id_map",
      ];
      for (const t of tables) {
        const { error } = await supabase.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        log(`Cleaned ${t}: ${error ? error.message : "ok"}`);
      }
      return json({ success: true, logs });
    }

    // STEP 1: pods + categories
    if (step === "1" || step === "all") {
      const [listRecs, catRecs] = await Promise.all([fetchTable("Lists"), fetchTable("Categories")]);
      for (const r of listRecs) {
        const { data, error } = await supabase.from("pods").insert({
          user_id: userId, name: (r.fields["Name"] as string) ?? "(unnamed)",
          color: (r.fields["Color"] as string | null) ?? null,
          owner: (r.fields["Owner"] as string | null) ?? null,
          is_priority: !!r.fields["Is Priority"],
          cadence: (r.fields["Cadence"] as string | null) ?? null,
          description: (r.fields["Description"] as string | null) ?? null,
          capacity: (r.fields["Capacity"] as number | null) ?? null,
          enrichment_opt_in: !!r.fields["Enrichment Opt-In"],
        }).select("id").single();
        if (error) { errors.push({ table: "pods", id: r.id, msg: error.message }); continue; }
        if (data) await saveMapping(r.id, "pods", data.id);
      }
      log(`Pods: ${listRecs.length}`);
      for (const r of catRecs) {
        const podId = (r.fields["List"] as string[] | undefined)?.[0];
        const resolved = podId ? resolve(podId) : undefined;
        if (!resolved) continue;
        const { data, error } = await supabase.from("categories").insert({
          user_id: userId, name: (r.fields["Name"] as string) ?? "(unnamed)",
          color: (r.fields["Color"] as string | null) ?? null, pod_id: resolved,
        }).select("id").single();
        if (error) { errors.push({ table: "categories", id: r.id, msg: error.message }); continue; }
        if (data) await saveMapping(r.id, "categories", data.id);
      }
      log(`Categories: ${catRecs.length}`);
      if (step === "1") return json({ success: true, logs, errors });
    }

    // STEP 2: companies + contacts (supports offset/limit for batching)
    if (step === "2" || step === "all") {
      const contactRecs = await fetchTable("Contacts");
      const batchOffset = body.offset ?? 0;
      const batchLimit = body.limit ?? 100;
      // Companies first (only on first batch)
      if (batchOffset === 0) {
        const companies = contactRecs.filter((r) => r.fields["Type"] === "Company");
        for (const r of companies) {
          if (resolve(r.id)) continue; // skip already migrated
          const { data, error } = await supabase.from("companies").insert({
            user_id: userId, name: (r.fields["Name"] as string) ?? "(unnamed)",
            industry: (r.fields["Industry"] as string | null) ?? null,
            stage: (r.fields["Stage"] as string | null) ?? null,
            ticker: (r.fields["Ticker"] as string | null) ?? null,
            domain: (r.fields["Domain"] as string | null) ?? null,
            website: (r.fields["Website"] as string | null) ?? null,
            location: (r.fields["Location"] as string | null) ?? null,
            notes: (r.fields["Notes"] as string | null) ?? null,
            custom_fields: (r.fields["Custom Fields"] as Record<string, unknown> | null) ?? null,
          }).select("id").single();
          if (error) { errors.push({ table: "companies", id: r.id, msg: error.message }); continue; }
          if (data) await saveMapping(r.id, "companies", data.id);
        }
        log(`Companies: ${companies.length}`);
      }
      // Filter out already-migrated contacts, then slice batch
      const unmigrated = contactRecs.filter(r => !resolve(r.id));
      const batch = unmigrated.slice(batchOffset, batchOffset + batchLimit);
      log(`Contacts total: ${contactRecs.length}, already migrated: ${contactRecs.length - unmigrated.length}, batch offset: ${batchOffset}, batch size: ${batch.length}, remaining: ${Math.max(0, unmigrated.length - batchOffset - batch.length)}`);
      for (const r of batch) {
        const companyLinked = r.fields["Company Record"] as string[] | undefined;
        const companyId = companyLinked?.[0] ? resolve(companyLinked[0]) : undefined;
        const kvFund = r.fields["KV Fund Investor"];
        const spv = r.fields["SPV Investor"];
        const { data, error } = await supabase.from("contacts").insert({
          user_id: userId, name: (r.fields["Name"] as string) ?? "(unnamed)",
          email: (r.fields["Email"] as string | null) ?? null,
          email_2: (r.fields["Email 2"] as string | null) ?? null,
          email_3: (r.fields["Email 3"] as string | null) ?? null,
          phone: (r.fields["Phone"] as string | null) ?? null,
          company: (r.fields["Company"] as string | null) ?? null,
          company_id: companyId ?? null,
          role: (r.fields["Role"] as string | null) ?? null,
          location: (r.fields["Location"] as string | null) ?? null,
          website: (r.fields["Website"] as string | null) ?? null,
          notes: (r.fields["Notes"] as string | null) ?? null,
          recommended_by: (r.fields["Recommended By"] as string | null) ?? null,
          specialization: (r.fields["Specialization"] as string | null) ?? null,
          past_clients: (r.fields["Past Clients"] as string | null) ?? null,
          birthday: (r.fields["Birthday"] as string | null) ?? null,
          milestones: (r.fields["Milestones"] as string | null) ?? null,
          interests: (r.fields["Interests"] as string | null) ?? null,
          relationship_context: (r.fields["Relationship Context"] as string | null) ?? null,
          last_contacted_at: (r.fields["Last Contacted At"] as string | null) ?? null,
          cadence_override: (r.fields["Cadence Override"] as string | null) ?? null,
          first_name: (r.fields["First Name"] as string | null) ?? null,
          last_name: (r.fields["Last Name"] as string | null) ?? null,
          linkedin: (r.fields["LinkedIn"] as string | null) ?? null,
          country: (r.fields["Country"] as string | null) ?? null,
          global_region: (r.fields["Global Region"] as string | null) ?? null,
          gender: (r.fields["Gender"] as string | null) ?? null,
          introduced_by: (r.fields["Introduced By"] as string | null) ?? null,
          intel_notes: (r.fields["Intel Notes"] as string | null) ?? null,
          relationship_owner: (r.fields["Relationship Owner"] as string | null) ?? null,
          contact_frequency: (r.fields["Contact Frequency"] as string | null) ?? null,
          next_follow_up_date: (r.fields["Next Follow Up Date"] as string | null) ?? null,
          next_action: (r.fields["Next Action"] as string | null) ?? null,
          kv_fund_investor: Array.isArray(kvFund) ? kvFund : kvFund ? [kvFund as string] : null,
          spv_investor: Array.isArray(spv) ? spv : spv ? [spv as string] : null,
          needs_review: !!r.fields["Needs Review"],
          type: (r.fields["Type"] === "Company" ? "Company" : "Contact") as "Contact" | "Company",
          status: (r.fields["Status"] as string | null) ?? "Active",
          industry: (r.fields["Industry"] as string | null) ?? null,
          stage: (r.fields["Stage"] as string | null) ?? null,
          ticker: (r.fields["Ticker"] as string | null) ?? null,
          domain: (r.fields["Domain"] as string | null) ?? null,
          custom_fields: (r.fields["Custom Fields"] as Record<string, unknown> | null) ?? {},
        }).select("id").single();
        if (error) { errors.push({ table: "contacts", id: r.id, msg: error.message }); continue; }
        if (data) await saveMapping(r.id, "contacts", data.id);
      }
      const remaining = Math.max(0, unmigrated.length - batchOffset - batch.length);
      if (step === "2") return json({ success: true, logs, errors, remaining, total: contactRecs.length, migrated: contactRecs.length - unmigrated.length + batch.length });
    }

    // STEP 3: junctions (contact_pods, contact_categories)
    if (step === "3" || step === "all") {
      const contactRecs = await fetchTable("Contacts");
      // contact_pods
      const cpRows: Record<string, unknown>[] = [];
      for (const r of contactRecs) {
        const cid = resolve(r.id); if (!cid) continue;
        const lists = r.fields["Lists"] as string[] | undefined; if (!lists?.length) continue;
        const primary = r.fields["Primary List ID"] as string | undefined;
        for (const lid of lists) {
          const pid = resolve(lid); if (!pid) continue;
          cpRows.push({ user_id: userId, contact_id: cid, pod_id: pid, is_primary: primary ? lid === primary : lists.indexOf(lid) === 0 });
        }
      }
      for (let i = 0; i < cpRows.length; i += 50) {
        const { error } = await supabase.from("contact_pods").insert(cpRows.slice(i, i + 50));
        if (error) errors.push({ table: "contact_pods", id: `batch-${i}`, msg: error.message });
      }
      log(`contact_pods: ${cpRows.length}`);
      // contact_categories
      const ccRows: Record<string, unknown>[] = [];
      for (const r of contactRecs) {
        const cid = resolve(r.id); if (!cid) continue;
        const cats = r.fields["Categories"] as string[] | undefined; if (!cats?.length) continue;
        for (const catId of cats) {
          const resolved = resolve(catId); if (!resolved) continue;
          ccRows.push({ user_id: userId, contact_id: cid, category_id: resolved });
        }
      }
      for (let i = 0; i < ccRows.length; i += 50) {
        const { error } = await supabase.from("contact_categories").insert(ccRows.slice(i, i + 50));
        if (error) errors.push({ table: "contact_categories", id: `batch-${i}`, msg: error.message });
      }
      log(`contact_categories: ${ccRows.length}`);
      if (step === "3") return json({ success: true, logs, errors });
    }

    // STEP 4: interactions
    if (step === "4" || step === "all") {
      const recs = await fetchTable("Interactions");
      for (const r of recs) {
        const linked = r.fields["Contact"] as string[] | undefined;
        const cid = linked?.[0] ? resolve(linked[0]) : undefined;
        if (!cid) { errors.push({ table: "interactions", id: r.id, msg: "no contact" }); continue; }
        const { data, error } = await supabase.from("interactions").insert({
          user_id: userId, contact_id: cid,
          type: ((r.fields["Type"] as string | null) ?? "note").toLowerCase(),
          date: (r.fields["Date"] as string | null) ?? r.createdTime.split("T")[0],
          notes: (r.fields["Notes"] as string | null) ?? null,
          summary: (r.fields["Summary"] as string | null) ?? null,
          source: (r.fields["Source"] as string | null) ?? null,
          email_link: (r.fields["Email Link"] as string | null) ?? null,
          granola_link: (r.fields["Granola Link"] as string | null) ?? null,
          event_detail: (r.fields["Event Detail"] as string | null) ?? null,
          actor: (r.fields["Actor"] as string | null) ?? null,
        }).select("id").single();
        if (error) { errors.push({ table: "interactions", id: r.id, msg: error.message }); continue; }
        if (data) await saveMapping(r.id, "interactions", data.id);
      }
      log(`Interactions: ${recs.length}`);
      if (step === "4") return json({ success: true, logs, errors });
    }

    // STEP 5: pipelines, stages, opportunities, opp_contacts
    if (step === "5" || step === "all") {
      const [pipRecs, stageRecs, oppRecs] = await Promise.all([
        fetchTable("Pipelines").catch(() => []),
        fetchTable("Pipeline Stages").catch(() => []),
        fetchTable("Opportunities").catch(() => []),
      ]);
      for (const r of pipRecs) {
        const { data, error } = await supabase.from("pipelines").insert({
          user_id: userId, name: (r.fields["Name"] as string) ?? "(unnamed)",
          status: ((r.fields["Status"] as string | null) ?? "active").toLowerCase(),
        }).select("id").single();
        if (error) { errors.push({ table: "pipelines", id: r.id, msg: error.message }); continue; }
        if (data) await saveMapping(r.id, "pipelines", data.id);
      }
      for (const r of stageRecs) {
        const pid = (r.fields["Pipeline"] as string[] | undefined)?.[0];
        const resolved = pid ? resolve(pid) : undefined;
        if (!resolved) continue;
        const { data, error } = await supabase.from("pipeline_stages").insert({
          user_id: userId, name: (r.fields["Name"] as string) ?? "(unnamed)",
          pipeline_id: resolved, color: (r.fields["Color"] as string | null) ?? null,
          order: (r.fields["Order"] as number | null) ?? 0,
        }).select("id").single();
        if (error) { errors.push({ table: "pipeline_stages", id: r.id, msg: error.message }); continue; }
        if (data) await saveMapping(r.id, "pipeline_stages", data.id);
      }
      for (const r of oppRecs) {
        const sid = (r.fields["Stage"] as string[] | undefined)?.[0];
        const resolved = sid ? resolve(sid) : undefined;
        const { data, error } = await supabase.from("opportunities").insert({
          user_id: userId, name: (r.fields["Name"] as string) ?? "(unnamed)",
          stage_id: resolved ?? null, notes: (r.fields["Notes"] as string | null) ?? null,
          priority: (r.fields["Priority"] as string | null) ?? null,
          status: ((r.fields["Status"] as string | null) ?? "open").toLowerCase(),
        }).select("id").single();
        if (error) { errors.push({ table: "opportunities", id: r.id, msg: error.message }); continue; }
        if (data) await saveMapping(r.id, "opportunities", data.id);
      }
      // opportunity_contacts
      const ocRows: Record<string, unknown>[] = [];
      for (const r of oppRecs) {
        const oid = resolve(r.id); if (!oid) continue;
        const linked = r.fields["Relationships"] as string[] | undefined;
        for (const airId of linked ?? []) {
          const cid = resolve(airId); if (cid) ocRows.push({ user_id: userId, opportunity_id: oid, contact_id: cid });
        }
      }
      if (ocRows.length) {
        for (let i = 0; i < ocRows.length; i += 50) {
          const { error } = await supabase.from("opportunity_contacts").insert(ocRows.slice(i, i + 50));
          if (error) errors.push({ table: "opportunity_contacts", id: `batch-${i}`, msg: error.message });
        }
      }
      log(`Pipelines: ${pipRecs.length}, Stages: ${stageRecs.length}, Opps: ${oppRecs.length}, OC: ${ocRows.length}`);
      if (step === "5") return json({ success: true, logs, errors });
    }

    // STEP 6: campaigns, campaign_contacts, projects, project junctions, field_config
    if (step === "6" || step === "all") {
      const [campRecs, ccRecs, projRecs, fcRecs] = await Promise.all([
        fetchTable("Campaigns").catch(() => []),
        fetchTable("CampaignContacts").catch(() => []),
        fetchTable("Projects").catch(() => []),
        fetchTable("Field Config").catch(() => []),
      ]);
      for (const r of campRecs) {
        const { data, error } = await supabase.from("campaigns").insert({
          user_id: userId, name: (r.fields["Name"] as string) ?? "(unnamed)",
          type: ((r.fields["Type"] as string | null) ?? "other").toLowerCase(),
          deadline: (r.fields["Deadline"] as string | null) ?? null,
          status: ((r.fields["Status"] as string | null) ?? "active").toLowerCase(),
        }).select("id").single();
        if (error) { errors.push({ table: "campaigns", id: r.id, msg: error.message }); continue; }
        if (data) await saveMapping(r.id, "campaigns", data.id);
      }
      for (const r of ccRecs) {
        const campId = (r.fields["Campaign"] as string[] | undefined)?.[0];
        const contId = (r.fields["Contact"] as string[] | undefined)?.[0];
        const rc = campId ? resolve(campId) : undefined;
        const rco = contId ? resolve(contId) : undefined;
        if (!rc || !rco) continue;
        await supabase.from("campaign_contacts").insert({
          user_id: userId, campaign_id: rc, contact_id: rco,
          status: ((r.fields["Status"] as string | null) ?? "pending").toLowerCase(),
          notes: (r.fields["Notes"] as string | null) ?? null,
        });
      }
      for (const r of projRecs) {
        const { data, error } = await supabase.from("projects").insert({
          user_id: userId, name: (r.fields["Name"] as string) ?? "(unnamed)",
          description: (r.fields["Description"] as string | null) ?? null,
          owner: (r.fields["Owner"] as string | null) ?? null,
          notes: (r.fields["Notes"] as string | null) ?? null,
        }).select("id").single();
        if (error) { errors.push({ table: "projects", id: r.id, msg: error.message }); continue; }
        if (data) await saveMapping(r.id, "projects", data.id);
        const pid = data!.id;
        const linkedC = r.fields["Relationships"] as string[] | undefined;
        if (linkedC?.length) {
          const rows = linkedC.map(a => resolve(a)).filter((v): v is string => !!v)
            .map(cid => ({ user_id: userId, project_id: pid, contact_id: cid }));
          if (rows.length) await supabase.from("project_contacts").insert(rows);
        }
        const linkedO = r.fields["Opportunities"] as string[] | undefined;
        if (linkedO?.length) {
          const rows = linkedO.map(a => resolve(a)).filter((v): v is string => !!v)
            .map(oid => ({ user_id: userId, project_id: pid, opportunity_id: oid }));
          if (rows.length) await supabase.from("project_opportunities").insert(rows);
        }
      }
      for (const r of fcRecs) {
        const podId = (r.fields["Scope Pod"] as string[] | undefined)?.[0];
        const resolved = podId ? resolve(podId) : undefined;
        await supabase.from("field_config").insert({
          user_id: userId, name: (r.fields["Name"] as string) ?? "(unnamed)",
          airtable_field_id: (r.fields["Airtable Field ID"] as string | null) ?? null,
          field_type: (r.fields["Field Type"] as string) ?? "text",
          scope_type: (r.fields["Scope Type"] as string) ?? "global",
          scope_pod_id: resolved ?? null,
          required: !!r.fields["Required"],
          display_order: (r.fields["Display Order"] as number | null) ?? 0,
        });
      }
      log(`Campaigns: ${campRecs.length}, CC: ${ccRecs.length}, Projects: ${projRecs.length}, FC: ${fcRecs.length}`);
      if (step === "6") return json({ success: true, logs, errors });
    }

    // STEP: find_gaps - compare Airtable IDs against migration map
    if (step === "find_gaps") {
      const [atContacts, atInteractions] = await Promise.all([
        fetchTable("Contacts"),
        fetchTable("Interactions"),
      ]);
      const { data: mapRows } = await supabase.from("_migration_id_map")
        .select("airtable_id, table_name")
        .in("table_name", ["contacts", "interactions"]);
      const mapped = new Set((mapRows || []).map(r => r.airtable_id));

      const missingContacts = atContacts
        .filter(r => !mapped.has(r.id))
        .map(r => ({ airtable_id: r.id, name: r.fields["Name"], email: r.fields["Email"], company: r.fields["Company"] }));
      const missingInteractions = atInteractions
        .filter(r => !mapped.has(r.id))
        .map(r => ({ airtable_id: r.id, contact_ref: r.fields["Contact"], type: r.fields["Type"], date: r.fields["Date"], notes: String(r.fields["Notes"] || "").slice(0, 100) }));

      log(`Airtable contacts: ${atContacts.length}, mapped: ${atContacts.length - missingContacts.length}, missing: ${missingContacts.length}`);
      log(`Airtable interactions: ${atInteractions.length}, mapped: ${atInteractions.length - missingInteractions.length}, missing: ${missingInteractions.length}`);

      return json({ success: true, logs, missingContacts, missingInteractions });
    }

    // STEP: count - just report counts
    if (step === "count" || step === "all") {
      const tables = ["pods","categories","companies","contacts","contact_pods","contact_categories",
        "interactions","pipelines","pipeline_stages","opportunities","opportunity_contacts",
        "campaigns","campaign_contacts","projects","project_contacts","project_opportunities","field_config"];
      for (const t of tables) {
        const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
        log(`${t}: ${count ?? 0}`);
      }
    }

    return json({ success: true, logs, errors, idMapSize: idMap.size });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log(`Fatal: ${msg}`);
    return json({ success: false, error: msg, logs, errors });
  }
});
