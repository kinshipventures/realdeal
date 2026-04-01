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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get user_id from request body or look up first auth user
  let MIGRATION_USER_ID: string;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.user_id) {
      MIGRATION_USER_ID = body.user_id;
    } else {
      // Look up first auth user via admin API
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1 });
      if (!usersData?.users?.length) {
        return new Response(JSON.stringify({ error: "No auth users found. Pass user_id in request body." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      MIGRATION_USER_ID = usersData.users[0].id;
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const logs: string[] = [];
  const log = (msg: string) => { console.log(msg); logs.push(msg); };

  // ID mapping
  const idMap = new Map<string, string>();
  const migrationErrors: Array<{ table: string; airtableId: string; message: string }> = [];
  const airtableCounts: Record<string, number> = {};

  async function recordMapping(airtableId: string, tableName: string, supabaseUuid: string) {
    idMap.set(airtableId, supabaseUuid);
    const { error } = await supabase.from("_migration_id_map").insert({
      airtable_id: airtableId,
      table_name: tableName,
      supabase_uuid: supabaseUuid,
      user_id: MIGRATION_USER_ID,
    });
    if (error) log(`  [id-map warn] ${airtableId}: ${error.message}`);
  }

  function resolveId(airtableId: string): string | undefined {
    return idMap.get(airtableId);
  }

  function resolveIds(ids: unknown): string[] {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    return (ids as string[]).map((id) => idMap.get(id)).filter((id): id is string => !!id);
  }

  function logErr(table: string, airtableId: string, e: unknown) {
    const message = e instanceof Error ? e.message : (e as { message?: string }).message ?? String(e);
    migrationErrors.push({ table, airtableId, message });
    log(`  [error] ${table} ${airtableId}: ${message}`);
  }

  async function fetchAirtableTable(tableName: string): Promise<AirtableRecord[]> {
    const records: AirtableRecord[] = [];
    let offset: string | undefined;
    do {
      const params = offset ? `?offset=${encodeURIComponent(offset)}` : "";
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}${params}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
      if (!res.ok) throw new Error(`Airtable fetch failed for "${tableName}": ${res.status} ${await res.text()}`);
      const json = await res.json() as { records: AirtableRecord[]; offset?: string };
      records.push(...json.records);
      offset = json.offset;
    } while (offset);
    log(`  Fetched ${records.length} from Airtable:${tableName}`);
    return records;
  }

  const BATCH_SIZE = 50;
  async function batchInsert(table: string, rows: Record<string, unknown>[], airtableIds?: string[]): Promise<void> {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase.from(table).insert(batch).select("id");
      if (error) { log(`  [error] batch insert into ${table}: ${error.message}`); continue; }
      if (airtableIds && data) {
        for (let j = 0; j < batch.length; j++) {
          const airId = airtableIds[i + j];
          const row = data[j];
          if (airId && row) await recordMapping(airId, table, row.id);
        }
      }
    }
  }

  // Migration steps
  async function migratePods(records: AirtableRecord[]) {
    log("\n[1/14] Pods (Lists)...");
    airtableCounts["pods"] = records.length;
    const rows = records.map((r) => ({
      user_id: MIGRATION_USER_ID,
      name: (r.fields["Name"] as string) ?? "(unnamed)",
      color: (r.fields["Color"] as string | null) ?? null,
      owner: (r.fields["Owner"] as string | null) ?? null,
      is_priority: !!r.fields["Is Priority"],
      cadence: (r.fields["Cadence"] as string | null) ?? null,
      description: (r.fields["Description"] as string | null) ?? null,
      capacity: (r.fields["Capacity"] as number | null) ?? null,
      enrichment_opt_in: !!r.fields["Enrichment Opt-In"],
    }));
    await batchInsert("pods", rows, records.map((r) => r.id));
  }

  async function migrateCategories(records: AirtableRecord[]) {
    log("\n[2/14] Categories...");
    airtableCounts["categories"] = records.length;
    for (const r of records) {
      try {
        const linkedPods = r.fields["List"] as string[] | undefined;
        const podId = linkedPods?.[0] ? resolveId(linkedPods[0]) : undefined;
        if (!podId) { logErr("categories", r.id, `No pod mapping for linked List: ${linkedPods?.[0]}`); continue; }
        const { data, error } = await supabase.from("categories").insert({
          user_id: MIGRATION_USER_ID,
          name: (r.fields["Name"] as string) ?? "(unnamed)",
          color: (r.fields["Color"] as string | null) ?? null,
          pod_id: podId,
        }).select("id").single();
        if (error) { logErr("categories", r.id, error); continue; }
        if (data) await recordMapping(r.id, "categories", data.id);
      } catch (e) { logErr("categories", r.id, e); }
    }
  }

  async function migrateCompanies(contactRecords: AirtableRecord[]) {
    log("\n[3/14] Companies...");
    const companies = contactRecords.filter((r) => r.fields["Type"] === "Company");
    airtableCounts["companies"] = companies.length;
    const rows = companies.map((r) => ({
      user_id: MIGRATION_USER_ID,
      name: (r.fields["Name"] as string) ?? "(unnamed)",
      industry: (r.fields["Industry"] as string | null) ?? null,
      stage: (r.fields["Stage"] as string | null) ?? null,
      ticker: (r.fields["Ticker"] as string | null) ?? null,
      domain: (r.fields["Domain"] as string | null) ?? null,
      website: (r.fields["Website"] as string | null) ?? null,
      location: (r.fields["Location"] as string | null) ?? null,
      notes: (r.fields["Notes"] as string | null) ?? null,
      custom_fields: (r.fields["Custom Fields"] as Record<string, unknown> | null) ?? null,
    }));
    await batchInsert("companies", rows, companies.map((r) => r.id));
  }

  async function migrateContacts(contactRecords: AirtableRecord[]) {
    log("\n[4/14] Contacts...");
    airtableCounts["contacts"] = contactRecords.length;
    for (const r of contactRecords) {
      try {
        const companyLinked = r.fields["Company Record"] as string[] | undefined;
        const companyId = companyLinked?.[0] ? resolveId(companyLinked[0]) : undefined;
        const kvFund = r.fields["KV Fund Investor"];
        const spv = r.fields["SPV Investor"];
        const { data, error } = await supabase.from("contacts").insert({
          user_id: MIGRATION_USER_ID,
          name: (r.fields["Name"] as string) ?? "(unnamed)",
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
        if (error) { logErr("contacts", r.id, error); continue; }
        if (data) await recordMapping(r.id, "contacts", data.id);
      } catch (e) { logErr("contacts", r.id, e); }
    }
  }

  async function migrateContactPods(contactRecords: AirtableRecord[]) {
    log("\n[5/14] contact_pods junction...");
    const rows: Record<string, unknown>[] = [];
    for (const r of contactRecords) {
      const contactId = resolveId(r.id);
      if (!contactId) continue;
      const linkedLists = r.fields["Lists"] as string[] | undefined;
      if (!linkedLists?.length) continue;
      const primaryListId = r.fields["Primary List ID"] as string | undefined;
      for (const listAirId of linkedLists) {
        const podId = resolveId(listAirId);
        if (!podId) continue;
        rows.push({
          user_id: MIGRATION_USER_ID,
          contact_id: contactId,
          pod_id: podId,
          is_primary: primaryListId ? listAirId === primaryListId : linkedLists.indexOf(listAirId) === 0,
        });
      }
    }
    airtableCounts["contact_pods"] = rows.length;
    await batchInsert("contact_pods", rows);
  }

  async function migrateContactCategories(contactRecords: AirtableRecord[]) {
    log("\n[6/14] contact_categories junction...");
    const rows: Record<string, unknown>[] = [];
    for (const r of contactRecords) {
      const contactId = resolveId(r.id);
      if (!contactId) continue;
      const linkedCats = r.fields["Categories"] as string[] | undefined;
      if (!linkedCats?.length) continue;
      for (const catAirId of linkedCats) {
        const categoryId = resolveId(catAirId);
        if (!categoryId) continue;
        rows.push({ user_id: MIGRATION_USER_ID, contact_id: contactId, category_id: categoryId });
      }
    }
    airtableCounts["contact_categories"] = rows.length;
    await batchInsert("contact_categories", rows);
  }

  async function migrateInteractions(records: AirtableRecord[]) {
    log("\n[7/14] Interactions...");
    airtableCounts["interactions"] = records.length;
    for (const r of records) {
      try {
        const linkedContact = r.fields["Contact"] as string[] | undefined;
        const contactId = linkedContact?.[0] ? resolveId(linkedContact[0]) : undefined;
        if (!contactId) { logErr("interactions", r.id, `No contact mapping for ${linkedContact?.[0]}`); continue; }
        const dateVal = (r.fields["Date"] as string | null) ?? r.createdTime.split("T")[0];
        const rawType = ((r.fields["Type"] as string | null) ?? "note").toLowerCase();
        const { data, error } = await supabase.from("interactions").insert({
          user_id: MIGRATION_USER_ID,
          contact_id: contactId,
          type: rawType,
          date: dateVal,
          notes: (r.fields["Notes"] as string | null) ?? null,
          summary: (r.fields["Summary"] as string | null) ?? null,
          source: (r.fields["Source"] as string | null) ?? null,
          email_link: (r.fields["Email Link"] as string | null) ?? null,
          granola_link: (r.fields["Granola Link"] as string | null) ?? null,
          event_detail: (r.fields["Event Detail"] as string | null) ?? null,
          actor: (r.fields["Actor"] as string | null) ?? null,
        }).select("id").single();
        if (error) { logErr("interactions", r.id, error); continue; }
        if (data) await recordMapping(r.id, "interactions", data.id);
      } catch (e) { logErr("interactions", r.id, e); }
    }
  }

  async function migratePipelines(records: AirtableRecord[]) {
    log("\n[8/14] Pipelines...");
    airtableCounts["pipelines"] = records.length;
    for (const r of records) {
      try {
        const { data, error } = await supabase.from("pipelines").insert({
          user_id: MIGRATION_USER_ID,
          name: (r.fields["Name"] as string) ?? "(unnamed)",
          status: ((r.fields["Status"] as string | null) ?? "active").toLowerCase(),
        }).select("id").single();
        if (error) { logErr("pipelines", r.id, error); continue; }
        if (data) await recordMapping(r.id, "pipelines", data.id);
      } catch (e) { logErr("pipelines", r.id, e); }
    }
  }

  async function migratePipelineStages(records: AirtableRecord[]) {
    log("\n[9/14] Pipeline stages...");
    airtableCounts["pipeline_stages"] = records.length;
    for (const r of records) {
      try {
        const linkedPipeline = r.fields["Pipeline"] as string[] | undefined;
        const pipelineId = linkedPipeline?.[0] ? resolveId(linkedPipeline[0]) : undefined;
        if (!pipelineId) { logErr("pipeline_stages", r.id, `No pipeline mapping for ${linkedPipeline?.[0]}`); continue; }
        const { data, error } = await supabase.from("pipeline_stages").insert({
          user_id: MIGRATION_USER_ID,
          name: (r.fields["Name"] as string) ?? "(unnamed)",
          pipeline_id: pipelineId,
          color: (r.fields["Color"] as string | null) ?? null,
          order: (r.fields["Order"] as number | null) ?? 0,
        }).select("id").single();
        if (error) { logErr("pipeline_stages", r.id, error); continue; }
        if (data) await recordMapping(r.id, "pipeline_stages", data.id);
      } catch (e) { logErr("pipeline_stages", r.id, e); }
    }
  }

  async function migrateOpportunities(records: AirtableRecord[]) {
    log("\n[10/14] Opportunities...");
    airtableCounts["opportunities"] = records.length;
    for (const r of records) {
      try {
        const linkedStage = r.fields["Stage"] as string[] | undefined;
        const stageId = linkedStage?.[0] ? resolveId(linkedStage[0]) : undefined;
        const { data, error } = await supabase.from("opportunities").insert({
          user_id: MIGRATION_USER_ID,
          name: (r.fields["Name"] as string) ?? "(unnamed)",
          stage_id: stageId ?? null,
          notes: (r.fields["Notes"] as string | null) ?? null,
          priority: (r.fields["Priority"] as string | null) ?? null,
          status: ((r.fields["Status"] as string | null) ?? "open").toLowerCase(),
        }).select("id").single();
        if (error) { logErr("opportunities", r.id, error); continue; }
        if (data) await recordMapping(r.id, "opportunities", data.id);
      } catch (e) { logErr("opportunities", r.id, e); }
    }
  }

  async function migrateOpportunityContacts(opportunityRecords: AirtableRecord[]) {
    log("\n[11/14] opportunity_contacts junction...");
    const rows: Record<string, unknown>[] = [];
    for (const r of opportunityRecords) {
      const oppId = resolveId(r.id);
      if (!oppId) continue;
      const linked = r.fields["Relationships"] as string[] | undefined;
      for (const airContactId of linked ?? []) {
        const contactId = resolveId(airContactId);
        if (contactId) rows.push({ user_id: MIGRATION_USER_ID, opportunity_id: oppId, contact_id: contactId });
      }
    }
    airtableCounts["opportunity_contacts"] = rows.length;
    await batchInsert("opportunity_contacts", rows);
  }

  async function migrateCampaigns(records: AirtableRecord[]) {
    log("\n[12/14] Campaigns...");
    airtableCounts["campaigns"] = records.length;
    for (const r of records) {
      try {
        const { data, error } = await supabase.from("campaigns").insert({
          user_id: MIGRATION_USER_ID,
          name: (r.fields["Name"] as string) ?? "(unnamed)",
          type: ((r.fields["Type"] as string | null) ?? "other").toLowerCase(),
          deadline: (r.fields["Deadline"] as string | null) ?? null,
          status: ((r.fields["Status"] as string | null) ?? "active").toLowerCase(),
        }).select("id").single();
        if (error) { logErr("campaigns", r.id, error); continue; }
        if (data) await recordMapping(r.id, "campaigns", data.id);
      } catch (e) { logErr("campaigns", r.id, e); }
    }
  }

  async function migrateCampaignContacts(records: AirtableRecord[]) {
    log("\n[13/14] campaign_contacts...");
    airtableCounts["campaign_contacts"] = records.length;
    for (const r of records) {
      try {
        const linkedCampaign = r.fields["Campaign"] as string[] | undefined;
        const campaignId = linkedCampaign?.[0] ? resolveId(linkedCampaign[0]) : undefined;
        const linkedContact = r.fields["Contact"] as string[] | undefined;
        const contactId = linkedContact?.[0] ? resolveId(linkedContact[0]) : undefined;
        if (!campaignId || !contactId) {
          logErr("campaign_contacts", r.id, `Missing campaign (${linkedCampaign?.[0]}) or contact (${linkedContact?.[0]}) mapping`);
          continue;
        }
        const { data, error } = await supabase.from("campaign_contacts").insert({
          user_id: MIGRATION_USER_ID,
          campaign_id: campaignId,
          contact_id: contactId,
          status: ((r.fields["Status"] as string | null) ?? "pending").toLowerCase(),
          notes: (r.fields["Notes"] as string | null) ?? null,
        }).select("id").single();
        if (error) { logErr("campaign_contacts", r.id, error); continue; }
        if (data) await recordMapping(r.id, "campaign_contacts", data.id);
      } catch (e) { logErr("campaign_contacts", r.id, e); }
    }
  }

  async function migrateProjects(records: AirtableRecord[]) {
    log("\n[14/14] Projects + junctions...");
    airtableCounts["projects"] = records.length;
    airtableCounts["project_contacts"] = 0;
    airtableCounts["project_opportunities"] = 0;
    for (const r of records) {
      try {
        const { data, error } = await supabase.from("projects").insert({
          user_id: MIGRATION_USER_ID,
          name: (r.fields["Name"] as string) ?? "(unnamed)",
          description: (r.fields["Description"] as string | null) ?? null,
          owner: (r.fields["Owner"] as string | null) ?? null,
          notes: (r.fields["Notes"] as string | null) ?? null,
        }).select("id").single();
        if (error) { logErr("projects", r.id, error); continue; }
        await recordMapping(r.id, "projects", data.id);
        const projectId = data.id;

        const linkedContacts = r.fields["Relationships"] as string[] | undefined;
        if (linkedContacts?.length) {
          const pcRows = linkedContacts
            .map((airId) => resolveId(airId))
            .filter((id): id is string => !!id)
            .map((contactId) => ({ user_id: MIGRATION_USER_ID, project_id: projectId, contact_id: contactId }));
          if (pcRows.length) {
            const { error: pcErr } = await supabase.from("project_contacts").insert(pcRows);
            if (pcErr) log(`  [warn] project_contacts for project ${r.id}: ${pcErr.message}`);
            else airtableCounts["project_contacts"] += pcRows.length;
          }
        }

        const linkedOpps = r.fields["Opportunities"] as string[] | undefined;
        if (linkedOpps?.length) {
          const poRows = linkedOpps
            .map((airId) => resolveId(airId))
            .filter((id): id is string => !!id)
            .map((oppId) => ({ user_id: MIGRATION_USER_ID, project_id: projectId, opportunity_id: oppId }));
          if (poRows.length) {
            const { error: poErr } = await supabase.from("project_opportunities").insert(poRows);
            if (poErr) log(`  [warn] project_opportunities for project ${r.id}: ${poErr.message}`);
            else airtableCounts["project_opportunities"] += poRows.length;
          }
        }
      } catch (e) { logErr("projects", r.id, e); }
    }
  }

  async function migrateFieldConfig(records: AirtableRecord[]) {
    log("\n[+] field_config...");
    airtableCounts["field_config"] = records.length;
    for (const r of records) {
      try {
        const linkedPod = r.fields["Scope Pod"] as string[] | undefined;
        const scopePodId = linkedPod?.[0] ? resolveId(linkedPod[0]) : undefined;
        const { data, error } = await supabase.from("field_config").insert({
          user_id: MIGRATION_USER_ID,
          name: (r.fields["Name"] as string) ?? "(unnamed)",
          airtable_field_id: (r.fields["Airtable Field ID"] as string | null) ?? null,
          field_type: (r.fields["Field Type"] as string) ?? "text",
          scope_type: (r.fields["Scope Type"] as string) ?? "global",
          scope_pod_id: scopePodId ?? null,
          required: !!r.fields["Required"],
          display_order: (r.fields["Display Order"] as number | null) ?? 0,
        }).select("id").single();
        if (error) { logErr("field_config", r.id, error); continue; }
        if (data) await recordMapping(r.id, "field_config", data.id);
      } catch (e) { logErr("field_config", r.id, e); }
    }
  }

  // Main migration
  try {
    log("RealDeal: Airtable -> Supabase migration");
    log(`User ID: ${MIGRATION_USER_ID}`);
    log("");
    log("Fetching all Airtable tables in parallel...");

    const [
      listRecords, categoryRecords, contactRecords, interactionRecords,
      campaignRecords, campaignContactRecords, pipelineRecords, stageRecords,
      opportunityRecords, projectRecords, fieldConfigRecords,
    ] = await Promise.all([
      fetchAirtableTable("Lists"),
      fetchAirtableTable("Categories"),
      fetchAirtableTable("Contacts"),
      fetchAirtableTable("Interactions"),
      fetchAirtableTable("Campaigns"),
      fetchAirtableTable("CampaignContacts").catch(() => { log("  CampaignContacts table not found -- skipping"); return [] as AirtableRecord[]; }),
      fetchAirtableTable("Pipelines").catch(() => { log("  Pipelines table not found -- skipping"); return [] as AirtableRecord[]; }),
      fetchAirtableTable("Pipeline Stages").catch(() => { log("  Pipeline Stages table not found -- skipping"); return [] as AirtableRecord[]; }),
      fetchAirtableTable("Opportunities").catch(() => { log("  Opportunities table not found -- skipping"); return [] as AirtableRecord[]; }),
      fetchAirtableTable("Projects").catch(() => { log("  Projects table not found -- skipping"); return [] as AirtableRecord[]; }),
      fetchAirtableTable("Field Config").catch(() => { log("  Field Config table not found -- skipping"); return [] as AirtableRecord[]; }),
    ]);

    await migratePods(listRecords);
    await migrateCategories(categoryRecords);
    await migrateCompanies(contactRecords);
    await migrateContacts(contactRecords);
    await migrateContactPods(contactRecords);
    await migrateContactCategories(contactRecords);
    await migrateInteractions(interactionRecords);
    await migratePipelines(pipelineRecords);
    await migratePipelineStages(stageRecords);
    await migrateOpportunities(opportunityRecords);
    await migrateOpportunityContacts(opportunityRecords);
    await migrateCampaigns(campaignRecords);
    await migrateCampaignContacts(campaignContactRecords);
    await migrateProjects(projectRecords);
    if (fieldConfigRecords.length) await migrateFieldConfig(fieldConfigRecords);

    // Validation
    log("\n-- Validation --");
    const tables = [
      "pods", "categories", "companies", "contacts",
      "contact_pods", "contact_categories", "interactions",
      "pipelines", "pipeline_stages", "opportunities", "opportunity_contacts",
      "campaigns", "campaign_contacts", "projects", "project_contacts",
      "project_opportunities", "field_config",
    ];
    for (const table of tables) {
      const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
      const supabaseCount = error ? "ERROR" : (count ?? 0);
      const airtableCount = airtableCounts[table] ?? "n/a";
      const match = supabaseCount === airtableCount ? "OK" : "MISMATCH";
      log(`  ${table.padEnd(28)} airtable=${String(airtableCount).padStart(5)}  supabase=${String(supabaseCount).padStart(5)}  [${match}]`);
    }

    log(`\n_migration_id_map: ${idMap.size} entries written.`);

    if (migrationErrors.length) {
      log(`\n${migrationErrors.length} error(s):`);
      for (const e of migrationErrors) log(`  [${e.table}] ${e.airtableId}: ${e.message}`);
    } else {
      log("\nMigration completed with no errors.");
    }

    return new Response(JSON.stringify({ success: true, logs, errors: migrationErrors, idMapSize: idMap.size }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log(`Fatal error: ${msg}`);
    return new Response(JSON.stringify({ success: false, error: msg, logs }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
