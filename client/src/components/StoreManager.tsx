import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'

import { getErrorMessage, groupGroceries } from '../lib/groceries'
import type { CatalogItem, HouseholdData, Section } from '../schemas/models'
import { removeEmptySection, reorder, saveSection } from '../services/groceries'
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
      title="Manage your store"
      description="Arrange sections in your walking order, then groceries within each section. This includes items already on your list."
      onClose={() => {
        if (!isBusy) onClose()
      }}
    >
      <div className="space-y-5">
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <form onSubmit={handleSectionSave} className="space-y-3">
          <label className="field">
            {editingSection ? 'Rename section' : 'New section'}
            <input
              required
              maxLength={100}
              placeholder="For example: Produce"
              value={sectionName}
              onChange={(event) => setSectionName(event.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button className="button-primary" type="submit" disabled={disabled}>
              {editingSection ? 'Save section' : 'Add section'}
            </button>
            {editingSection && (
              <button
                className="button-quiet"
                type="button"
                onClick={() => {
                  setEditingSection(undefined)
                  setSectionName('')
                }}
              >
                Cancel rename
              </button>
            )}
          </div>
        </form>
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
                      className="icon-button"
                      disabled={disabled || section.itemCount > 0}
                      title={
                        section.itemCount ? 'Move groceries out before removing this section' : undefined
                      }
                      aria-label={`Remove empty section ${section.name}`}
                      onClick={() => {
                        void operate(() => removeEmptySection(section, data.revision))
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ),
              }))}
              onReorder={(ids) => {
                void operate(() => reorder('sections', ids, data.revision))
              }}
            />
            <button className="button-quiet" disabled={disabled} onClick={() => setIsAddingItem(true)}>
              Add grocery to catalog
            </button>
            {groups.map(({ section, items }) => (
              <section key={section.id}>
                <h3 className="section-heading">{section.name}</h3>
                <SortableRows
                  isBusy={disabled}
                  rows={items.map((item) => ({
                    id: item.id,
                    label: item.name,
                    actions: (
                      <button
                        className="icon-button"
                        disabled={disabled}
                        aria-label={`Edit ${item.name}`}
                        onClick={() => setEditingItem(item)}
                      >
                        <Pencil size={16} />
                      </button>
                    ),
                  }))}
                  onReorder={(ids) => {
                    void operate(() => reorder('catalog', ids, data.revision))
                  }}
                />
                {items.length === 0 && (
                  <p className="text-muted text-sm">No groceries in this section yet.</p>
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
    </Modal>
  )
}
