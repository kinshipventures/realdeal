import { useEffect, useState } from 'react'

export function useTheme(): 'light' | 'dark' {
  const getTheme = (): 'light' | 'dark' => {
    const attr = document.documentElement.getAttribute('data-theme')
    if (attr === 'dark') return 'dark'
    if (attr === 'light') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  const [theme, setTheme] = useState<'light' | 'dark'>(getTheme)
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(getTheme()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onMq = () => setTheme(getTheme())
    mq.addEventListener('change', onMq)
    return () => { obs.disconnect(); mq.removeEventListener('change', onMq) }
  }, [])
  return theme
}
