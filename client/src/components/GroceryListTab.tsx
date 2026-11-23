import { Check, ShoppingBasket, X } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'

import { groupGroceries } from '../lib/groceries'
import { selectionSchema } from '../schemas/models'
import type { CatalogItem, HouseholdData } from '../schemas/models'
import { Modal } from './Modal'

interface GroceryListTabProps {
  data: HouseholdData
  isBusy: boolean
  onComplete: (id: string, completed: boolean) => Promise<boolean>
  onRemove: (id: string) => Promise<boolean>
  onQuantity: (id: string, quantity: number) => Promise<boolean>
  onReset: () => Promise<boolean>
  onChoose: () => void
}

export const GroceryListTab = ({
  data,
  isBusy,
  onComplete,
  onRemove,
  onQuantity,
  onReset,
  onChoose,
}: GroceryListTabProps) => {
  const [quantityItem, setQuantityItem] = useState<CatalogItem | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [quantityError, setQuantityError] = useState('')
  const [isResetOpen, setIsResetOpen] = useState(false)
  const groups = groupGroceries(data.sections, data.catalog, data.list, 'list')
  const selected = Object.values(data.list.items)
  const completed = selected.filter((item) => item.completed).length
  const handleQuantity = async (event: FormEvent) => {
    event.preventDefault()
    const result = selectionSchema.shape.quantity.safeParse(Number(quantity))
    if (!result.success) {
      setQuantityError('Enter a whole number of at least 1.')
      return
    }
    if (quantityItem && (await onQuantity(quantityItem.id, result.data))) setQuantityItem(null)
  }
  return (
    <section aria-label="Grocery List">
      <div className="tab-heading">
        <div>
          <h2 className="text-xl font-semibold">Grocery List</h2>
          <p className="text-muted text-sm mt-1">
            {completed} of {selected.length} items in your cart
          </p>
        </div>
        <button
          className="button-quiet"
          disabled={isBusy || selected.length === 0}
          onClick={() => setIsResetOpen(true)}
        >
          New list
        </button>
      </div>
      {groups.map(({ section, items }) => (
        <section className="grocery-section" key={section.id} aria-labelledby={`list-${section.id}`}>
          <h3 className="section-heading" id={`list-${section.id}`}>
            {section.name}
            <span>{items.length}</span>
          </h3>
          <ul className="rows">
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
                    className={`quantity-button ${selection.quantity > 1 ? 'has-quantity' : ''}`}
                    aria-label={`Change quantity for ${item.name}, currently ${selection.quantity}`}
                    disabled={isBusy}
                    onClick={() => {
                      setQuantityItem(item)
                      setQuantity(String(selection.quantity))
                      setQuantityError('')
                    }}
                  >
                    {selection.quantity > 1 ? `×${selection.quantity}` : <span aria-hidden="true">Qty</span>}
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
        </section>
      ))}
      {groups.length === 0 && (
        <div className="empty-state">
          <ShoppingBasket size={32} className="mx-auto mb-3 text-muted" aria-hidden="true" />
          <h3 className="font-semibold">A fresh list starts here</h3>
          <p className="text-muted mt-2">Choose what you need from your catalog.</p>
          <button className="button-primary mt-5" onClick={onChoose}>
            Choose groceries
          </button>
        </div>
      )}
      {quantityItem && (
        <Modal
          isOpen
          title={`Quantity: ${quantityItem.name}`}
          description="This quantity applies to the current list only."
          onClose={() => {
            if (!isBusy) setQuantityItem(null)
          }}
        >
          <form onSubmit={handleQuantity} className="space-y-5">
            <label className="field">
              Quantity
              <input
                autoFocus
                inputMode="numeric"
                type="number"
                min={1}
                step={1}
                required
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                aria-describedby={quantityError ? 'quantity-error' : undefined}
              />
            </label>
            {quantityError && (
              <p id="quantity-error" role="alert" className="error">
                {quantityError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="button-quiet"
                disabled={isBusy}
                onClick={() => setQuantityItem(null)}
              >
                Cancel
              </button>
              <button type="submit" className="button-primary" disabled={isBusy}>
                Save quantity
              </button>
            </div>
          </form>
        </Modal>
      )}
      <Modal
        isOpen={isResetOpen}
        title="Start a new list?"
        description="This clears every selected grocery, quantity, and checkmark for both of you. Your catalog and store order stay unchanged."
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
