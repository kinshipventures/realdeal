// Bump this version when the default layout changes to invalidate saved positions
const KEY = 'kinshipbrain:node-positions:v2'

type Positions = Record<string, { x: number; y: number }>

export function getPositions(): Positions {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

const EXCLUDED_IDS = new Set(['__create-category__'])

export function savePosition(id: string, x: number, y: number) {
  if (EXCLUDED_IDS.has(id)) return
  const all = getPositions()
  all[id] = { x, y }
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function clearPositionsForIds(ids: string[]) {
  const all = getPositions()
  for (const id of ids) delete all[id]
  localStorage.setItem(KEY, JSON.stringify(all))
}
