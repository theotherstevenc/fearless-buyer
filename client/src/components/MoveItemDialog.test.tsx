import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { saveCatalogItem } from '../services/groceries'
import { fixtureData } from '../test/fixtures'
import { MoveItemDialog } from './MoveItemDialog'

vi.mock('../services/groceries', () => ({ saveCatalogItem: vi.fn() }))

const lemons = fixtureData.catalog[1]

beforeEach(() => {
  vi.mocked(saveCatalogItem).mockReset().mockResolvedValue('lemons')
})

describe('MoveItemDialog', () => {
  it('keeps sections in store order and marks the current one in place', () => {
    const peas = fixtureData.catalog[2]
    render(<MoveItemDialog data={fixtureData} item={peas} onMoved={vi.fn()} onClose={vi.fn()} />)
    const sections = screen.getByRole('group', { name: 'Store section' })
    expect(screen.queryByText(/Choose a new store section/)).not.toBeInTheDocument()
    const rows = within(sections).getAllByRole('listitem')

    expect(rows.map((row) => row.textContent)).toEqual(['Produce', 'FrozenCurrent', 'Bakery'])
    expect(within(rows[1]).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Move Peas to Produce' })).toHaveFocus()
  })

  it('moves the item with one tap, confirms the choice, then closes', async () => {
    const onMoved = vi.fn()
    const onClose = vi.fn()
    render(<MoveItemDialog data={fixtureData} item={lemons} onMoved={onMoved} onClose={onClose} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Move Lemons to Bakery' }))

    expect(saveCatalogItem).toHaveBeenCalledExactlyOnceWith(
      'Lemons',
      'bakery',
      fixtureData.catalog,
      0,
      lemons,
    )
    expect(onMoved).toHaveBeenCalledExactlyOnceWith(fixtureData.sections[2])
    expect(screen.getByRole('button', { name: 'Move Lemons to Bakery' })).toHaveTextContent('BakeryMoved')
    expect(onClose).not.toHaveBeenCalled()
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('stays open with a retryable error when the move fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(saveCatalogItem).mockRejectedValueOnce(new Error('Catalog changed. Please try again.'))
    const onMoved = vi.fn()
    const onClose = vi.fn()
    render(<MoveItemDialog data={fixtureData} item={lemons} onMoved={onMoved} onClose={onClose} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Move Lemons to Bakery' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Catalog changed. Please try again.')
    expect(screen.getByRole('button', { name: 'Move Lemons to Bakery' })).toBeEnabled()
    expect(onMoved).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    log.mockRestore()
  })
})
