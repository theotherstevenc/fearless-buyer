import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { deleteCatalogItem } from '../services/groceries'
import { fixtureData } from '../test/fixtures'
import { StoreManager } from './StoreManager'

vi.mock('../services/groceries', () => ({
  deleteCatalogItem: vi.fn(),
  removeEmptySection: vi.fn(),
  reorder: vi.fn(),
  saveCatalogItem: vi.fn(),
  saveSection: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(deleteCatalogItem).mockReset().mockResolvedValue(undefined)
})

describe('StoreManager', () => {
  it('requires confirmation before deleting a grocery, including one already on the list', async () => {
    const data = {
      ...fixtureData,
      list: { items: { lemons: { quantity: 1, completed: true } } },
    }
    render(<StoreManager data={data} isDisabled={false} onClose={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Delete Lemons from catalog' }))
    expect(deleteCatalogItem).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Keep grocery' }))
    expect(deleteCatalogItem).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Delete Lemons from catalog' }))
    await user.click(screen.getByRole('button', { name: 'Delete grocery' }))

    expect(deleteCatalogItem).toHaveBeenCalledExactlyOnceWith('lemons', 0)
    expect(screen.queryByRole('dialog', { name: 'Delete Lemons?' })).not.toBeInTheDocument()
  })

  it('keeps the confirmation open with a retryable error when deletion fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(deleteCatalogItem).mockRejectedValueOnce(new Error('Catalog changed. Please try again.'))
    render(<StoreManager data={fixtureData} isDisabled={false} onClose={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Delete Lemons from catalog' }))
    await user.click(screen.getByRole('button', { name: 'Delete grocery' }))

    const dialog = screen.getByRole('dialog', { name: 'Delete Lemons?' })
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Catalog changed. Please try again.')
    expect(within(dialog).getByRole('button', { name: 'Delete grocery' })).toBeEnabled()
    await user.click(within(dialog).getByRole('button', { name: 'Delete grocery' }))
    expect(screen.queryByRole('dialog', { name: 'Delete Lemons?' })).not.toBeInTheDocument()
    log.mockRestore()
  })

  it('opens the catalog editor from Add grocery', async () => {
    render(<StoreManager data={fixtureData} isDisabled={false} onClose={vi.fn()} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Add grocery' }))
    expect(screen.getByRole('dialog', { name: 'Add grocery' })).toBeInTheDocument()
  })
})
