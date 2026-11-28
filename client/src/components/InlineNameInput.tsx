import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'

interface InlineNameInputProps {
  formId: string
  initialName: string
  label: string
  onSave: (name: string) => Promise<boolean>
  onClose: (shouldRestoreFocus: boolean) => void
}

// Enter, a submit button tied to `formId`, or leaving the field saves; Escape cancels.
// Blank or unchanged names close without saving.
export const InlineNameInput = ({ formId, initialName, label, onSave, onClose }: InlineNameInputProps) => {
  const [name, setName] = useState(initialName)
  const inputRef = useRef<HTMLInputElement>(null)
  const isSavingRef = useRef(false)
  // Unmounting a focused input can fire a late blur; this keeps it from saving a second time.
  const isClosedRef = useRef(false)
  useEffect(() => {
    inputRef.current?.select()
  }, [])
  const close = (shouldRestoreFocus: boolean) => {
    isClosedRef.current = true
    onClose(shouldRestoreFocus)
  }
  const handleCommit = async (shouldRestoreFocus: boolean) => {
    if (isSavingRef.current || isClosedRef.current) return
    const cleanName = name.trim()
    if (!cleanName || cleanName === initialName) {
      close(shouldRestoreFocus)
      return
    }
    isSavingRef.current = true
    const isSaved = await onSave(cleanName)
    isSavingRef.current = false
    if (isSaved) close(shouldRestoreFocus)
    else inputRef.current?.focus()
  }
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void handleCommit(true)
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && !isSavingRef.current) {
      event.preventDefault()
      close(true)
    }
  }
  return (
    <form id={formId} className="inline-name-form" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        autoFocus
        className="inline-name-input"
        maxLength={100}
        autoComplete="off"
        data-1p-ignore
        aria-label={label}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => void handleCommit(false)}
      />
    </form>
  )
}
