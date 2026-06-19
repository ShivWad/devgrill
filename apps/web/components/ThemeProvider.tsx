'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'
type Pref = Theme | 'system'

const Ctx = createContext<{ theme: Theme; pref: Pref; toggle: () => void }>({
  theme: 'dark', pref: 'system', toggle: () => {},
})

export const useTheme = () => useContext(Ctx)

function sysTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPref] = useState<Pref>('system')
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Pref | null
    const p: Pref = stored === 'light' || stored === 'dark' ? stored : 'system'
    const t: Theme = p === 'system' ? sysTheme() : p
    setPref(p)
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  useEffect(() => {
    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const h = (e: MediaQueryListEvent) => {
      const t = e.matches ? 'light' : ('dark' as Theme)
      setTheme(t)
      document.documentElement.setAttribute('data-theme', t)
    }
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [pref])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setPref(next)
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return <Ctx.Provider value={{ theme, pref, toggle }}>{children}</Ctx.Provider>
}
