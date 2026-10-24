import { computed, ref } from 'vue'

type Theme = 'light' | 'dark'
const storageKey = 'invoice-keeper-theme'
const theme = ref<Theme>('light')
let preference: Theme | null = null
let systemTheme: MediaQueryList

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(storageKey)
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    return null
  }
}

function applyTheme(value: Theme) {
  theme.value = value
  document.documentElement.dataset.theme = value
  document.documentElement.style.colorScheme = value
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', value === 'dark' ? '#1b1917' : '#fff0e2')
}

// Called once at application startup; system changes apply until the user chooses a theme.
export function initializeTheme() {
  systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
  preference = savedTheme()
  applyTheme(preference ?? (systemTheme.matches ? 'dark' : 'light'))
  systemTheme.addEventListener('change', (event) => {
    if (!preference) applyTheme(event.matches ? 'dark' : 'light')
  })
  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey && event.key !== null) return
    preference = savedTheme()
    applyTheme(preference ?? (systemTheme.matches ? 'dark' : 'light'))
  })
}

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark')
  function toggleTheme() {
    preference = isDark.value ? 'light' : 'dark'
    applyTheme(preference)
    try {
      localStorage.setItem(storageKey, preference)
    } catch {
      // Theme switching still works when browser storage is unavailable.
    }
  }
  return { isDark, toggleTheme }
}
