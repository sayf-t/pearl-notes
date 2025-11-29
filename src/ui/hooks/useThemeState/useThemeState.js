import { useEffect, useState } from 'react'

export function useThemeState (themeManager) {
  const [themeState, setThemeState] = useState(themeManager.getState())

  useEffect(() => {
    const unsubscribe = themeManager.subscribe(setThemeState)
    return unsubscribe
  }, [themeManager])

  return themeState
}

