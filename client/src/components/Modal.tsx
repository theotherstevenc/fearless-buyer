import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  description: string
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export const Modal = ({ title, description, isOpen, onClose, children }: ModalProps) => (
  <Dialog.Root
    open={isOpen}
    onOpenChange={(open) => {
      if (!open) onClose()
    }}
  >
    <Dialog.Portal>
      <Dialog.Overlay className="modal-overlay" />
      <Dialog.Content className="modal-content">
        <div className="flex items-center justify-between gap-3">
          <Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title>
          <Dialog.Close className="icon-button" aria-label="Close dialog">
            <X size={20} />
          </Dialog.Close>
        </div>
        <Dialog.Description className="text-muted mt-2 mb-5">{description}</Dialog.Description>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
)
