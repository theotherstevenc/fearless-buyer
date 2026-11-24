import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { deleteCatalogItem, removeEmptySection } from '../services/groceries'
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
  vi.mocked(removeEmptySection).mockReset().mockResolvedValue(undefined)
})

describe('StoreManager', () => {
  it('shows an empty section without an empty reorder list', () => {
    render(<StoreManager data={fixtureData} isDisabled={false} onClose={vi.fn()} />)
    const section = screen.getByRole('region', { name: 'Bakery items' })

    expect(within(section).getByText('No items here yet.')).toBeInTheDocument()
    expect(within(section).queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove empty section Bakery' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Remove empty section Produce' })).toBeDisabled()
  })

  it('requires confirmation before deleting an empty section and respects cancel', async () => {
    render(<StoreManager data={fixtureData} isDisabled={false} onClose={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Remove empty section Bakery' }))
    expect(removeEmptySection).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Keep section' }))
    expect(removeEmptySection).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Remove empty section Bakery' }))
    await user.click(screen.getByRole('button', { name: 'Delete section' }))

    expect(removeEmptySection).toHaveBeenCalledExactlyOnceWith(fixtureData.sections[2], 0)
    expect(screen.queryByRole('dialog', { name: 'Delete Bakery?' })).not.toBeInTheDocument()
  })

  it('keeps section deletion open with an error if the section changed', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(removeEmptySection).mockRejectedValueOnce(new Error('Section changed. Please try again.'))
    render(<StoreManager data={fixtureData} isDisabled={false} onClose={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Remove empty section Bakery' }))
    await user.click(screen.getByRole('button', { name: 'Delete section' }))

    const dialog = screen.getByRole('dialog', { name: 'Delete Bakery?' })
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Section changed. Please try again.')
    expect(within(dialog).getByRole('button', { name: 'Delete section' })).toBeEnabled()
    await user.click(within(dialog).getByRole('button', { name: 'Delete section' }))
    expect(screen.queryByRole('dialog', { name: 'Delete Bakery?' })).not.toBeInTheDocument()
    log.mockRestore()
  })

  it('requires confirmation before deleting an item, including one already on the list', async () => {
    const data = {
      ...fixtureData,
      list: { items: { lemons: { quantity: 1, completed: true } } },
    }
    render(<StoreManager data={data} isDisabled={false} onClose={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Delete Lemons from catalog' }))
    expect(deleteCatalogItem).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Keep item' }))
    expect(deleteCatalogItem).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Delete Lemons from catalog' }))
    await user.click(screen.getByRole('button', { name: 'Delete item' }))

    expect(deleteCatalogItem).toHaveBeenCalledExactlyOnceWith('lemons', 0)
    expect(screen.queryByRole('dialog', { name: 'Delete Lemons?' })).not.toBeInTheDocument()
  })

  it('keeps the confirmation open with a retryable error when deletion fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(deleteCatalogItem).mockRejectedValueOnce(new Error('Catalog changed. Please try again.'))
    render(<StoreManager data={fixtureData} isDisabled={false} onClose={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Delete Lemons from catalog' }))
    await user.click(screen.getByRole('button', { name: 'Delete item' }))

    const dialog = screen.getByRole('dialog', { name: 'Delete Lemons?' })
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Catalog changed. Please try again.')
    expect(within(dialog).getByRole('button', { name: 'Delete item' })).toBeEnabled()
    await user.click(within(dialog).getByRole('button', { name: 'Delete item' }))
    expect(screen.queryByRole('dialog', { name: 'Delete Lemons?' })).not.toBeInTheDocument()
    log.mockRestore()
  })

  it('opens the item editor and returns to management when Escape dismisses it', async () => {
    render(<StoreManager data={fixtureData} isDisabled={false} onClose={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Add item' }))
    expect(screen.getByRole('dialog', { name: 'What else sounds good?' })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'What else sounds good?' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Your store, your route' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add item' })).toHaveFocus())
  })
})
