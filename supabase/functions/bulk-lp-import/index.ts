import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CAMPAIGN_ID = 'f396bde7-9547-4c47-a019-84ca153f23ec';
const USER_ID = '9582e3a4-14d6-48b5-80ce-4f365b7f266a';
const WORKSPACE_ID = '2bb6de19-059d-4a94-8cda-4935840818bc';

const STAGE_MAP: Record<string, string> = {
  'for connecting': '997e6323-53d3-4cd4-8b17-ad3b8382d18d',
  'waiting for response': 'ec4f76c9-29b5-487f-92cd-5e447eed4cf5',
  'circle back': 'cb1b2d73-7661-4c27-8459-c080ddd2aa59',
  'intro call': 'c435a07d-c8c7-4dbd-ba96-75a73068588e',
  'in data room & pitch': '9bf16f61-38ce-4d08-86f5-4da93db66441',
  'in diligence': '0f338c25-dca6-4b1d-bde6-8af053fe807c',
  'closed/won': '7ebd88f3-0430-42db-a132-fda2bcd7bf4d',
  'not a fit': '7b9d9d36-32ff-42ac-ae33-487723dfa60d',
  'passed (fund 2)': 'afd86b70-55ce-4706-bcb9-67bbe063254b',
  'new': '997e6323-53d3-4cd4-8b17-ad3b8382d18d',
};

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { contacts } = await req.json();
    
    const { data: existing } = await supabase
      .from('contacts').select('id, name, email, company, role, linkedin, location, country, global_region, gender, first_name, last_name, phone, recommended_by')
      .eq('workspace_id', WORKSPACE_ID);
    
    const nameMap = new Map<string, any>();
    for (const c of existing || []) {
      nameMap.set(c.name.trim().toLowerCase(), c);
    }

    const { data: existingCC } = await supabase
      .from('campaign_contacts').select('contact_id').eq('campaign_id', CAMPAIGN_ID);
    const ccSet = new Set((existingCC || []).map((c: any) => c.contact_id));

    let created = 0, updated = 0, linked = 0;
    const errors: string[] = [];

    for (const c of contacts) {
      const key = c.name.trim().toLowerCase();
      const ex = nameMap.get(key);

      if (!ex) {
        const { data: newC, error } = await supabase.from('contacts').insert({
          name: c.name, first_name: c.first_name || null, last_name: c.last_name || null,
          email: c.email || null, phone: c.phone || null, company: c.company || null,
          role: c.role || null, linkedin: c.linkedin || null, location: c.location || null,
          country: c.country || null, global_region: c.global_region || null,
          gender: c.gender || null, recommended_by: c.recommended_by || null,
          custom_fields: c.custom_fields || {}, user_id: USER_ID, workspace_id: WORKSPACE_ID,
          type: 'Contact', status: 'Active', import_source: 'clickup-lp-internal', needs_review: false,
        }).select('id').single();
        
        if (error) { errors.push(`Create ${c.name}: ${error.message}`); continue; }
        const contactId = newC!.id;
        nameMap.set(key, { id: contactId, name: c.name });
        created++;

        if (!ccSet.has(contactId)) {
          const stageId = STAGE_MAP[c.status_key || 'for connecting'] || STAGE_MAP['for connecting'];
          await supabase.from('campaign_contacts').insert({
            campaign_id: CAMPAIGN_ID, contact_id: contactId, stage_id: stageId,
            user_id: USER_ID, workspace_id: WORKSPACE_ID,
            custom_fields: c.cc_custom || { lp_type: 'Internal' },
            notes: c.cc_notes || null, status: 'pending',
          });
          linked++;
          ccSet.add(contactId);
        }
      } else {
        // Update existing with COALESCE
        const updates: Record<string, any> = {};
        const fields = ['first_name','last_name','email','phone','company','role','linkedin','location','country','global_region','gender','recommended_by'];
        for (const f of fields) {
          if (c[f] && !ex[f]) updates[f] = c[f];
        }
        if (Object.keys(updates).length > 0) {
          await supabase.from('contacts').update(updates).eq('id', ex.id);
        }
        updated++;

        if (!ccSet.has(ex.id)) {
          const stageId = STAGE_MAP[c.status_key || 'for connecting'] || STAGE_MAP['for connecting'];
          await supabase.from('campaign_contacts').insert({
            campaign_id: CAMPAIGN_ID, contact_id: ex.id, stage_id: stageId,
            user_id: USER_ID, workspace_id: WORKSPACE_ID,
            custom_fields: c.cc_custom || { lp_type: 'Internal' },
            notes: c.cc_notes || null, status: 'pending',
          });
          linked++;
          ccSet.add(ex.id);
        }
      }
    }

    return new Response(JSON.stringify({ created, updated, linked, errors: errors.slice(0, 20), total: contacts.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
