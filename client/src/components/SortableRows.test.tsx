import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SortableRows } from './SortableRows'

const rows = [
  { id: 'lemons', label: 'Lemons', actions: null },
  { id: 'apples', label: 'Apples', actions: null },
  { id: 'pears', label: 'Pears', actions: null },
]

const deferredSave = () => {
  let resolve!: (saved: boolean) => void
  const promise = new Promise<boolean>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const labels = () =>
  screen.getAllByRole('listitem').map((row) => within(row).getByText(/Lemons|Apples|Pears/).textContent)

afterEach(() => {
  if (vi.isFakeTimers()) act(() => vi.runOnlyPendingTimers())
  vi.useRealTimers()
})

describe('SortableRows', () => {
  it('reorders from a held mouse press, but not from a short click', async () => {
    vi.useFakeTimers()
    const onReorder = vi.fn().mockResolvedValue(true)
    render(<SortableRows rows={rows} isBusy={false} onReorder={onReorder} />)
    const name = screen.getByRole('button', { name: 'Hold Lemons to reorder' })
    screen.getAllByRole('listitem').forEach((row, index) => {
      vi.spyOn(row, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, index * 56, 400, 56))
    })

    fireEvent.mouseDown(name, { button: 0, clientX: 20, clientY: 20 })
    act(() => vi.advanceTimersByTime(100))
    expect(name).not.toHaveAttribute('aria-pressed', 'true')
    fireEvent.mouseUp(document)
    act(() => vi.advanceTimersByTime(300))
    expect(name).not.toHaveAttribute('aria-pressed', 'true')

    fireEvent.mouseDown(name, { button: 0, clientX: 20, clientY: 20 })
    act(() => vi.advanceTimersByTime(300))
    expect(name).toHaveAttribute('aria-pressed', 'true')
    fireEvent.mouseMove(document, { clientX: 20, clientY: 80 })
    await act(async () => fireEvent.mouseUp(document))
    expect(onReorder).toHaveBeenCalledWith(['apples', 'lemons', 'pears'])
    expect(labels()).toEqual(['Apples', 'Lemons', 'Pears'])
  })

  it('allows a held touch to drag and cancels activation when a touch moves to scroll', () => {
    vi.useFakeTimers()
    render(<SortableRows rows={rows} isBusy={false} onReorder={vi.fn().mockResolvedValue(true)} />)
    const name = screen.getByRole('button', { name: 'Hold Lemons to reorder' })
    const touch = { identifier: 1, clientX: 20, clientY: 20 }

    fireEvent.touchStart(name, { touches: [touch] })
    fireEvent.touchMove(name, { touches: [{ ...touch, clientY: 40 }] })
    act(() => vi.advanceTimersByTime(300))
    expect(name).not.toHaveAttribute('aria-pressed', 'true')
    fireEvent.touchEnd(name, { touches: [], changedTouches: [touch] })

    fireEvent.touchStart(name, { touches: [touch] })
    act(() => vi.advanceTimersByTime(300))
    expect(name).toHaveAttribute('aria-pressed', 'true')
    fireEvent.touchEnd(name, { touches: [], changedTouches: [touch] })
  })

  it('keeps keyboard drag activation and cancellation available', () => {
    vi.useFakeTimers()
    render(<SortableRows rows={rows} isBusy={false} onReorder={vi.fn().mockResolvedValue(true)} />)
    const name = screen.getByRole('button', { name: 'Hold Lemons to reorder' })
    name.focus()

    fireEvent.keyDown(name, { code: 'Space' })
    act(() => vi.advanceTimersByTime(0))
    expect(name).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(document, { code: 'Escape' })
    expect(name).not.toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps a moved row in place while saving and accepts subsequent shared ordering', async () => {
    const save = deferredSave()
    const onReorder = vi.fn().mockReturnValue(save.promise)
    const { rerender } = render(<SortableRows rows={rows} isBusy={false} onReorder={onReorder} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Move Lemons down' }))

    expect(onReorder).toHaveBeenCalledWith(['apples', 'lemons', 'pears'])
    expect(labels()).toEqual(['Apples', 'Lemons', 'Pears'])
    expect(screen.getByRole('button', { name: 'Move Lemons down' })).toBeDisabled()
    await act(async () => save.resolve(true))
    expect(labels()).toEqual(['Apples', 'Lemons', 'Pears'])

    rerender(<SortableRows rows={[rows[1], rows[0], rows[2]]} isBusy={false} onReorder={onReorder} />)
    expect(labels()).toEqual(['Apples', 'Lemons', 'Pears'])
    rerender(<SortableRows rows={rows} isBusy={false} onReorder={onReorder} />)
    expect(labels()).toEqual(['Lemons', 'Apples', 'Pears'])
  })

  it('restores the current shared order when a save fails', async () => {
    const save = deferredSave()
    render(<SortableRows rows={rows} isBusy={false} onReorder={() => save.promise} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Move Lemons down' }))
    expect(labels()).toEqual(['Apples', 'Lemons', 'Pears'])

    await act(async () => save.resolve(false))

    expect(labels()).toEqual(['Lemons', 'Apples', 'Pears'])
    expect(screen.getByRole('button', { name: 'Move Lemons down' })).toBeEnabled()
  })
})
