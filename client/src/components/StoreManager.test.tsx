import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { deleteCatalogItem, removeEmptySection, saveCatalogItem, saveSection } from '../services/groceries'
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
  vi.mocked(saveCatalogItem).mockReset().mockResolvedValue('new-item')
  vi.mocked(saveSection).mockReset().mockResolvedValue('new-section')
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

  it('opens the move dialog for an item and returns to management when Escape dismisses it', async () => {
    render(<StoreManager data={fixtureData} isDisabled={false} onClose={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Move Lemons to another section' }))
    expect(screen.getByRole('dialog', { name: 'Move Lemons' })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Move Lemons' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Your store, your route' })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Move Lemons to another section' })).toHaveFocus(),
    )
  })

  it('focuses, highlights, and announces an item once it appears in its new section', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const { rerender } = render(<StoreManager data={fixtureData} isDisabled={false} onClose={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Move Lemons to another section' }))

    await user.click(screen.getByRole('button', { name: 'Move Lemons to Bakery' }))
    const movedData = {
      ...fixtureData,
      catalog: fixtureData.catalog.map((item) =>
        item.id === 'lemons' ? { ...item, sectionId: 'bakery' } : item,
      ),
    }
    rerender(<StoreManager data={movedData} isDisabled={false} onClose={vi.fn()} />)

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Move Lemons' })).not.toBeInTheDocument())
    const bakery = screen.getByRole('region', { name: 'Bakery items' })
    const moveButton = within(bakery).getByRole('button', { name: 'Move Lemons to another section' })
    await waitFor(() => expect(moveButton).toHaveFocus())
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
    expect(moveButton.closest('li')).toHaveClass('is-highlighted')
    expect(screen.getByText('Moved Lemons to Bakery.')).toHaveAttribute('role', 'status')
  })

  it('renames a section in place in the section list and returns focus to its rename button', async () => {
    render(<StoreManager data={fixtureData} isDisabled={false} onClose={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Rename Produce' }))
    const input = screen.getByRole('textbox', { name: 'Rename section Produce' })
    expect(input).toHaveFocus()

    await user.clear(input)
    await user.type(input, 'Fresh finds{Enter}')

    expect(saveSection).toHaveBeenCalledExactlyOnceWith(
      'Fresh finds',
      fixtureData.sections,
      0,
      fixtureData.sections[1],
    )
    expect(screen.queryByRole('textbox', { name: 'Rename section Produce' })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rename Produce' })).toHaveFocus())
  })

  it('cancels an inline rename with Escape without saving or closing the dialog', async () => {
    const onClose = vi.fn()
    render(<StoreManager data={fixtureData} isDisabled={false} onClose={onClose} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Rename Produce' }))
    await user.type(screen.getByRole('textbox', { name: 'Rename section Produce' }), 'Fresh finds')

    await user.keyboard('{Escape}')

    expect(saveSection).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox', { name: 'Rename section Produce' })).not.toBeInTheDocument()
  })

  it('keeps the previous name when an inline rename is left blank', async () => {
    render(<StoreManager data={fixtureData} isDisabled={false} onClose={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Rename Lemons' }))
    await user.clear(screen.getByRole('textbox', { name: 'Rename Lemons' }))

    await user.tab()

    expect(saveCatalogItem).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox', { name: 'Rename Lemons' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hold Lemons to reorder' })).toBeInTheDocument()
  })

  it('keeps an inline rename open with an error when saving fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(saveSection).mockRejectedValueOnce(new Error('Store layout changed.'))
    render(<StoreManager data={fixtureData} isDisabled={false} onClose={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Rename Produce' }))
    const input = screen.getByRole('textbox', { name: 'Rename section Produce' })
    await user.clear(input)
    await user.type(input, 'Fresh finds{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent('Store layout changed.')
    expect(input).toHaveValue('Fresh finds')
    expect(input).toHaveFocus()
    log.mockRestore()
  })

  it('adds an untitled item from a section header and edits its name in place', async () => {
    const { rerender } = render(<StoreManager data={fixtureData} isDisabled={false} onClose={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Add item to Bakery' }))
    expect(saveCatalogItem).toHaveBeenCalledExactlyOnceWith('Untitled item', 'bakery', fixtureData.catalog, 0)

    const newItem = { id: 'new-item', name: 'Untitled item', sectionId: 'bakery', sortOrder: 0 }
    const data = { ...fixtureData, catalog: [...fixtureData.catalog, newItem], revision: 1 }
    rerender(<StoreManager data={data} isDisabled={false} onClose={vi.fn()} />)
    const input = screen.getByRole('textbox', { name: 'Rename Untitled item' })
    expect(input).toHaveFocus()

    await user.keyboard('Sourdough{Enter}')

    expect(saveCatalogItem).toHaveBeenLastCalledWith('Sourdough', 'bakery', data.catalog, 1, newItem)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rename Untitled item' })).toHaveFocus())
  })

  it('swaps the rename button for a save button that finishes the inline edit', async () => {
    render(<StoreManager data={fixtureData} isDisabled={false} onClose={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Rename Lemons' }))
    expect(screen.queryByRole('button', { name: 'Rename Lemons' })).not.toBeInTheDocument()
    const input = screen.getByRole('textbox', { name: 'Rename Lemons' })
    await user.clear(input)
    await user.type(input, 'Limes')

    await user.click(screen.getByRole('button', { name: 'Save Lemons' }))

    expect(saveCatalogItem).toHaveBeenCalledExactlyOnceWith(
      'Limes',
      'produce',
      fixtureData.catalog,
      0,
      fixtureData.catalog[1],
    )
    expect(screen.queryByRole('textbox', { name: 'Rename Lemons' })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rename Lemons' })).toHaveFocus())
  })

  it('adds an untitled section from the sections header and names it in place', async () => {
    const { rerender } = render(<StoreManager data={fixtureData} isDisabled={false} onClose={vi.fn()} />)
    const user = userEvent.setup()
    expect(screen.getByRole('heading', { name: 'Sections' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add section' }))
    expect(saveSection).toHaveBeenCalledExactlyOnceWith('Untitled section', fixtureData.sections, 0)

    const newSection = { id: 'new-section', name: 'Untitled section', sortOrder: 3, itemCount: 0 }
    const data = { ...fixtureData, sections: [...fixtureData.sections, newSection], revision: 1 }
    rerender(<StoreManager data={data} isDisabled={false} onClose={vi.fn()} />)
    expect(screen.getByRole('textbox', { name: 'Rename section Untitled section' })).toHaveFocus()

    await user.keyboard('Deli{Enter}')

    expect(saveSection).toHaveBeenLastCalledWith('Deli', data.sections, 1, newSection)
  })
})
