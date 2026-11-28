import { useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { useConfirmThenClose } from '../hooks/useConfirmThenClose'
import { getErrorMessage } from '../lib/groceries'
import { nameSchema } from '../schemas/models'
import type { HouseholdData, Section } from '../schemas/models'
import { saveCatalogItem } from '../services/groceries'
import { Modal } from './Modal'
import { SectionPicker } from './SectionPicker'

interface ItemEditorProps {
  data: HouseholdData
  onClose: () => void
}

export const ItemEditor = ({ data, onClose }: ItemEditorProps) => {
  const sections = [...data.sections].sort((a, b) => a.sortOrder - b.sortOrder)
  const [name, setName] = useState('')
  const [pendingSectionId, setPendingSectionId] = useState<string | undefined>()
  const [error, setError] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const firstSectionRef = useRef<HTMLButtonElement>(null)
  const isBusy = !!pendingSectionId
  const { isOpen, confirmedId, confirmThenClose } = useConfirmThenClose(onClose)
  const trimmedName = name.trim()
  const validateName = (): string | undefined => {
    const parsed = nameSchema.safeParse(name)
    if (parsed.success) return parsed.data
    setError(parsed.error.issues[0].message)
    nameInputRef.current?.focus()
    return undefined
  }
  // Enter can't pick a section on the user's behalf, so it moves focus to the section choices.
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!validateName()) return
    setError('')
    firstSectionRef.current?.focus()
  }
  const handlePick = async (section: Section) => {
    const validName = validateName()
    if (!validName) return
    setPendingSectionId(section.id)
    setError('')
    try {
      await saveCatalogItem(validName, section.id, data.catalog, data.revision)
      confirmThenClose(section.id)
    } catch (error) {
      console.error('Catalog save failed', error)
      setError(getErrorMessage(error))
      setPendingSectionId(undefined)
    }
  }
  return (
    <Modal
      isOpen={isOpen}
      hasDisplayTitle
      title="What else sounds good?"
      onClose={() => {
        if (!isBusy) onClose()
      }}
    >
      <form onSubmit={handleSubmit} className={`space-y-5 ${isBusy ? 'is-saving' : ''}`} aria-busy={isBusy}>
        <label className="field">
          Name
          <input
            ref={nameInputRef}
            autoFocus
            required
            maxLength={100}
            autoComplete="off"
            enterKeyHint="next"
            data-1p-ignore
            value={name}
            readOnly={isBusy}
            onChange={(event) => setName(event.target.value)}
            aria-describedby={error ? 'item-error' : undefined}
          />
        </label>
        {error && (
          <p id="item-error" className="error" role="alert">
            {error}
          </p>
        )}
        {sections.length > 0 ? (
          <SectionPicker
            legend="Add it to"
            sections={sections}
            pendingSectionId={pendingSectionId}
            savedSectionId={confirmedId}
            savedNote="Added"
            isDisabled={isBusy}
            firstChoiceRef={firstSectionRef}
            getActionLabel={(section) =>
              trimmedName ? `Add ${trimmedName} to ${section.name}` : `Add to ${section.name}`
            }
            onPick={(section) => void handlePick(section)}
          />
        ) : (
          <p className="manage-empty">Create a section in Manage store first.</p>
        )}
      </form>
    </Modal>
  )
}
