import { useCallback, useSyncExternalStore } from 'react'

/**
 * Light / dark theme. The choice lives on <html data-theme="…"> (set before
 * first paint by the inline script in index.html, so dark never flashes
 * light) and is remembered in localStorage. With no saved choice the system
 * setting decides. Colours themselves are CSS variables - styles/tokens.css
 * holds the dark palette under :root[data-theme="dark"].
 */
export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'health-pas-theme'
const listeners = new Set<() => void>()

function current(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function setTheme(theme: Theme): void {
  // Switch every colour in the same frame: elements with transition-all (the
  // side rail, buttons) would otherwise fade into the new theme after the rest.
  const root = document.documentElement
  root.classList.add('theme-switching')
  root.dataset.theme = theme
  void root.offsetHeight // apply the new colours with transitions still off
  requestAnimationFrame(() => root.classList.remove('theme-switching'))
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Storage blocked: the theme still applies for this visit.
  }
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The active theme and a toggle, kept in sync across every component that uses it. */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const theme = useSyncExternalStore(subscribe, current, () => 'light' as Theme)
  const toggle = useCallback(() => setTheme(current() === 'dark' ? 'light' : 'dark'), [])
  return { theme, toggle }
}
