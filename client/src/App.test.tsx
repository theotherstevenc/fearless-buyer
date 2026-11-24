import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { signOut } from 'firebase/auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { App } from './App'
import { fixtureData } from './test/fixtures'

vi.mock('firebase/auth', () => ({ signOut: vi.fn() }))
vi.mock('./lib/firebase', () => ({ auth: {} }))
vi.mock('./context/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'buyer-one' }, isLoading: false, error: null }),
}))
vi.mock('./hooks/useConnectivity', () => ({ useConnectivity: () => true }))
vi.mock('./hooks/useHousehold', () => ({
  useHousehold: () => ({
    data: fixtureData,
    isLoading: false,
    isFromCache: false,
    hasPendingWrites: false,
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
  vi.mocked(signOut).mockReset().mockResolvedValue(undefined)
})

describe('App', () => {
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
