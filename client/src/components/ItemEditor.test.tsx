import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fixtureData } from '../test/fixtures'
import { saveCatalogItem } from '../services/groceries'
import { ItemEditor } from './ItemEditor'

vi.mock('../services/groceries', () => ({ saveCatalogItem: vi.fn() }))

beforeEach(() => {
  vi.mocked(saveCatalogItem).mockReset().mockResolvedValue('bread')
})

describe('ItemEditor', () => {
  it('adds the named item to the tapped section, confirms it, then closes', async () => {
    const onClose = vi.fn()
    render(<ItemEditor data={fixtureData} onClose={onClose} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Name'), '  Bread  ')

    await user.click(screen.getByRole('button', { name: 'Add Bread to Bakery' }))

    expect(saveCatalogItem).toHaveBeenCalledExactlyOnceWith('Bread', 'bakery', fixtureData.catalog, 0)
    expect(screen.getByRole('button', { name: 'Add Bread to Bakery' })).toHaveTextContent('BakeryAdded')
    expect(onClose).not.toHaveBeenCalled()
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('moves focus to the section choices on Enter instead of guessing a section', async () => {
    render(<ItemEditor data={fixtureData} onClose={vi.fn()} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Name'), 'Bread{Enter}')

    expect(screen.getByRole('button', { name: 'Add Bread to Produce' })).toHaveFocus()
    expect(saveCatalogItem).not.toHaveBeenCalled()
  })

  it('keeps the dialog open and returns to the name when a section is tapped without one', async () => {
    const onClose = vi.fn()
    render(<ItemEditor data={fixtureData} onClose={onClose} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Add to Bakery' }))

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveFocus()
    expect(saveCatalogItem).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it.each(['Escape', 'Close dialog'])('can dismiss with %s without saving', async (action) => {
    const onClose = vi.fn()
    render(<ItemEditor data={fixtureData} onClose={onClose} />)
    const user = userEvent.setup()
    expect(screen.getByRole('dialog', { name: 'What else sounds good?' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'What else sounds good?' })).toBeVisible()

    if (action === 'Escape') await user.keyboard('{Escape}')
    else await user.click(screen.getByRole('button', { name: action }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(saveCatalogItem).not.toHaveBeenCalled()
  })
})
