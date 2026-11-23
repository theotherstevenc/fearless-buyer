import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { fixtureData } from '../test/fixtures'
import { CatalogTab } from './CatalogTab'

describe('CatalogTab', () => {
  const props = () => ({
    data: fixtureData,
    isBusy: false,
    exitingItem: null,
    onSelect: vi.fn().mockResolvedValue(true),
    onAdd: vi.fn(),
    onEdit: vi.fn(),
    onManage: vi.fn(),
  })
  it('shows a setup path before sections exist and disables adding groceries', () => {
    const callbacks = props()
    render(<CatalogTab {...callbacks} data={{ ...fixtureData, sections: [], catalog: [] }} />)
    expect(screen.getByRole('button', { name: 'Add item' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Set up store sections' })).toBeEnabled()
  })
  it('searches without losing route order and keeps editing separate from selection', async () => {
    const callbacks = props()
    render(<CatalogTab {...callbacks} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit Lemons' }))
    expect(callbacks.onEdit).toHaveBeenCalledWith(fixtureData.catalog[1])
    expect(callbacks.onSelect).not.toHaveBeenCalled()
    await user.type(screen.getByRole('searchbox'), 'peas')
    expect(screen.getByRole('button', { name: 'Add Peas to Grocery List' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add Lemons to Grocery List' })).not.toBeInTheDocument()
  })
  it('keeps the exiting row during a confirmed live update, then removes it', () => {
    const callbacks = props()
    const data = { ...fixtureData, list: { items: { lemons: { quantity: 1, completed: false } } } }
    const { rerender } = render(
      <CatalogTab {...callbacks} data={data} exitingItem={fixtureData.catalog[1]} />,
    )
    expect(screen.getByRole('button', { name: 'Add Lemons to Grocery List' }).closest('li')).toHaveClass(
      'row-exiting',
    )
    rerender(<CatalogTab {...callbacks} data={data} />)
    expect(screen.queryByRole('button', { name: 'Add Lemons to Grocery List' })).not.toBeInTheDocument()
  })
  it('returns keyboard focus to the selectable row when saving fails', async () => {
    const callbacks = props()
    callbacks.onSelect.mockResolvedValue(false)
    render(<CatalogTab {...callbacks} />)
    const button = screen.getByRole('button', { name: 'Add Lemons to Grocery List' })
    await userEvent.click(button)
    expect(button).toHaveFocus()
  })
})
