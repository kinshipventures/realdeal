// Bump this version when the default layout changes to invalidate saved positions
const KEY = 'realdeal:node-positions:v3'

type Positions = Record<string, { x: number; y: number }>

function getPositions(): Positions {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

const EXCLUDED_IDS = new Set(['__create-category__'])

function savePosition(id: string, x: number, y: number) {
  if (EXCLUDED_IDS.has(id)) return
  const all = getPositions()
  all[id] = { x, y }
  localStorage.setItem(KEY, JSON.stringify(all))
}

function clearPositionsForIds(ids: string[]) {
  const all = getPositions()
  for (const id of ids) delete all[id]
  localStorage.setItem(KEY, JSON.stringify(all))
}

export function clearAllPositions() {
  localStorage.removeItem(KEY)
}
