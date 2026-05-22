import { useState, useEffect } from "react"

/**
 * React hook that returns `true` when `window.matchMedia(query)` matches.
 *
 * Usage:
 *   const isDesktop = useMediaQuery("(min-width: 1024px)")
 *   const isMobile  = useMediaQuery("(max-width: 767px)")
 *
 * Safe on SSR — returns `false` during the first render on the server,
 * syncs on mount in the browser.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [query])

  return matches
}
