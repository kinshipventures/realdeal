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

export function savePosition(id: string, x: number, y: number) {
  const all = getPositions()
  all[id] = { x, y }
  localStorage.setItem(KEY, JSON.stringify(all))
}
