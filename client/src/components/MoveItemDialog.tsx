import { useState } from 'react'

import { useConfirmThenClose } from '../hooks/useConfirmThenClose'
import { getErrorMessage } from '../lib/groceries'
import type { CatalogItem, HouseholdData, Section } from '../schemas/models'
import { saveCatalogItem } from '../services/groceries'
import { Modal } from './Modal'
import { SectionPicker } from './SectionPicker'

interface MoveItemDialogProps {
  data: HouseholdData
  item: CatalogItem
  onMoved: (section: Section) => void
  onClose: () => void
}

export const MoveItemDialog = ({ data, item, onMoved, onClose }: MoveItemDialogProps) => {
  const sections = [...data.sections].sort((a, b) => a.sortOrder - b.sortOrder)
  const [pendingSectionId, setPendingSectionId] = useState<string | undefined>()
  const [error, setError] = useState('')
  const isBusy = !!pendingSectionId
  const { isOpen, confirmedId, confirmThenClose } = useConfirmThenClose(onClose)
  const handlePick = async (section: Section) => {
    setPendingSectionId(section.id)
    setError('')
    try {
      await saveCatalogItem(item.name, section.id, data.catalog, data.revision, item)
      onMoved(section)
      confirmThenClose(section.id)
    } catch (error) {
      console.error('Moving item failed', error)
      setError(getErrorMessage(error))
      setPendingSectionId(undefined)
    }
  }
  return (
    <Modal
      isOpen={isOpen}
      title={`Move ${item.name}`}
      onClose={() => {
        if (!isBusy) onClose()
      }}
    >
      <div className={`space-y-5 ${isBusy ? 'is-saving' : ''}`} aria-busy={isBusy}>
        {error && (
          <p id="move-item-error" className="error" role="alert">
            {error}
          </p>
        )}
        <SectionPicker
          legend="Store section"
          isLegendHidden
          sections={sections}
          currentSectionId={item.sectionId}
          pendingSectionId={pendingSectionId}
          savedSectionId={confirmedId}
          savedNote="Moved"
          isDisabled={isBusy}
          isFirstChoiceAutoFocused
          describedBy={error ? 'move-item-error' : undefined}
          getActionLabel={(section) => `Move ${item.name} to ${section.name}`}
          onPick={(section) => void handlePick(section)}
        />
      </div>
    </Modal>
  )
}
