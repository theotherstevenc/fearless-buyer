import { useEffect, useState } from 'react'

import { FolderInput, Trash2 } from 'lucide-react'

import { getErrorMessage, groupGroceries } from '../lib/groceries'
import type { CatalogItem, HouseholdData, Section } from '../schemas/models'
import {
  deleteCatalogItem,
  removeEmptySection,
  reorder,
  saveCatalogItem,
  saveSection,
} from '../services/groceries'
import { InlineNameInput } from './InlineNameInput'
import { ManageHeading } from './ManageHeading'
import { Modal } from './Modal'
import { MoveItemDialog } from './MoveItemDialog'
import { RenameButton } from './RenameButton'
import { SortableRows } from './SortableRows'

const UNTITLED_ITEM_NAME = 'Untitled item'
const UNTITLED_SECTION_NAME = 'Untitled section'

const sectionRenameButtonId = (sectionId: string): string => `manage-section-rename-${sectionId}`
const itemRenameButtonId = (itemId: string): string => `manage-item-rename-${itemId}`
const sectionRenameFormId = (sectionId: string): string => `manage-section-rename-form-${sectionId}`
const itemRenameFormId = (itemId: string): string => `manage-item-rename-form-${itemId}`
const itemMoveButtonId = (itemId: string): string => `manage-item-move-${itemId}`
const MOVED_ITEM_HIGHLIGHT_MS = 2000

interface StoreManagerProps {
  data: HouseholdData
  isDisabled: boolean
  onClose: () => void
}

export const StoreManager = ({ data, isDisabled, onClose }: StoreManagerProps) => {
  const [editingSectionId, setEditingSectionId] = useState<string | undefined>()
  const [editingItemId, setEditingItemId] = useState<string | undefined>()
  const [movingItem, setMovingItem] = useState<CatalogItem | undefined>()
  const [deletingItem, setDeletingItem] = useState<CatalogItem | undefined>()
  const [deletingSection, setDeletingSection] = useState<Section | undefined>()
  const [pendingFocusId, setPendingFocusId] = useState<string | undefined>()
  const [movedItem, setMovedItem] = useState<{ id: string; sectionId: string } | undefined>()
  const [announcement, setAnnouncement] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const groups = groupGroceries(data.sections, data.catalog, data.list, 'manage')
  const disabled = isBusy || isDisabled
  const isEditingName = !!editingSectionId || !!editingItemId
  // Inline edits unmount their input, so return keyboard focus to the control that started them.
  useEffect(() => {
    if (!pendingFocusId) return
    document.getElementById(pendingFocusId)?.focus()
    setPendingFocusId(undefined)
  }, [pendingFocusId])
  const isMovedItemPlaced = data.catalog.some(
    (item) => item.id === movedItem?.id && item.sectionId === movedItem.sectionId,
  )
  // Once the moved item renders in its new section and the move dialog has closed, bring it into
  // view and focus it so the change is easy to confirm, then let the highlight fade.
  useEffect(() => {
    if (!movedItem || !isMovedItemPlaced || movingItem) return
    // Runs after the closing dialog restores focus, so the moved item keeps it.
    const focusTimer = setTimeout(() => {
      const moveButton = document.getElementById(itemMoveButtonId(movedItem.id))
      moveButton?.closest('.manage-row')?.scrollIntoView({ block: 'nearest' })
      moveButton?.focus({ preventScroll: true })
    }, 0)
    const highlightTimer = setTimeout(() => setMovedItem(undefined), MOVED_ITEM_HIGHLIGHT_MS)
    return () => {
      clearTimeout(focusTimer)
      clearTimeout(highlightTimer)
    }
  }, [isMovedItemPlaced, movedItem, movingItem])
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
  const handleSectionAdd = async () => {
    let newSectionId = ''
    const isSaved = await operate(async () => {
      newSectionId = await saveSection(UNTITLED_SECTION_NAME, data.sections, data.revision)
    })
    if (isSaved) {
      setEditingItemId(undefined)
      setEditingSectionId(newSectionId)
    }
  }
  const handleItemAdd = async (section: Section) => {
    let newItemId = ''
    const isSaved = await operate(async () => {
      newItemId = await saveCatalogItem(UNTITLED_ITEM_NAME, section.id, data.catalog, data.revision)
    })
    if (isSaved) {
      setEditingSectionId(undefined)
      setEditingItemId(newItemId)
    }
  }
  return (
    <Modal
      isOpen
      hasDisplayTitle
      hasInsetScrollArea
      title="Your store, your route"
      onClose={() => {
        // Escape cancels an inline edit instead of closing the whole dialog.
        if (!isBusy && !isEditingName) onClose()
      }}
    >
      <p className="sr-only" role="status">
        {announcement}
      </p>
      <div className={`space-y-5 ${isBusy ? 'is-saving' : ''}`} aria-busy={isBusy}>
        {error && !deletingItem && !deletingSection && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <section className="manage-section" aria-label="Store sections">
          <ManageHeading
            title="Sections"
            actionLabel="Add section"
            actionAccessibleLabel="Add section"
            isDisabled={disabled}
            onAction={() => void handleSectionAdd()}
          />
          {groups.length === 0 ? (
            <p className="manage-empty">Add your first section to start organizing your items.</p>
          ) : (
            <SortableRows
              isBusy={disabled}
              rows={groups.map(({ section }) => ({
                id: section.id,
                label: section.name,
                editor:
                  editingSectionId === section.id ? (
                    <InlineNameInput
                      formId={sectionRenameFormId(section.id)}
                      initialName={section.name}
                      label={`Rename section ${section.name}`}
                      onSave={(name) =>
                        operate(async () => {
                          await saveSection(name, data.sections, data.revision, section)
                        })
                      }
                      onClose={(shouldRestoreFocus) => {
                        setEditingSectionId(undefined)
                        if (shouldRestoreFocus) setPendingFocusId(sectionRenameButtonId(section.id))
                      }}
                    />
                  ) : undefined,
                actions: (
                  <>
                    <RenameButton
                      id={sectionRenameButtonId(section.id)}
                      name={section.name}
                      formId={sectionRenameFormId(section.id)}
                      isEditing={editingSectionId === section.id}
                      isDisabled={disabled}
                      onEdit={() => {
                        setError('')
                        setEditingItemId(undefined)
                        setEditingSectionId(section.id)
                      }}
                    />
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
          )}
        </section>
        {groups.map(({ section, items }) => (
          <section key={section.id} className="manage-section" aria-label={`${section.name} items`}>
            <ManageHeading
              title={section.name}
              actionLabel="Add item"
              actionAccessibleLabel={`Add item to ${section.name}`}
              isDisabled={disabled}
              onAction={() => void handleItemAdd(section)}
            />
            {items.length > 0 ? (
              <SortableRows
                isBusy={disabled}
                rows={items.map((item) => ({
                  id: item.id,
                  isHighlighted: isMovedItemPlaced && movedItem?.id === item.id,
                  label: item.name,
                  editor:
                    editingItemId === item.id ? (
                      <InlineNameInput
                        formId={itemRenameFormId(item.id)}
                        initialName={item.name}
                        label={`Rename ${item.name}`}
                        onSave={(name) =>
                          operate(async () => {
                            await saveCatalogItem(name, item.sectionId, data.catalog, data.revision, item)
                          })
                        }
                        onClose={(shouldRestoreFocus) => {
                          setEditingItemId(undefined)
                          if (shouldRestoreFocus) setPendingFocusId(itemRenameButtonId(item.id))
                        }}
                      />
                    ) : undefined,
                  actions: (
                    <>
                      <RenameButton
                        id={itemRenameButtonId(item.id)}
                        name={item.name}
                        formId={itemRenameFormId(item.id)}
                        isEditing={editingItemId === item.id}
                        isDisabled={disabled}
                        onEdit={() => {
                          setError('')
                          setEditingSectionId(undefined)
                          setEditingItemId(item.id)
                        }}
                      />
                      <button
                        id={itemMoveButtonId(item.id)}
                        className="icon-button"
                        disabled={disabled}
                        aria-label={`Move ${item.name} to another section`}
                        onClick={() => setMovingItem(item)}
                      >
                        <FolderInput size={16} />
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
      </div>
      {movingItem && (
        <MoveItemDialog
          data={data}
          item={movingItem}
          onMoved={(section) => {
            setMovedItem({ id: movingItem.id, sectionId: section.id })
            setAnnouncement(`Moved ${movingItem.name} to ${section.name}.`)
          }}
          onClose={() => setMovingItem(undefined)}
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
                if (editingSectionId === deletingSection.id) setEditingSectionId(undefined)
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
