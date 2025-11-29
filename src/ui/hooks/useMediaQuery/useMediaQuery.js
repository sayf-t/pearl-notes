import { useEffect, useState } from 'react'

export function useMediaQuery (query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }
    const mediaQuery = window.matchMedia(query)
    const handleChange = (event) => {
      if (event && typeof event.matches === 'boolean') {
        setMatches(event.matches)
      } else {
        setMatches(mediaQuery.matches)
      }
    }
    setMatches(mediaQuery.matches)
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
    if ('onchange' in mediaQuery) {
      const previousHandler = mediaQuery.onchange
      mediaQuery.onchange = handleChange
      return () => {
        if (mediaQuery.onchange === handleChange) {
          mediaQuery.onchange = previousHandler || null
        }
      }
    }
    const handleResize = () => handleChange()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [query])

  return matches
}

