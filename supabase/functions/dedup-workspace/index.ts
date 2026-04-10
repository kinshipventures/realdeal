import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify user
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(
    authHeader.replace("Bearer ", "")
  );
  if (claimsErr || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub as string;

  const { workspace_id } = await req.json();
  if (!workspace_id) {
    return new Response(JSON.stringify({ error: "workspace_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const log: string[] = [];
  const addLog = (msg: string) => {
    console.log(msg);
    log.push(msg);
  };

  try {
    // ============ PHASE 1: MERGE DUPLICATE PODS ============
    addLog("=== PHASE 1: Merge duplicate pods ===");

    const { data: allPods } = await supabase
      .from("pods")
      .select("*")
      .eq("workspace_id", workspace_id);

    if (!allPods) throw new Error("Failed to fetch pods");

    // Build case-insensitive groups
    const podGroups = new Map<string, typeof allPods>();
    for (const pod of allPods) {
      const key = pod.name.trim().toLowerCase();
      const group = podGroups.get(key) || [];
      group.push(pod);
      podGroups.set(key, group);
    }

    // Also handle typo: "services providers" -> "service providers"
    const typoKey = "services providers";
    const correctKey = "service providers";
    if (podGroups.has(typoKey) && podGroups.has(correctKey)) {
      const combined = [
        ...(podGroups.get(correctKey) || []),
        ...(podGroups.get(typoKey) || []),
      ];
      podGroups.set(correctKey, combined);
      podGroups.delete(typoKey);
    } else if (podGroups.has(typoKey) && !podGroups.has(correctKey)) {
      // Just rename it
      const typoPods = podGroups.get(typoKey)!;
      podGroups.set(correctKey, typoPods);
      podGroups.delete(typoKey);
      // Rename the pod
      for (const p of typoPods) {
        await supabase.from("pods").update({ name: "Service Providers" }).eq("id", p.id);
      }
      addLog(`Renamed "Services Providers" pod to "Service Providers"`);
    }

    for (const [key, group] of podGroups) {
      if (group.length < 2) continue;

      // Pick survivor: most contact_pods members
      const counts = await Promise.all(
        group.map(async (p) => {
          const { count } = await supabase
            .from("contact_pods")
            .select("*", { count: "exact", head: true })
            .eq("pod_id", p.id);
          return { pod: p, count: count || 0 };
        })
      );
      counts.sort((a, b) => b.count - a.count);
      const survivor = counts[0].pod;
      const losers = counts.slice(1).map((c) => c.pod);

      for (const loser of losers) {
        addLog(`Pod merge: "${loser.name}" (${loser.id}) -> "${survivor.name}" (${survivor.id})`);

        // Move contact_pods
        const { data: loserCPs } = await supabase
          .from("contact_pods")
          .select("*")
          .eq("pod_id", loser.id);

        for (const cp of loserCPs || []) {
          // Check if already exists
          const { data: existing } = await supabase
            .from("contact_pods")
            .select("id")
            .eq("pod_id", survivor.id)
            .eq("contact_id", cp.contact_id)
            .maybeSingle();

          if (!existing) {
            await supabase
              .from("contact_pods")
              .update({ pod_id: survivor.id })
              .eq("id", cp.id);
          } else {
            await supabase.from("contact_pods").delete().eq("id", cp.id);
          }
        }

        // Move categories
        const { data: loserCats } = await supabase
          .from("categories")
          .select("*")
          .eq("pod_id", loser.id);

        for (const cat of loserCats || []) {
          // Check if same-name category exists on survivor
          const { data: existingCat } = await supabase
            .from("categories")
            .select("id")
            .eq("pod_id", survivor.id)
            .ilike("name", cat.name)
            .maybeSingle();

          if (existingCat) {
            // Move contact_categories from this cat to the existing one
            const { data: catLinks } = await supabase
              .from("contact_categories")
              .select("*")
              .eq("category_id", cat.id);

            for (const cl of catLinks || []) {
              const { data: existingLink } = await supabase
                .from("contact_categories")
                .select("id")
                .eq("category_id", existingCat.id)
                .eq("contact_id", cl.contact_id)
                .maybeSingle();

              if (!existingLink) {
                await supabase
                  .from("contact_categories")
                  .update({ category_id: existingCat.id })
                  .eq("id", cl.id);
              } else {
                await supabase.from("contact_categories").delete().eq("id", cl.id);
              }
            }
            await supabase.from("categories").delete().eq("id", cat.id);
          } else {
            await supabase
              .from("categories")
              .update({ pod_id: survivor.id })
              .eq("id", cat.id);
          }
        }

        // Delete loser pod
        await supabase.from("pods").delete().eq("id", loser.id);
        addLog(`Deleted pod "${loser.name}" (${loser.id})`);
      }
    }

    // ============ PHASE 2: DEDUPLICATE CONTACTS ============
    addLog("=== PHASE 2: Deduplicate contacts ===");

    const { data: allContacts } = await supabase
      .from("contacts")
      .select("*")
      .eq("workspace_id", workspace_id)
      .order("created_at", { ascending: true });

    if (!allContacts) throw new Error("Failed to fetch contacts");

    addLog(`Total contacts before dedup: ${allContacts.length}`);

    const contactGroups = new Map<string, typeof allContacts>();
    for (const c of allContacts) {
      const key = c.name.trim().toLowerCase();
      const group = contactGroups.get(key) || [];
      group.push(c);
      contactGroups.set(key, group);
    }

    const CONTACT_MERGE_FIELDS = [
      "first_name", "last_name", "email", "email_2", "email_3",
      "phone", "company", "company_id", "role", "location", "website",
      "linkedin", "country", "global_region", "gender", "notes",
      "intel_notes", "recommended_by", "introduced_by", "specialization",
      "past_clients", "birthday", "milestones", "interests",
      "relationship_context", "relationship_owner", "contact_frequency",
      "cadence_override", "communication_preferences", "next_action",
      "next_follow_up_date", "last_contacted_at", "industry", "stage",
      "ticker", "domain",
    ] as const;

    const JUNCTION_TABLES = [
      { table: "contact_pods", fk: "contact_id", unique: ["pod_id", "contact_id"] },
      { table: "contact_categories", fk: "contact_id", unique: ["category_id", "contact_id"] },
      { table: "interactions", fk: "contact_id", unique: null },
      { table: "campaign_contacts", fk: "contact_id", unique: ["campaign_id", "contact_id"] },
      { table: "opportunity_contacts", fk: "contact_id", unique: ["opportunity_id", "contact_id"] },
      { table: "project_contacts", fk: "contact_id", unique: ["project_id", "contact_id"] },
    ];

    let mergedCount = 0;

    for (const [key, group] of contactGroups) {
      if (group.length < 2) continue;

      // Survivor = earliest created
      const survivor = group[0];
      const losers = group.slice(1);

      // Coalesce fields into survivor
      const updates: Record<string, unknown> = {};
      for (const field of CONTACT_MERGE_FIELDS) {
        if (survivor[field] == null || survivor[field] === "") {
          for (const loser of losers) {
            if (loser[field] != null && loser[field] !== "") {
              updates[field] = loser[field];
              break;
            }
          }
        }
      }

      // Merge custom_fields
      let mergedCustom = survivor.custom_fields || {};
      for (const loser of losers) {
        if (loser.custom_fields && typeof loser.custom_fields === "object") {
          for (const [k, v] of Object.entries(loser.custom_fields as Record<string, unknown>)) {
            if (!(k in (mergedCustom as Record<string, unknown>))) {
              (mergedCustom as Record<string, unknown>)[k] = v;
            }
          }
        }
      }
      if (Object.keys(mergedCustom as Record<string, unknown>).length > 0) {
        updates.custom_fields = mergedCustom;
      }

      // Pick latest last_contacted_at
      const dates = group
        .map((c) => c.last_contacted_at)
        .filter(Boolean)
        .sort()
        .reverse();
      if (dates.length > 0) {
        updates.last_contacted_at = dates[0];
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("contacts").update(updates).eq("id", survivor.id);
      }

      // Reassign junction records
      const loserIds = losers.map((l) => l.id);

      for (const jt of JUNCTION_TABLES) {
        const { data: junctionRows } = await supabase
          .from(jt.table)
          .select("*")
          .in(jt.fk, loserIds);

        if (!junctionRows || junctionRows.length === 0) continue;

        if (jt.unique) {
          // Has unique constraint - check before reassigning
          const otherFk = jt.unique.find((f) => f !== "contact_id")!;
          for (const row of junctionRows) {
            const { data: existing } = await supabase
              .from(jt.table)
              .select("id")
              .eq(jt.fk, survivor.id)
              .eq(otherFk, row[otherFk])
              .maybeSingle();

            if (!existing) {
              await supabase
                .from(jt.table)
                .update({ [jt.fk]: survivor.id })
                .eq("id", row.id);
            } else {
              await supabase.from(jt.table).delete().eq("id", row.id);
            }
          }
        } else {
          // No unique constraint (interactions) - just reassign all
          await supabase
            .from(jt.table)
            .update({ [jt.fk]: survivor.id })
            .in("id", junctionRows.map((r) => r.id));
        }
      }

      // Delete losers
      await supabase.from("contacts").delete().in("id", loserIds);
      mergedCount += loserIds.length;
    }

    addLog(`Contacts merged: ${mergedCount} duplicates removed`);

    // Count remaining
    const { count: remainingContacts } = await supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace_id);
    addLog(`Contacts remaining: ${remainingContacts}`);

    // ============ PHASE 3: DEDUPLICATE COMPANIES ============
    addLog("=== PHASE 3: Deduplicate companies ===");

    const { data: allCompanies } = await supabase
      .from("companies")
      .select("*")
      .eq("workspace_id", workspace_id)
      .order("created_at", { ascending: true });

    if (!allCompanies) throw new Error("Failed to fetch companies");

    addLog(`Total companies before dedup: ${allCompanies.length}`);

    const companyGroups = new Map<string, typeof allCompanies>();
    for (const c of allCompanies) {
      const key = c.name.trim().toLowerCase();
      const group = companyGroups.get(key) || [];
      group.push(c);
      companyGroups.set(key, group);
    }

    const COMPANY_MERGE_FIELDS = [
      "domain", "website", "industry", "location", "notes",
      "stage", "ticker",
    ] as const;

    let companyMergedCount = 0;

    for (const [key, group] of companyGroups) {
      if (group.length < 2) continue;

      const survivor = group[0];
      const losers = group.slice(1);
      const loserIds = losers.map((l) => l.id);

      // Coalesce fields
      const updates: Record<string, unknown> = {};
      for (const field of COMPANY_MERGE_FIELDS) {
        if (survivor[field] == null || survivor[field] === "") {
          for (const loser of losers) {
            if (loser[field] != null && loser[field] !== "") {
              updates[field] = loser[field];
              break;
            }
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("companies").update(updates).eq("id", survivor.id);
      }

      // Update contacts referencing loser companies
      await supabase
        .from("contacts")
        .update({ company_id: survivor.id })
        .in("company_id", loserIds);

      // Delete losers
      await supabase.from("companies").delete().in("id", loserIds);
      companyMergedCount += loserIds.length;

      addLog(`Company merge: "${key}" - removed ${loserIds.length} duplicates`);
    }

    addLog(`Companies merged: ${companyMergedCount} duplicates removed`);

    return new Response(
      JSON.stringify({ success: true, log }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    addLog(`ERROR: ${err.message}`);
    return new Response(
      JSON.stringify({ success: false, error: err.message, log }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
