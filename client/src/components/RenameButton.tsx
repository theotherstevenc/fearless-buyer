import { Check, Pencil } from 'lucide-react'

interface RenameButtonProps {
  id: string
  name: string
  formId: string
  isEditing: boolean
  isDisabled: boolean
  onEdit: () => void
}

// While editing, this becomes the submit button for the inline name form. Preventing mousedown keeps
// focus in the field, so the click saves once instead of a blur save closing the edit first.
// Distinct keys render separate elements: if React reused the clicked Rename button as the submit
// button, the browser would submit the form for that same click and close the edit immediately.
export const RenameButton = ({ id, name, formId, isEditing, isDisabled, onEdit }: RenameButtonProps) =>
  isEditing ? (
    <button
      key="save"
      id={id}
      type="submit"
      form={formId}
      className="icon-button text-success"
      disabled={isDisabled}
      aria-label={`Save ${name}`}
      onMouseDown={(event) => event.preventDefault()}
    >
      <Check size={18} />
    </button>
  ) : (
    <button
      key="rename"
      id={id}
      type="button"
      className="icon-button"
      disabled={isDisabled}
      aria-label={`Rename ${name}`}
      onClick={onEdit}
    >
      <Pencil size={16} />
    </button>
  )
