import * as Tabs from '@radix-ui/react-tabs'
import { signOut } from 'firebase/auth'
import { LogOut, Plus, Settings2 } from 'lucide-react'
import { useState } from 'react'

import { CatalogTab } from './components/CatalogTab'
import { GroceryListTab } from './components/GroceryListTab'
import { ItemEditor } from './components/ItemEditor'
import { LoginPage } from './components/LoginPage'
import { Modal } from './components/Modal'
import { StoreManager } from './components/StoreManager'
import { useAuth } from './context/useAuth'
import { useConnectivity } from './hooks/useConnectivity'
import { useHousehold } from './hooks/useHousehold'
import { useIsScrolledDown } from './hooks/useIsScrolledDown'
import { auth } from './lib/firebase'
import { getErrorMessage } from './lib/groceries'
import type { CatalogItem } from './schemas/models'
import { resetList, updateSelection } from './services/groceries'

type ListAction = Parameters<typeof updateSelection>[2]

// Keep in sync with the .row-exiting animation in index.css.
const CATALOG_EXIT_DURATION_MS = 450

const getExitDurationMs = (): number =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : CATALOG_EXIT_DURATION_MS

interface HouseholdAppProps {
  userId: string
}

const HouseholdApp = ({ userId }: HouseholdAppProps) => {
  const household = useHousehold(userId)
  const isOnline = useConnectivity()
  const isScrolledDown = useIsScrolledDown()
  const [tab, setTab] = useState('list')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [exitingItems, setExitingItems] = useState<CatalogItem[]>([])
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [isManaging, setIsManaging] = useState(false)
  const [isLogoutOpen, setIsLogoutOpen] = useState(false)

  const operate = async (operation: () => Promise<void>, message = ''): Promise<boolean> => {
    if (isBusy) return false
    if (!isOnline) {
      setError('You are offline. Reconnect before changing your list.')
      return false
    }
    setIsBusy(true)
    setError('')
    setNotice('')
    try {
      await operation()
      setNotice(message)
      return true
    } catch (error) {
      console.error('Grocery operation failed', error)
      setError(getErrorMessage(error))
      return false
    } finally {
      setIsBusy(false)
    }
  }
  const data = household.data
  // List changes apply on this device immediately and sync in the background, so they never
  // wait on the network or lock the screen. A rejected write is rolled back by Firestore.
  const changeList = (itemId: string, action: ListAction): Promise<boolean> => {
    if (!data) return Promise.resolve(false)
    setError('')
    setNotice('')
    return updateSelection(data.list, itemId, action).then(
      () => true,
      (error: unknown) => {
        console.error('Grocery list change failed', error)
        setError(getErrorMessage(error))
        return false
      },
    )
  }
  const handleSelect = async (item: CatalogItem): Promise<boolean> => {
    let hasFailed = false
    void changeList(item.id, { type: 'select' }).then((success) => {
      hasFailed = !success
    })
    setExitingItems((items) => [...items, item])
    await new Promise((resolve) => setTimeout(resolve, getExitDurationMs()))
    setExitingItems((items) => items.filter((exiting) => exiting.id !== item.id))
    return !hasFailed
  }
  // Store management and list resets still use server transactions, so they need a live connection.
  // Pending list writes don't block them: transactions read from the server, and gating on
  // hasPendingWrites made these buttons flicker on every selection.
  const disabled = isBusy || !isOnline || household.isFromCache
  const count = data ? Object.keys(data.list.items).length : 0
  const connectionMessage = !isOnline
    ? 'List changes will sync when you reconnect.'
    : household.isFromCache
      ? 'Connecting - showing saved data.'
      : ''
  return (
    // The root is the <main> element, so the sticky bar's containing block spans the whole page.
    <Tabs.Root asChild value={tab} onValueChange={setTab}>
      <main className={`app-shell ${isBusy ? 'is-saving' : ''}`}>
        <div className={`app-bar ${isScrolledDown ? 'is-condensed' : ''}`}>
          <header className="app-header">
            <div className="brand-copy min-w-0">
              <h1 className="app-title">{isOnline ? 'Fearless Buyer' : 'Offline Buyer'}</h1>
              <p className="app-subtitle">{connectionMessage || 'Your weekly haul, in order.'}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                className="header-button"
                disabled={disabled || !data || data.sections.length === 0}
                onClick={() => setIsAddingItem(true)}
                aria-label="Add item"
                title="Add item"
              >
                <Plus size={22} />
              </button>
              <button
                className="header-button"
                disabled={disabled || !data}
                onClick={() => setIsManaging(true)}
                aria-label="Manage store and catalog"
                title="Manage store and catalog"
              >
                <Settings2 size={21} />
              </button>
            </div>
          </header>
          {data && (
            <Tabs.List className="tabs" aria-label="Shopping views">
              <Tabs.Trigger className="tab-button" value="list">
                Grocery List <span className="tab-count">{count}</span>
              </Tabs.Trigger>
              <Tabs.Trigger className="tab-button" value="catalog">
                Catalog
              </Tabs.Trigger>
            </Tabs.List>
          )}
        </div>
        {/* The header shows connection state visually; this announces changes to screen readers. */}
        <div className="sr-only" role="status" aria-live="polite">
          {connectionMessage}
        </div>
        {(error || household.error) && !isLogoutOpen && (
          <div className="error mb-4" role="alert">
            {error || household.error}
            {household.error && (
              <button className="button-quiet ml-2" onClick={household.retry}>
                Retry
              </button>
            )}
          </div>
        )}
        <div className="notice" role="status" aria-live="polite">
          {notice}
        </div>
        {household.isLoading && (
          <p role="status" className="empty-state">
            Loading your items...
          </p>
        )}
        {data && (
          <>
            <Tabs.Content value="list" className="tab-content">
              <GroceryListTab
                data={data}
                isBusy={isBusy}
                isResetDisabled={disabled}
                onChoose={() => setTab('catalog')}
                onComplete={(id, completed) => changeList(id, { type: 'complete', completed })}
                onRemove={(id) => changeList(id, { type: 'remove' })}
                onReset={() => operate(resetList, 'New list ready. Choose your items.')}
              />
            </Tabs.Content>
            <Tabs.Content value="catalog" className="tab-content">
              <CatalogTab
                data={data}
                isBusy={isBusy}
                exitingItems={exitingItems}
                onSelect={handleSelect}
                onManage={() => setIsManaging(true)}
              />
            </Tabs.Content>
          </>
        )}
        {data && isAddingItem && <ItemEditor data={data} onClose={() => setIsAddingItem(false)} />}
        {data && isManaging && (
          <StoreManager data={data} isDisabled={disabled} onClose={() => setIsManaging(false)} />
        )}
        <footer className="app-footer">
          <p>Made for your household. No aisle numbers required.</p>
          <button
            className="button-quiet mt-2"
            disabled={isBusy}
            onClick={() => {
              setError('')
              setIsLogoutOpen(true)
            }}
          >
            <LogOut size={18} aria-hidden="true" />
            Sign out
          </button>
        </footer>
        <Modal
          isOpen={isLogoutOpen}
          title="Sign out?"
          description="Your list will be here when you sign back in."
          onClose={() => {
            if (!isBusy) setIsLogoutOpen(false)
          }}
        >
          {error && (
            <p className="error mb-3" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button className="button-quiet" disabled={isBusy} onClick={() => setIsLogoutOpen(false)}>
              Stay signed in
            </button>
            <button
              className="button-primary"
              disabled={isBusy}
              onClick={() => {
                void operate(() => signOut(auth))
              }}
            >
              Sign out
            </button>
          </div>
        </Modal>
      </main>
    </Tabs.Root>
  )
}

export const App = () => {
  const { user, isLoading, error } = useAuth()
  if (error)
    return (
      <main className="login-shell">
        <p className="error" role="alert">
          {error}
        </p>
      </main>
    )
  if (isLoading)
    return (
      <main className="login-shell" role="status">
        Checking your login...
      </main>
    )
  return user ? <HouseholdApp key={user.uid} userId={user.uid} /> : <LoginPage />
}
