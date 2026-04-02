const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { name, email, company } = await req.json()

    // Deterministic stub -- real provider replaces this block
    const lastName = name?.split(' ').slice(1).join(' ') ?? 'Smith'
    const stub: Record<string, string | null> = {
      company: company ?? `${lastName} Ventures`,
      role: 'Managing Partner',
      linkedin: `https://linkedin.com/in/${(name ?? 'contact').toLowerCase().replace(/\s+/g, '-')}`,
      website: `https://${(company ?? `${lastName.toLowerCase()}ventures`).replace(/\s+/g, '')}.com`,
      location: 'Los Angeles, CA',
      specialization: 'Strategy & Operations',
    }

    return new Response(JSON.stringify({ ok: true, data: stub }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
