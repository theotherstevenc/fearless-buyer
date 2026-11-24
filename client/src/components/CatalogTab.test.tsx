import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { fixtureData } from '../test/fixtures'
import { CatalogTab } from './CatalogTab'

describe('CatalogTab', () => {
  const props = () => ({
    data: fixtureData,
    isBusy: false,
    exitingItems: [],
    onSelect: vi.fn().mockResolvedValue(true),
    onEdit: vi.fn(),
    onManage: vi.fn(),
  })
  it('shows a setup path before sections exist', () => {
    const callbacks = props()
    render(<CatalogTab {...callbacks} data={{ ...fixtureData, sections: [], catalog: [] }} />)
    expect(screen.getByRole('button', { name: 'Set up store sections' })).toBeEnabled()
  })
  it('keeps editing separate from selection', async () => {
    const callbacks = props()
    render(<CatalogTab {...callbacks} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Edit Lemons' }))
    expect(callbacks.onEdit).toHaveBeenCalledWith(fixtureData.catalog[1])
    expect(callbacks.onSelect).not.toHaveBeenCalled()
  })
  it('keeps the exiting row during a confirmed live update, then removes it', () => {
    const callbacks = props()
    const data = { ...fixtureData, list: { items: { lemons: { quantity: 1, completed: false } } } }
    const { rerender } = render(
      <CatalogTab {...callbacks} data={data} exitingItems={[fixtureData.catalog[1]]} />,
    )
    expect(screen.getByRole('button', { name: 'Add Lemons to Grocery List' }).closest('li')).toHaveClass(
      'row-exiting',
    )
    rerender(<CatalogTab {...callbacks} data={data} />)
    expect(screen.queryByRole('button', { name: 'Add Lemons to Grocery List' })).not.toBeInTheDocument()
  })
  it('animates several rows out at once while their selections confirm', () => {
    const callbacks = props()
    const data = {
      ...fixtureData,
      list: {
        items: {
          lemons: { quantity: 1, completed: false },
          peas: { quantity: 1, completed: false },
        },
      },
    }
    render(
      <CatalogTab
        {...callbacks}
        data={data}
        exitingItems={[fixtureData.catalog[1], fixtureData.catalog[2]]}
      />,
    )
    for (const name of ['Lemons', 'Peas']) {
      expect(screen.getByRole('button', { name: `Add ${name} to Grocery List` }).closest('li')).toHaveClass(
        'row-exiting',
      )
    }
    expect(screen.getByRole('button', { name: 'Add Apples to Grocery List' }).closest('li')).not.toHaveClass(
      'row-exiting',
    )
  })
  it('returns keyboard focus to the selectable row when saving fails', async () => {
    const callbacks = props()
    callbacks.onSelect.mockResolvedValue(false)
    render(<CatalogTab {...callbacks} />)
    const button = screen.getByRole('button', { name: 'Add Lemons to Grocery List' })
    await userEvent.click(button)
    expect(button).toHaveFocus()
  })
  it('moves keyboard focus to the next row after a selected row leaves', async () => {
    const callbacks = props()
    const data = { ...fixtureData, list: { items: { lemons: { quantity: 1, completed: false } } } }
    callbacks.onSelect.mockImplementation(async () => {
      rerender(<CatalogTab {...callbacks} data={data} />)
      return true
    })
    const { rerender } = render(<CatalogTab {...callbacks} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add Lemons to Grocery List' }))
    expect(screen.getByRole('button', { name: 'Add Apples to Grocery List' })).toHaveFocus()
  })
})
