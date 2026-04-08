// Ensure localStorage works in jsdom test environment
// Supabase client and sampleData.ts both need it
const store = new Map<string, string>()
const storage: Storage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
  get length() { return store.size },
  key: (i: number) => [...store.keys()][i] ?? null,
}

Object.defineProperty(globalThis, 'localStorage', { value: storage, writable: true })
