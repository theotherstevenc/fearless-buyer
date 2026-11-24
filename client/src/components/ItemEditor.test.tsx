import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fixtureData } from '../test/fixtures'
import { saveCatalogItem } from '../services/groceries'
import { ItemEditor } from './ItemEditor'

vi.mock('../services/groceries', () => ({ saveCatalogItem: vi.fn().mockResolvedValue(undefined) }))

beforeEach(() => vi.clearAllMocks())

describe('ItemEditor', () => {
  it('saves an unlisted item to catalog only', async () => {
    const onClose = vi.fn()
    render(<ItemEditor data={fixtureData} onClose={onClose} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Name'), '  Bread  ')
    await user.selectOptions(screen.getByLabelText('Store section'), 'bakery')
    await user.click(screen.getByRole('button', { name: 'Save item' }))
    expect(saveCatalogItem).toHaveBeenCalledWith('Bread', 'bakery', fixtureData.catalog, 0, undefined)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it.each(['Cancel', 'Escape', 'Close dialog'])('can dismiss with %s without saving', async (action) => {
    const onClose = vi.fn()
    render(<ItemEditor data={fixtureData} onClose={onClose} />)
    const user = userEvent.setup()
    expect(screen.getByRole('dialog', { name: 'What else sounds good?' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'What else sounds good?' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeVisible()

    if (action === 'Escape') await user.keyboard('{Escape}')
    else await user.click(screen.getByRole('button', { name: action }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(saveCatalogItem).not.toHaveBeenCalled()
  })
})
