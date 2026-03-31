const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const AIRTABLE_BASE_ID = Deno.env.get('VITE_AIRTABLE_BASE_ID')!
const AIRTABLE_TOKEN = Deno.env.get('VITE_AIRTABLE_TOKEN')!
const BASE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { path, method, body } = await req.json()

    if (!path || typeof path !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing path' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = path.startsWith('http') ? path : `${BASE_URL}/${path}`

    const fetchOptions: RequestInit = {
      method: method || 'GET',
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }

    if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE')) {
      fetchOptions.body = JSON.stringify(body)
    }

    const res = await fetch(url, fetchOptions)
    const text = await res.text()

    return new Response(text, {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
