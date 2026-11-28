import { useEffect, useState } from 'react'

/*
 * Condensing the app bar shortens the page, which moves the scroll position. Separate
 * thresholds, with a gap wider than the height the bar loses, keep it from flickering
 * between states near the top.
 */
export const CONDENSE_AFTER_PX = 96
export const EXPAND_BEFORE_PX = 8

export const useIsScrolledDown = (): boolean => {
  const [isScrolledDown, setIsScrolledDown] = useState(() => window.scrollY > CONDENSE_AFTER_PX)
  useEffect(() => {
    const update = () =>
      setIsScrolledDown((wasScrolledDown) =>
        wasScrolledDown ? window.scrollY >= EXPAND_BEFORE_PX : window.scrollY > CONDENSE_AFTER_PX,
      )
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  return isScrolledDown
}
