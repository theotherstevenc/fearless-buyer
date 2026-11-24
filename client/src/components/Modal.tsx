import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useId, useRef } from 'react'
import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  description?: string
  isTitleHidden?: boolean
  hasCloseButton?: boolean
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export const Modal = ({
  title,
  description,
  isTitleHidden = false,
  hasCloseButton = true,
  isOpen,
  onClose,
  children,
}: ModalProps) => {
  const descriptionId = useId()
  const returnFocusRef = useRef<HTMLElement | null>(null)
  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className="modal-content"
          aria-describedby={description ? descriptionId : undefined}
          onOpenAutoFocus={() => {
            returnFocusRef.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            returnFocusRef.current?.focus()
          }}
        >
          {!isTitleHidden || hasCloseButton ? (
            <div
              className={`flex items-center gap-3 ${isTitleHidden ? 'justify-end' : 'justify-between'} ${description ? '' : 'mb-5'}`}
            >
              <Dialog.Title className={isTitleHidden ? 'sr-only' : 'text-xl font-semibold'}>
                {title}
              </Dialog.Title>
              {hasCloseButton && (
                <Dialog.Close className="icon-button" aria-label="Close dialog">
                  <X size={20} />
                </Dialog.Close>
              )}
            </div>
          ) : (
            <Dialog.Title className="sr-only">{title}</Dialog.Title>
          )}
          {description && (
            <Dialog.Description id={descriptionId} className="text-muted mt-2 mb-5">
              {description}
            </Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
