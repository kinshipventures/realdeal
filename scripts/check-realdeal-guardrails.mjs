#!/usr/bin/env node
import { execFileSync } from 'node:child_process'

const args = process.argv.slice(2)

function valueFor(name) {
  const exact = args.find(arg => arg.startsWith(`${name}=`))
  if (exact) return exact.slice(name.length + 1)
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : ''
}

function hasFlag(name) {
  return args.includes(name)
}

function gitLines(gitArgs) {
  const output = execFileSync('git', gitArgs, { encoding: 'utf8' }).trim()
  return output ? output.split(/\r?\n/).map(line => line.trim()).filter(Boolean) : []
}

function normalizePath(path) {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

const scope = valueFor('--scope')
  .split(',')
  .map(item => normalizePath(item.trim()))
  .filter(Boolean)

if (scope.length === 0) {
  console.error('Guardrail failed: define an explicit --scope file list before editing or committing.')
  process.exit(1)
}

const stagedOnly = hasFlag('--staged-only')
const allowLocked = hasFlag('--allow-locked')
const approval = valueFor('--approval').trim()

const changed = new Set()

if (stagedOnly) {
  for (const file of gitLines(['diff', '--cached', '--name-only'])) changed.add(normalizePath(file))
} else {
  for (const file of gitLines(['diff', '--name-only'])) changed.add(normalizePath(file))
  for (const file of gitLines(['diff', '--cached', '--name-only'])) changed.add(normalizePath(file))
  for (const file of gitLines(['ls-files', '--others', '--exclude-standard'])) changed.add(normalizePath(file))
}

const changedFiles = [...changed].sort()

if (changedFiles.length === 0) {
  console.log('Guardrail passed: no changed files detected.')
  process.exit(0)
}

const outsideScope = changedFiles.filter(file => !scope.includes(file))

const lockedPatterns = [
  /^src\/contexts\/AuthContext\.tsx$/,
  /^src\/contexts\/WorkspaceContext\.tsx$/,
  /^src\/components\/auth\//,
  /^src\/components\/campaigns\//,
  /^src\/components\/dashboard\//,
  /^src\/components\/import\//,
  /^src\/components\/pods\//,
  /^src\/components\/subpods\//,
  /^src\/lib\/birthdays\.ts$/,
  /^src\/lib\/campaign/,
  /^src\/lib\/csvImport/,
  /^src\/lib\/equity\.ts$/,
  /^src\/lib\/importTemplate/,
  /^src\/lib\/supabase-data\.ts$/,
  /^supabase\//,
]

const lockedChanges = changedFiles.filter(file => lockedPatterns.some(pattern => pattern.test(file)))

if (outsideScope.length > 0) {
  console.error('Guardrail failed: files outside approved scope were changed:')
  for (const file of outsideScope) console.error(`- ${file}`)
  process.exit(1)
}

if (lockedChanges.length > 0 && (!allowLocked || !approval)) {
  console.error('Guardrail failed: locked behavior files are in scope without explicit approval.')
  console.error('Re-run only if the user explicitly approved this locked behavior change:')
  console.error('node scripts/check-realdeal-guardrails.mjs --scope <files> --allow-locked --approval "<user approval summary>"')
  for (const file of lockedChanges) console.error(`- ${file}`)
  process.exit(1)
}

console.log('Guardrail passed.')
console.log(`Checked files: ${changedFiles.length}`)
for (const file of changedFiles) console.log(`- ${file}`)
