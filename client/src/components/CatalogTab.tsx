import { Pencil, Plus, Search } from 'lucide-react'
import { useRef, useState } from 'react'

import { groupGroceries } from '../lib/groceries'
import type { CatalogItem, HouseholdData } from '../schemas/models'

interface CatalogTabProps {
  data: HouseholdData
  isBusy: boolean
  exitingItem: CatalogItem | null
  onSelect: (item: CatalogItem) => Promise<boolean>
  onAdd: () => void
  onEdit: (item: CatalogItem) => void
  onManage: () => void
}

export const CatalogTab = ({
  data,
  isBusy,
  exitingItem,
  onSelect,
  onAdd,
  onEdit,
  onManage,
}: CatalogTabProps) => {
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const visibleList = { items: { ...data.list.items } }
  if (exitingItem) delete visibleList.items[exitingItem.id]
  const catalog =
    exitingItem && !data.catalog.some((item) => item.id === exitingItem.id)
      ? [...data.catalog, exitingItem]
      : data.catalog
  const groups = groupGroceries(data.sections, catalog, visibleList, 'catalog', search)
  const handleSelect = async (item: CatalogItem, button: HTMLButtonElement) => {
    const hadFocus = document.activeElement === button
    const success = await onSelect(item)
    if (!success) button.focus()
    else if (hadFocus && (!document.activeElement || document.activeElement === document.body))
      searchRef.current?.focus()
  }
  return (
    <section aria-label="Grocery catalog">
      <div className="tab-heading">
        <div>
          <h2 className="text-xl font-semibold">Choose your groceries</h2>
          <p className="text-muted text-sm mt-1">Tap to move an item to your list.</p>
        </div>
        <button className="button-primary" onClick={onAdd} disabled={isBusy || data.sections.length === 0}>
          <Plus size={18} aria-hidden="true" />
          Add item
        </button>
      </div>
      <label className="search-field">
        <Search size={20} aria-hidden="true" />
        <span className="sr-only">Search groceries</span>
        <input
          ref={searchRef}
          type="search"
          value={search}
          placeholder="Search your groceries"
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      {groups.map(({ section, items }) => (
        <section className="grocery-section" key={section.id} aria-labelledby={`catalog-${section.id}`}>
          <h3 className="section-heading" id={`catalog-${section.id}`}>
            {section.name}
            <span>{items.length}</span>
          </h3>
          <ul className="rows">
            {items.map((item) => (
              <li key={item.id} className={`grocery-row ${exitingItem?.id === item.id ? 'row-exiting' : ''}`}>
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
                <button
                  className="icon-button text-muted"
                  disabled={isBusy}
                  onClick={() => onEdit(item)}
                  aria-label={`Edit ${item.name}`}
                >
                  <Pencil size={17} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {groups.length === 0 && (
        <div className="empty-state">
          <h3 className="font-semibold">
            {search
              ? 'No matching groceries'
              : data.catalog.length
                ? 'Everything is on your list'
                : 'Make this your store'}
          </h3>
          <p className="text-muted mt-2">
            {search
              ? 'Try another name.'
              : data.catalog.length
                ? 'Open Grocery List to start shopping.'
                : 'Create your first section, then add your usual groceries. Aisle numbers are optional.'}
          </p>
          {data.catalog.length === 0 && (
            <button className="button-primary mt-5" onClick={onManage}>
              Set up store sections
            </button>
          )}
        </div>
      )}
    </section>
  )
}
