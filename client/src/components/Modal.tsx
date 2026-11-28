import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useId, useRef } from 'react'
import type { ReactNode } from 'react'

interface ModalProps {
  title: string
  description?: string
  isTitleHidden?: boolean
  hasDisplayTitle?: boolean
  hasCloseButton?: boolean
  hasInsetScrollArea?: boolean
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export const Modal = ({
  title,
  description,
  isTitleHidden = false,
  hasDisplayTitle = false,
  hasCloseButton = true,
  hasInsetScrollArea = false,
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
            <div className={`modal-header ${isTitleHidden ? 'justify-end' : 'justify-between'}`}>
              <Dialog.Title
                className={
                  isTitleHidden
                    ? 'sr-only'
                    : hasDisplayTitle
                      ? 'font-display text-xl min-[390px]:text-2xl font-bold'
                      : 'text-xl font-semibold'
                }
              >
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
          <div className={`modal-body ${hasInsetScrollArea ? 'is-inset' : ''}`}>
            {description && (
              <Dialog.Description id={descriptionId} className="text-muted mb-5">
                {description}
              </Dialog.Description>
            )}
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
