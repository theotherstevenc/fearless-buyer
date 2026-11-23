import * as Tabs from '@radix-ui/react-tabs'
import { signOut } from 'firebase/auth'
import { LogOut, Settings2, ShoppingBasket } from 'lucide-react'
import { useState } from 'react'

import { CatalogTab } from './components/CatalogTab'
import { GroceryListTab } from './components/GroceryListTab'
import { ItemEditor } from './components/ItemEditor'
import { LoginPage } from './components/LoginPage'
import { StoreManager } from './components/StoreManager'
import { useAuth } from './context/useAuth'
import { useConnectivity } from './hooks/useConnectivity'
import { useHousehold } from './hooks/useHousehold'
import { auth } from './lib/firebase'
import { getErrorMessage } from './lib/groceries'
import type { CatalogItem } from './schemas/models'
import { resetList, updateSelection } from './services/groceries'

const EXIT_DURATION_MS = 220

interface HouseholdAppProps {
  userId: string
}

const HouseholdApp = ({ userId }: HouseholdAppProps) => {
  const household = useHousehold(userId)
  const isOnline = useConnectivity()
  const [tab, setTab] = useState('catalog')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [undoId, setUndoId] = useState<string | null>(null)
  const [exitingItem, setExitingItem] = useState<CatalogItem | null>(null)
  const [editingItem, setEditingItem] = useState<CatalogItem | undefined>()
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [isManaging, setIsManaging] = useState(false)

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
  const handleSelect = async (item: CatalogItem): Promise<boolean> => {
    setExitingItem(item)
    const start = performance.now()
    const success = await operate(async () => {
      await updateSelection(item.id, { type: 'select' })
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, EXIT_DURATION_MS - (performance.now() - start))),
      )
    }, `${item.name} added to Grocery List.`)
    setExitingItem(null)
    if (success) setUndoId(item.id)
    return success
  }
  const handleLogout = () => {
    void operate(() => signOut(auth))
  }
  const data = household.data
  const disabled = isBusy || !isOnline || household.isFromCache || household.hasPendingWrites
  const count = data ? Object.keys(data.list.items).length : 0
  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="flex items-center gap-3">
          <ShoppingBasket size={26} aria-hidden="true" />
          <div>
            <h1 className="text-xl font-semibold">Fearless Buyer</h1>
            <p className="text-sm opacity-80">Your weekly haul, in order.</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            className="header-button"
            disabled={disabled || !data}
            onClick={() => setIsManaging(true)}
            aria-label="Manage store and catalog"
          >
            <Settings2 size={21} />
          </button>
          <button className="header-button" disabled={isBusy} onClick={handleLogout} aria-label="Sign out">
            <LogOut size={21} />
          </button>
        </div>
      </header>
      <div className="sync-status" role="status" aria-live="polite">
        {!isOnline
          ? 'Offline - reconnect to make changes.'
          : isBusy || household.hasPendingWrites
            ? 'Saving...'
            : household.isFromCache
              ? 'Connecting - shown data may be cached.'
              : 'Synced with your household'}
      </div>
      {(error || household.error) && (
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
        {undoId && data?.list.items[undoId] && (
          <button
            className="button-quiet ml-2"
            disabled={disabled}
            onClick={async () => {
              if (
                await operate(() => updateSelection(undoId, { type: 'remove' }), 'Item returned to catalog.')
              )
                setUndoId(null)
            }}
          >
            Undo last addition
          </button>
        )}
      </div>
      {household.isLoading && (
        <p role="status" className="empty-state">
          Loading your groceries...
        </p>
      )}
      {data && (
        <Tabs.Root value={tab} onValueChange={setTab}>
          <Tabs.List className="tabs" aria-label="Grocery views">
            <Tabs.Trigger className="tab-button" value="catalog">
              Catalog
            </Tabs.Trigger>
            <Tabs.Trigger className="tab-button" value="list">
              Grocery List <span className="tab-count">{count}</span>
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="catalog" className="tab-content">
            <CatalogTab
              data={data}
              isBusy={disabled}
              exitingItem={exitingItem}
              onSelect={handleSelect}
              onAdd={() => setIsAddingItem(true)}
              onEdit={setEditingItem}
              onManage={() => setIsManaging(true)}
            />
          </Tabs.Content>
          <Tabs.Content value="list" className="tab-content">
            <GroceryListTab
              data={data}
              isBusy={disabled}
              onChoose={() => setTab('catalog')}
              onComplete={(id, completed) =>
                operate(() => updateSelection(id, { type: 'complete', completed }))
              }
              onRemove={(id) =>
                operate(() => updateSelection(id, { type: 'remove' }), 'Item returned to catalog.')
              }
              onQuantity={(id, quantity) =>
                operate(() => updateSelection(id, { type: 'quantity', quantity }), 'Quantity saved.')
              }
              onReset={() => operate(resetList, 'New list ready. Choose your groceries.')}
            />
          </Tabs.Content>
        </Tabs.Root>
      )}
      {data && (editingItem || isAddingItem) && (
        <ItemEditor
          data={data}
          item={editingItem}
          onClose={() => {
            setEditingItem(undefined)
            setIsAddingItem(false)
          }}
        />
      )}
      {data && isManaging && (
        <StoreManager data={data} isDisabled={disabled} onClose={() => setIsManaging(false)} />
      )}
      <footer className="app-footer">Made for your household. No aisle numbers required.</footer>
    </main>
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
