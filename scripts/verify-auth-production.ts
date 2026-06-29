import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const EXPECTED_SUPABASE_REF = process.env.EXPECTED_SUPABASE_REF ?? 'zsecxtxpwmvgggqksdfb'
const PRODUCTION_URL = (process.env.REALDEAL_PRODUCTION_URL ?? 'https://realdeal-crm-app.vercel.app').replace(/\/$/, '')

const root = process.cwd()
let failures = 0

function pass(message: string) {
  console.log(`PASS ${message}`)
}

function fail(message: string) {
  failures += 1
  console.error(`FAIL ${message}`)
}

function warn(message: string) {
  console.warn(`WARN ${message}`)
}

function readText(relativePath: string) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

function assertIncludes(text: string, expected: string, label: string) {
  if (text.includes(expected)) pass(label)
  else fail(`${label} missing ${expected}`)
}

function getEnvValue(envText: string, key: string) {
  const line = envText.split(/\r?\n/).find(item => item.startsWith(`${key}=`))
  if (!line) return null
  return line.slice(key.length + 1).trim().replace(/^"|"$/g, '')
}

function collectSupabaseRefs(text: string) {
  return [...new Set([...text.matchAll(/https:\/\/([a-z0-9]+)\.supabase\.co/g)].map(match => match[1]))]
}

function collectProjectRefs(text: string) {
  const refs = [
    ...[...text.matchAll(/project_id\s*=\s*"([a-z0-9]+)"/g)].map(match => match[1]),
    ...[...text.matchAll(/VITE_SUPABASE_PROJECT_ID="?([a-z0-9]+)"?/g)].map(match => match[1]),
    ...[...text.matchAll(/Supabase (?:production )?project:\s*([a-z0-9]+)/g)].map(match => match[1]),
  ]
  return [...new Set(refs)]
}

function assertOnlyCanonicalRefs(text: string, label: string) {
  const refs = [...new Set([...collectSupabaseRefs(text), ...collectProjectRefs(text)])]
  const unexpected = refs.filter(ref => ref !== EXPECTED_SUPABASE_REF)
  if (unexpected.length === 0) pass(`${label} uses only canonical Supabase ref`)
  else fail(`${label} contains non-canonical Supabase refs: ${unexpected.join(', ')}`)
}

async function fetchText(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
  return response.text()
}

async function fetchJson(url: string, headers: Record<string, string>) {
  const response = await fetch(url, { headers })
  const text = await response.text()
  const data = text ? JSON.parse(text) as Record<string, unknown> : {}
  return { response, data }
}

async function checkSupabaseAuthSettings() {
  const envText = readText('.env')
  const supabaseUrl = getEnvValue(envText, 'VITE_SUPABASE_URL')?.replace(/\/$/, '')
  const publishableKey = getEnvValue(envText, 'VITE_SUPABASE_PUBLISHABLE_KEY')

  if (!supabaseUrl || !publishableKey) {
    fail('Supabase public auth settings check is missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
    return
  }

  const { response, data } = await fetchJson(`${supabaseUrl}/auth/v1/settings`, {
    apikey: publishableKey,
    authorization: `Bearer ${publishableKey}`,
  })

  if (!response.ok) {
    fail(`Supabase auth settings returned HTTP ${response.status}`)
    return
  }

  pass('Supabase auth settings endpoint loads')
  if (data.disable_signup === false) pass('Supabase Auth signup is enabled')
  else fail('Supabase Auth signup must not be disabled')

  const external = data.external && typeof data.external === 'object'
    ? data.external as Record<string, unknown>
    : {}
  if (external.google === true || data.external_google_enabled === true) pass('Google OAuth is enabled')
  else fail('Google OAuth must be enabled')
}

async function checkProductionBundle() {
  const home = await fetchText(PRODUCTION_URL)
  pass(`production app loads from ${PRODUCTION_URL}`)

  const login = await fetchText(`${PRODUCTION_URL}/login`)
  pass('login route loads')

  const assets = [...new Set([...home.matchAll(/assets\/[^"']+\.js/g), ...login.matchAll(/assets\/[^"']+\.js/g)].map(match => match[0]))]
  if (assets.length === 0) {
    fail('production bundle JS asset was not found')
    return
  }

  const bundleText = (await Promise.all(assets.map(asset => fetchText(`${PRODUCTION_URL}/${asset}`)))).join('\n')
  const refs = collectSupabaseRefs(bundleText)
  if (refs.length === 1 && refs[0] === EXPECTED_SUPABASE_REF) pass(`production bundle uses ${EXPECTED_SUPABASE_REF}`)
  else fail(`production bundle Supabase refs are ${refs.join(', ') || 'none'}`)
  assertOnlyCanonicalRefs(bundleText, 'production bundle')
}

function checkLocalSupabaseConfig() {
  const envText = readText('.env')
  assertIncludes(envText, `https://${EXPECTED_SUPABASE_REF}.supabase.co`, '.env Supabase URL')
  assertIncludes(envText, `VITE_SUPABASE_PROJECT_ID="${EXPECTED_SUPABASE_REF}"`, '.env project id')
  const bridgeFlag = getEnvValue(envText, 'VITE_USE_LOVABLE_AUTH_BRIDGE')
  if (bridgeFlag === 'false') pass('.env disables Lovable auth bridge')
  else fail('.env must set VITE_USE_LOVABLE_AUTH_BRIDGE="false"')
  assertOnlyCanonicalRefs(envText, '.env')

  const configText = readText('supabase/config.toml')
  assertIncludes(configText, `project_id = "${EXPECTED_SUPABASE_REF}"`, 'Supabase config project id')
  assertOnlyCanonicalRefs(configText, 'supabase/config.toml')

  const projectRefPath = 'supabase/.temp/project-ref'
  if (existsSync(resolve(root, projectRefPath))) {
    const projectRef = readText(projectRefPath).trim()
    if (projectRef === EXPECTED_SUPABASE_REF) pass('Supabase local project-ref is canonical')
    else fail(`Supabase local project-ref is ${projectRef}`)
  } else {
    warn('Supabase local project-ref is missing')
  }

  const linkedProjectPath = 'supabase/.temp/linked-project.json'
  if (existsSync(resolve(root, linkedProjectPath))) {
    const linked = JSON.parse(readText(linkedProjectPath)) as { ref?: string }
    if (linked.ref === EXPECTED_SUPABASE_REF) pass('Supabase linked project is canonical')
    else fail(`Supabase linked project is ${linked.ref ?? 'missing'}`)
  } else {
    warn('Supabase linked-project.json is missing')
  }
}

function checkAuthSource() {
  const clientText = readText('src/integrations/supabase/client.ts')
  assertIncludes(clientText, 'VITE_SUPABASE_URL', 'Supabase client reads VITE_SUPABASE_URL')
  assertIncludes(clientText, 'VITE_SUPABASE_PUBLISHABLE_KEY', 'Supabase client reads VITE_SUPABASE_PUBLISHABLE_KEY')
  assertOnlyCanonicalRefs(clientText, 'Supabase client')

  const loginText = readText('src/components/auth/LoginPage.tsx')
  assertIncludes(loginText, 'signInWithPassword', 'email/password login path exists')
  assertIncludes(loginText, 'signUp', 'signup path exists')

  const authText = readText('src/lib/auth.ts')
  assertIncludes(authText, "VITE_USE_LOVABLE_AUTH_BRIDGE !== 'false'", 'auth bridge flag is explicit')
  assertIncludes(authText, 'signInWithOAuth', 'Google OAuth path exists')

  const workspaceText = readText('src/contexts/WorkspaceContext.tsx')
  assertIncludes(workspaceText, 'bootstrapWorkspaceForUser', 'workspace bootstrap is available')
  assertIncludes(workspaceText, 'workspace_members', 'workspace membership is available')
  assertIncludes(workspaceText, 'ensureWorkspaceBaseline', 'default workspace baseline is available')
}

function listFiles(dir: string): string[] {
  const entries = readdirSync(dir)
  const files: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry)
    const relative = full.slice(root.length + 1).replace(/\\/g, '/')
    if (
      relative.startsWith('.git/') ||
      relative.startsWith('node_modules/') ||
      relative.startsWith('dist/') ||
      relative.startsWith('.vercel/') ||
      relative === 'scripts/verify-auth-production.ts'
    ) {
      continue
    }
    const stat = statSync(full)
    if (stat.isDirectory()) files.push(...listFiles(full))
    else files.push(full)
  }
  return files
}

function checkRepositorySupabaseRefs() {
  const extensions = new Set([
    '.env',
    '.json',
    '.md',
    '.toml',
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
    '.sql',
  ])
  const offenders: string[] = []

  for (const file of listFiles(root)) {
    const relative = file.slice(root.length + 1).replace(/\\/g, '/')
    const extension = relative.includes('.') ? relative.slice(relative.lastIndexOf('.')) : ''
    if (!extensions.has(extension) && !relative.endsWith('.env')) continue

    const text = readFileSync(file, 'utf8')
    const refs = new Set([...collectSupabaseRefs(text), ...collectProjectRefs(text)])
    const unexpected = [...refs].filter(ref => ref !== EXPECTED_SUPABASE_REF)
    if (unexpected.length > 0) offenders.push(`${relative}: ${unexpected.join(', ')}`)
  }

  if (offenders.length === 0) pass('repository contains only canonical Supabase refs')
  else fail(`non-canonical Supabase refs found: ${offenders.join('; ')}`)
}

function checkNoAuthUserDeletion() {
  const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.sql'])
  const banned = [
    /auth\.admin\.deleteUser/i,
    /deleteUser\s*\(/i,
    /\.from\(["']auth\.users["']\)\.delete/i,
    /delete\s+from\s+auth\.users/i,
  ]

  const offenders: string[] = []
  for (const file of listFiles(root)) {
    if (![...extensions].some(ext => file.endsWith(ext))) continue
    const text = readFileSync(file, 'utf8')
    if (banned.some(pattern => pattern.test(text))) offenders.push(file.slice(root.length + 1).replace(/\\/g, '/'))
  }

  if (offenders.length === 0) pass('no app path deletes Supabase Auth users')
  else fail(`Supabase Auth user deletion patterns found in: ${offenders.join(', ')}`)
}

async function main() {
  checkLocalSupabaseConfig()
  checkAuthSource()
  checkRepositorySupabaseRefs()
  checkNoAuthUserDeletion()
  await checkSupabaseAuthSettings()
  await checkProductionBundle()

  if (failures > 0) {
    console.error(`Auth production verification failed with ${failures} issue(s).`)
    process.exit(1)
  }

  console.log('Auth production verification passed.')
}

main().catch(error => {
  fail(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
