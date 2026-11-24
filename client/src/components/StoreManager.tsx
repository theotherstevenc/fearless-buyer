import { useState } from 'react'
import type { FormEvent } from 'react'

import { Pencil, Plus, Trash2 } from 'lucide-react'

import { getErrorMessage, groupGroceries } from '../lib/groceries'
import type { CatalogItem, HouseholdData, Section } from '../schemas/models'
import { deleteCatalogItem, removeEmptySection, reorder, saveSection } from '../services/groceries'
import { ItemEditor } from './ItemEditor'
import { Modal } from './Modal'
import { SortableRows } from './SortableRows'

interface StoreManagerProps {
  data: HouseholdData
  isDisabled: boolean
  onClose: () => void
}

export const StoreManager = ({ data, isDisabled, onClose }: StoreManagerProps) => {
  const [sectionName, setSectionName] = useState('')
  const [editingSection, setEditingSection] = useState<Section | undefined>()
  const [editingItem, setEditingItem] = useState<CatalogItem | undefined>()
  const [deletingItem, setDeletingItem] = useState<CatalogItem | undefined>()
  const [deletingSection, setDeletingSection] = useState<Section | undefined>()
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const groups = groupGroceries(data.sections, data.catalog, data.list, 'manage')
  const disabled = isBusy || isDisabled
  const operate = async (operation: () => Promise<void>): Promise<boolean> => {
    setIsBusy(true)
    setError('')
    try {
      await operation()
      return true
    } catch (error) {
      console.error('Store management failed', error)
      setError(getErrorMessage(error))
      return false
    } finally {
      setIsBusy(false)
    }
  }
  const handleSectionSave = async (event: FormEvent) => {
    event.preventDefault()
    if (await operate(() => saveSection(sectionName, data.sections, data.revision, editingSection))) {
      setSectionName('')
      setEditingSection(undefined)
    }
  }
  return (
    <Modal
      isOpen
      title="Your store, your route"
      description="Arrange sections and items in the order you shop. Hold a name to drag, or use the arrows."
      onClose={() => {
        if (!isBusy) onClose()
      }}
    >
      <div className={`space-y-5 ${isBusy ? 'is-saving' : ''}`} aria-busy={isBusy}>
        {error && !deletingItem && !deletingSection && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <form onSubmit={handleSectionSave} className="space-y-3">
          <div className="section-form">
            <label className="field">
              <span className="sr-only">{editingSection ? 'Rename section' : 'Section name'}</span>
              <input
                required
                maxLength={100}
                autoComplete="off"
                data-1p-ignore
                disabled={disabled}
                placeholder="For example: Produce"
                value={sectionName}
                onChange={(event) => setSectionName(event.target.value)}
              />
            </label>
            <button className="button-primary" type="submit" disabled={disabled}>
              {editingSection ? 'Save section' : 'Add section'}
            </button>
          </div>
          {editingSection && (
            <button
              className="button-quiet"
              type="button"
              disabled={disabled}
              onClick={() => {
                setEditingSection(undefined)
                setSectionName('')
              }}
            >
              Cancel rename
            </button>
          )}
        </form>
        {groups.length === 0 && (
          <p className="manage-empty">Add your first section to start organizing your items.</p>
        )}
        {groups.length > 0 && (
          <>
            <h3 className="font-semibold">Section order</h3>
            <SortableRows
              isBusy={disabled}
              rows={groups.map(({ section }) => ({
                id: section.id,
                label: section.name,
                actions: (
                  <>
                    <button
                      className="icon-button"
                      disabled={disabled}
                      aria-label={`Rename ${section.name}`}
                      onClick={() => {
                        setEditingSection(section)
                        setSectionName(section.name)
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className={`icon-button ${section.itemCount > 0 ? 'is-unavailable' : ''}`}
                      disabled={disabled || section.itemCount > 0}
                      title={section.itemCount ? 'Move items out before removing this section' : undefined}
                      aria-label={`Remove empty section ${section.name}`}
                      onClick={() => {
                        setError('')
                        setDeletingSection(section)
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ),
              }))}
              onReorder={(ids) => operate(() => reorder('sections', ids, data.revision))}
            />
            <button className="button-primary" disabled={disabled} onClick={() => setIsAddingItem(true)}>
              <Plus size={18} aria-hidden="true" />
              Add item
            </button>
            {groups.map(({ section, items }) => (
              <section key={section.id} aria-label={`${section.name} items`}>
                <h3 className="section-heading" title={section.name}>
                  {section.name}
                </h3>
                {items.length > 0 ? (
                  <SortableRows
                    isBusy={disabled}
                    rows={items.map((item) => ({
                      id: item.id,
                      label: item.name,
                      actions: (
                        <>
                          <button
                            className="icon-button"
                            disabled={disabled}
                            aria-label={`Edit ${item.name}`}
                            onClick={() => setEditingItem(item)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="icon-button text-danger"
                            disabled={disabled}
                            aria-label={`Delete ${item.name} from catalog`}
                            onClick={() => {
                              setError('')
                              setDeletingItem(item)
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ),
                    }))}
                    onReorder={(ids) => operate(() => reorder('catalog', ids, data.revision))}
                  />
                ) : (
                  <p className="manage-empty">No items here yet.</p>
                )}
              </section>
            ))}
          </>
        )}
      </div>
      {(editingItem || isAddingItem) && (
        <ItemEditor
          data={data}
          item={editingItem}
          onClose={() => {
            setEditingItem(undefined)
            setIsAddingItem(false)
          }}
        />
      )}
      <Modal
        isOpen={!!deletingSection}
        title={`Delete ${deletingSection?.name ?? 'section'}?`}
        description="This removes the empty section from your store for both of you."
        onClose={() => {
          if (!isBusy) setDeletingSection(undefined)
        }}
      >
        {error && (
          <p role="alert" className="error mb-3">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button className="button-quiet" disabled={disabled} onClick={() => setDeletingSection(undefined)}>
            Keep section
          </button>
          <button
            className="button-danger"
            disabled={disabled}
            onClick={async () => {
              if (
                deletingSection &&
                (await operate(() => removeEmptySection(deletingSection, data.revision)))
              ) {
                if (editingSection?.id === deletingSection.id) {
                  setEditingSection(undefined)
                  setSectionName('')
                }
                setDeletingSection(undefined)
              }
            }}
          >
            Delete section
          </button>
        </div>
      </Modal>
      <Modal
        isOpen={!!deletingItem}
        title={`Delete ${deletingItem?.name ?? 'item'}?`}
        description="This permanently removes the item from your catalog and the current list for both of you."
        onClose={() => {
          if (!isBusy) setDeletingItem(undefined)
        }}
      >
        {error && (
          <p role="alert" className="error mb-3">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button className="button-quiet" disabled={disabled} onClick={() => setDeletingItem(undefined)}>
            Keep item
          </button>
          <button
            className="button-danger"
            disabled={disabled}
            onClick={async () => {
              if (deletingItem && (await operate(() => deleteCatalogItem(deletingItem.id, data.revision)))) {
                setDeletingItem(undefined)
              }
            }}
          >
            Delete item
          </button>
        </div>
      </Modal>
    </Modal>
  )
}
