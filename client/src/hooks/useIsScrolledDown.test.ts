import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CONDENSE_AFTER_PX, EXPAND_BEFORE_PX, useIsScrolledDown } from './useIsScrolledDown'

const scrollTo = (y: number) =>
  act(() => {
    window.scrollY = y
    window.dispatchEvent(new Event('scroll'))
  })

afterEach(() => {
  window.scrollY = 0
})

describe('useIsScrolledDown', () => {
  it('condenses past the threshold and only expands again near the top', () => {
    const { result } = renderHook(() => useIsScrolledDown())
    expect(result.current).toBe(false)

    scrollTo(CONDENSE_AFTER_PX - 1)
    expect(result.current).toBe(false)
    scrollTo(CONDENSE_AFTER_PX + 1)
    expect(result.current).toBe(true)
    scrollTo(EXPAND_BEFORE_PX + 1)
    expect(result.current).toBe(true)
    scrollTo(EXPAND_BEFORE_PX - 1)
    expect(result.current).toBe(false)
  })
})
