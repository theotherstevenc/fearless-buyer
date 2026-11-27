import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { signOut } from 'firebase/auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'
import { updateSelection } from './services/groceries'
import { fixtureData } from './test/fixtures'

vi.mock('firebase/auth', () => ({ signOut: vi.fn() }))
vi.mock('./lib/firebase', () => ({ auth: {} }))
vi.mock('./context/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'buyer-one' }, isLoading: false, error: null }),
}))
const connectivity = vi.hoisted(() => ({ isOnline: true }))
vi.mock('./hooks/useConnectivity', () => ({ useConnectivity: () => connectivity.isOnline }))
const householdState = vi.hoisted(() => ({ hasPendingWrites: false }))
vi.mock('./hooks/useHousehold', () => ({
  useHousehold: () => ({
    data: fixtureData,
    isLoading: false,
    isFromCache: false,
    hasPendingWrites: householdState.hasPendingWrites,
    error: null,
    retry: vi.fn(),
  }),
}))
vi.mock('./services/groceries', () => ({
  deleteCatalogItem: vi.fn(),
  removeEmptySection: vi.fn(),
  reorder: vi.fn(),
  resetList: vi.fn(),
  saveCatalogItem: vi.fn(),
  saveSection: vi.fn(),
  updateSelection: vi.fn(),
}))

beforeEach(() => {
  connectivity.isOnline = true
  householdState.hasPendingWrites = false
  vi.mocked(signOut).mockReset().mockResolvedValue(undefined)
})

describe('App', () => {
  it('shows the Grocery List tab first and selected', () => {
    render(<App />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Grocery List 0', 'Catalog'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
  })
  it('shows the offline state in the header', () => {
    connectivity.isOnline = false
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Offline Buyer')
    expect(screen.getAllByText('List changes will sync when you reconnect.')).toHaveLength(2)
  })

  it('keeps store controls enabled while list changes sync', () => {
    householdState.hasPendingWrites = true
    render(<App />)
    expect(screen.getByRole('button', { name: 'Add item' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Manage store and catalog' })).toBeEnabled()
  })

  it('keeps the catalog usable while a selection is still syncing', async () => {
    vi.mocked(updateSelection).mockReturnValueOnce(new Promise(() => {}))
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Catalog' }))
    await user.click(screen.getByRole('button', { name: 'Add Lemons to Grocery List' }))

    expect(updateSelection).toHaveBeenCalledWith(fixtureData.list, 'lemons', { type: 'select' })
    expect(screen.getByRole('button', { name: 'Add Apples to Grocery List' })).toBeEnabled()
  })

  it('shows an error and keeps the row when the selection is rejected', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(updateSelection).mockRejectedValueOnce(new Error('Could not save.'))
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Catalog' }))
    await user.click(screen.getByRole('button', { name: 'Add Lemons to Grocery List' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save.')
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Add Lemons to Grocery List' }).closest('li'),
      ).not.toHaveClass('row-exiting'),
    )
    log.mockRestore()
  })

  it('can add an item through management without using the header shortcut', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Manage store and catalog' }))
    const manager = screen.getByRole('dialog', { name: 'Your store, your route' })
    await user.click(within(manager).getByRole('button', { name: 'Add item' }))

    expect(screen.getByRole('dialog', { name: 'What else sounds good?' })).toBeInTheDocument()
  })

  it('requires confirmation for the labeled sign-out action and allows cancellation', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(signOut).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Stay signed in' }))
    expect(signOut).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    const dialog = screen.getByRole('dialog', { name: 'Sign out?' })
    await user.click(within(dialog).getByRole('button', { name: 'Sign out' }))

    expect(signOut).toHaveBeenCalledOnce()
  })

  it('shows a retryable sign-out error inside the confirmation', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(signOut).mockRejectedValueOnce(new Error('Could not sign out. Please try again.'))
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    const dialog = screen.getByRole('dialog', { name: 'Sign out?' })
    await user.click(within(dialog).getByRole('button', { name: 'Sign out' }))

    expect(within(dialog).getByRole('alert')).toHaveTextContent('Could not sign out. Please try again.')
    await user.click(within(dialog).getByRole('button', { name: 'Sign out' }))
    expect(signOut).toHaveBeenCalledTimes(2)
    log.mockRestore()
  })
})
