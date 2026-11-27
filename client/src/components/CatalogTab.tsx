import { Plus } from 'lucide-react'
import { useRef } from 'react'

import { groupGroceries } from '../lib/groceries'
import type { CatalogItem, HouseholdData } from '../schemas/models'

interface CatalogTabProps {
  data: HouseholdData
  isBusy: boolean
  exitingItems: CatalogItem[]
  onSelect: (item: CatalogItem) => Promise<boolean>
  onManage: () => void
}

export const CatalogTab = ({ data, isBusy, exitingItems, onSelect, onManage }: CatalogTabProps) => {
  const sectionRef = useRef<HTMLElement>(null)
  const exitingIds = new Set(exitingItems.map((item) => item.id))
  const visibleList = { items: { ...data.list.items } }
  for (const id of exitingIds) delete visibleList.items[id]
  const catalogIds = new Set(data.catalog.map((item) => item.id))
  const catalog = [...data.catalog, ...exitingItems.filter((item) => !catalogIds.has(item.id))]
  // Items follow store-section order; sections themselves are not shown.
  const items = groupGroceries(data.sections, catalog, visibleList, 'catalog').flatMap((group) => group.items)
  const handleSelect = async (item: CatalogItem, button: HTMLButtonElement) => {
    const hadFocus = document.activeElement === button
    const rowButtons = () => [
      ...(sectionRef.current?.querySelectorAll<HTMLButtonElement>('li:not(.row-exiting) .select-item') ?? []),
    ]
    const index = rowButtons().indexOf(button)
    const success = await onSelect(item)
    if (!success) button.focus()
    else if (hadFocus && (!document.activeElement || document.activeElement === document.body)) {
      // Keep keyboard users in place: focus the row that took the selected row's spot.
      const remaining = rowButtons()
      const next = remaining[Math.min(Math.max(index, 0), remaining.length - 1)]
      if (next) next.focus()
      else sectionRef.current?.focus()
    }
  }
  return (
    <section ref={sectionRef} tabIndex={-1} className="outline-none" aria-label="Item catalog">
      {items.length > 0 && (
        <ul className="rows item-list">
          {items.map((item) => (
            <li key={item.id} className={`catalog-row ${exitingIds.has(item.id) ? 'row-exiting' : ''}`}>
              <div className="catalog-row-clip">
                <div className="catalog-row-body">
                  <button
                    className="select-item"
                    disabled={isBusy}
                    onClick={(event) => {
                      void handleSelect(item, event.currentTarget)
                    }}
                    aria-label={`Add ${item.name} to Grocery List`}
                  >
                    <span className="add-circle">
                      <Plus size={18} aria-hidden="true" />
                    </span>
                    <span>{item.name}</span>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {items.length === 0 && (
        <div className="empty-state">
          <h3 className="font-semibold">
            {data.catalog.length ? "You're all set. Happy shopping!" : 'Make this your store'}
          </h3>
          {data.catalog.length === 0 && (
            <>
              <p className="text-muted mt-2">
                Create your first section, then add your usual items. Aisle numbers are optional.
              </p>
              <button className="button-primary mt-5" onClick={onManage}>
                Set up store sections
              </button>
            </>
          )}
        </div>
      )}
    </section>
  )
}
