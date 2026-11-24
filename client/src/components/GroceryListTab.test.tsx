import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { fixtureData } from '../test/fixtures'
import { GroceryListTab } from './GroceryListTab'

describe('GroceryListTab', () => {
  const props = () => ({
    data: {
      ...fixtureData,
      list: {
        items: { lemons: { quantity: 1, completed: false }, apples: { quantity: 3, completed: false } },
      },
    },
    isBusy: false,
    onComplete: vi.fn().mockResolvedValue(true),
    onRemove: vi.fn().mockResolvedValue(true),
    onReset: vi.fn().mockResolvedValue(true),
    onChoose: vi.fn(),
  })
  it('shows no quantity or catalog edit controls', () => {
    render(<GroceryListTab {...props()} />)
    expect(screen.queryByRole('button', { name: /quantity|edit/i })).not.toBeInTheDocument()
  })
  it('checks items without changing their position, and removes separately', async () => {
    const callbacks = props()
    const { rerender } = render(<GroceryListTab {...callbacks} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('checkbox', { name: 'Lemons in cart' }))
    expect(callbacks.onComplete).toHaveBeenCalledWith('lemons', true)
    rerender(
      <GroceryListTab
        {...callbacks}
        data={{
          ...callbacks.data,
          list: { items: { ...callbacks.data.list.items, lemons: { quantity: 1, completed: true } } },
        }}
      />,
    )
    const checks = screen.getAllByRole('checkbox')
    expect(checks[0]).toHaveAccessibleName('Lemons in cart')
    expect(checks[0]).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('button', { name: 'Remove Lemons from Grocery List' }))
    expect(callbacks.onRemove).toHaveBeenCalledWith('lemons')
  })
  it('requires reset confirmation and respects cancel', async () => {
    const callbacks = props()
    render(<GroceryListTab {...callbacks} />)
    const user = userEvent.setup()
    expect(screen.getByText('0 of 2 in cart')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'New list' }))
    await user.click(screen.getByRole('button', { name: 'Keep current list' }))
    expect(callbacks.onReset).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'New list' }))
    await user.click(screen.getByRole('button', { name: 'Start new list' }))
    expect(callbacks.onReset).toHaveBeenCalledOnce()
  })
})
