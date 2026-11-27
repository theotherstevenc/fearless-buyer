import { useState } from 'react'
import type { FormEvent } from 'react'

import { getErrorMessage } from '../lib/groceries'
import { nameSchema } from '../schemas/models'
import type { CatalogItem, HouseholdData } from '../schemas/models'
import { saveCatalogItem } from '../services/groceries'
import { Modal } from './Modal'

interface ItemEditorProps {
  data: HouseholdData
  item?: CatalogItem
  onClose: () => void
}

export const ItemEditor = ({ data, item, onClose }: ItemEditorProps) => {
  const sections = [...data.sections].sort((a, b) => a.sortOrder - b.sortOrder)
  const [name, setName] = useState(item?.name ?? '')
  const [sectionId, setSectionId] = useState(item?.sectionId ?? sections[0]?.id ?? '')
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    const parsed = nameSchema.safeParse(name)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    if (!sectionId) {
      setError('Create a section in Manage store first.')
      return
    }
    setIsBusy(true)
    setError('')
    try {
      await saveCatalogItem(parsed.data, sectionId, data.catalog, data.revision, item)
      onClose()
    } catch (error) {
      console.error('Catalog save failed', error)
      setError(getErrorMessage(error))
    } finally {
      setIsBusy(false)
    }
  }
  return (
    <Modal
      isOpen
      hasDisplayTitle
      title={item ? 'Edit item' : 'What else sounds good?'}
      onClose={() => {
        if (!isBusy) onClose()
      }}
    >
      <form onSubmit={handleSave} className="space-y-5">
        <label className="field">
          Name
          <input
            autoFocus
            required
            maxLength={100}
            autoComplete="off"
            data-1p-ignore
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-describedby={error ? 'item-error' : undefined}
          />
        </label>
        <label className="field">
          Store section
          <select required value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
            <option value="" disabled>
              Choose a section
            </option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p id="item-error" className="error" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="button-quiet" disabled={isBusy} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button-primary" disabled={isBusy}>
            {isBusy ? 'Saving...' : 'Save item'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
