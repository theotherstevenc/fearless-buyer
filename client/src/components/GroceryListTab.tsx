import { Check, RotateCcw, ShoppingBasket, X } from 'lucide-react'
import { useState } from 'react'

import { groupGroceries } from '../lib/groceries'
import type { HouseholdData } from '../schemas/models'
import { Modal } from './Modal'

interface GroceryListTabProps {
  data: HouseholdData
  isBusy: boolean
  onComplete: (id: string, completed: boolean) => Promise<boolean>
  onRemove: (id: string) => Promise<boolean>
  onReset: () => Promise<boolean>
  onChoose: () => void
}

export const GroceryListTab = ({
  data,
  isBusy,
  onComplete,
  onRemove,
  onReset,
  onChoose,
}: GroceryListTabProps) => {
  const [isResetOpen, setIsResetOpen] = useState(false)
  // Items follow store-section order; sections themselves are not shown.
  const items = groupGroceries(data.sections, data.catalog, data.list, 'list').flatMap((group) => group.items)
  const selected = Object.values(data.list.items)
  const completed = selected.filter((item) => item.completed).length
  return (
    <section aria-label="Grocery List">
      {items.length > 0 && (
        <ul className="rows item-list">
          {items.map((item) => {
            const selection = data.list.items[item.id]
            return (
              <li key={item.id} className={`grocery-row ${selection.completed ? 'row-completed' : ''}`}>
                <button
                  role="checkbox"
                  aria-checked={selection.completed}
                  aria-label={`${item.name} in cart`}
                  className="check-item"
                  disabled={isBusy}
                  onClick={() => {
                    void onComplete(item.id, !selection.completed)
                  }}
                >
                  <span className="check-box">
                    {selection.completed && <Check size={17} aria-hidden="true" />}
                  </span>
                  <span className="item-name">{item.name}</span>
                  {selection.completed && <span className="sr-only">Complete</span>}
                </button>
                <button
                  className="icon-button text-muted"
                  disabled={isBusy}
                  onClick={() => {
                    void onRemove(item.id)
                  }}
                  aria-label={`Remove ${item.name} from Grocery List`}
                >
                  <X size={18} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {items.length > 0 && (
        <div className="list-footer">
          <p>
            {completed} of {selected.length} in cart
          </p>
          <button className="button-primary" disabled={isBusy} onClick={() => setIsResetOpen(true)}>
            <RotateCcw size={18} aria-hidden="true" />
            New list
          </button>
        </div>
      )}
      {items.length === 0 && (
        <div className="empty-state">
          <ShoppingBasket size={32} className="mx-auto mb-3 text-muted" aria-hidden="true" />
          <h3 className="font-semibold">A fresh list starts here</h3>
          <p className="text-muted mt-2">Choose what you need from your catalog.</p>
          <button className="button-primary mt-5" onClick={onChoose}>
            Choose items
          </button>
        </div>
      )}
      <Modal
        isOpen={isResetOpen}
        title="Start a new list?"
        description="This clears every selected item and checkmark for both of you. Your catalog and store order stay unchanged."
        onClose={() => {
          if (!isBusy) setIsResetOpen(false)
        }}
      >
        <div className="flex justify-end gap-2">
          <button className="button-quiet" disabled={isBusy} onClick={() => setIsResetOpen(false)}>
            Keep current list
          </button>
          <button
            className="button-primary"
            disabled={isBusy}
            onClick={async () => {
              if (await onReset()) setIsResetOpen(false)
            }}
          >
            Start new list
          </button>
        </div>
      </Modal>
    </section>
  )
}
