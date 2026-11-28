import { Plus } from 'lucide-react'

interface ManageHeadingProps {
  title: string
  actionLabel: string
  actionAccessibleLabel: string
  isDisabled: boolean
  onAction: () => void
}

export const ManageHeading = ({
  title,
  actionLabel,
  actionAccessibleLabel,
  isDisabled,
  onAction,
}: ManageHeadingProps) => (
  <div className="manage-section-heading">
    <div className="manage-section-heading-bar">
      <h3 className="manage-section-title" title={title}>
        {title}
      </h3>
      <button
        className="manage-section-add"
        disabled={isDisabled}
        aria-label={actionAccessibleLabel}
        onClick={onAction}
      >
        <Plus size={16} aria-hidden="true" />
        {actionLabel}
      </button>
    </div>
  </div>
)
