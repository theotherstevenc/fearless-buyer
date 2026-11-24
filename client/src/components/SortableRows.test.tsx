import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

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

describe('SortableRows', () => {
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
