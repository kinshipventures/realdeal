import { useEffect } from 'react'

// Module-level escape key stack — same pattern used by Radix UI and Mantine.
// Why not stopPropagation: both ContactPanel and ContactDetail register on window.
// stopPropagation stops DOM bubbling but has NO effect on sibling window listeners.
// This stack ensures only the topmost (most recently mounted) handler fires.

const stack: Array<() => void> = []

export function pushEscape(fn: () => void) {
  stack.push(fn)
}

export function popEscape(fn: () => void) {
  const i = stack.lastIndexOf(fn)
  if (i !== -1) stack.splice(i, 1)
}

// Single global listener — registered once when the module loads.
// Priority chain: field-level Escape (DOM bubbling, stopPropagation) fires first,
// then this fires the topmost panel/modal handler.
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stack.length > 0) {
      e.preventDefault()
      stack[stack.length - 1]()  // topmost handler only
    }
  })
}

// Hook — registers handler on mount, cleans up on unmount.
// Stable function reference required: use useCallback or a stable arrow at call site,
// otherwise the cleanup removes the wrong entry from the stack.
export function useEscape(onEscape: () => void) {
  useEffect(() => {
    pushEscape(onEscape)
    return () => popEscape(onEscape)
  }, [onEscape])
}
