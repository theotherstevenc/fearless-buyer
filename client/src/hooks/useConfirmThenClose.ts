import { useEffect, useRef, useState } from 'react'

/** How long the saved choice stays visible before the dialog starts to leave. */
export const CONFIRM_HOLD_MS = 600
/** Keep in sync with the modal exit animations in index.css. */
export const MODAL_EXIT_MS = 180

interface ConfirmThenClose {
  isOpen: boolean
  confirmedId: string | undefined
  confirmThenClose: (id: string) => void
}

/** Shows a saved choice briefly, animates the modal out, then tells the parent to unmount it. */
export const useConfirmThenClose = (onClose: () => void): ConfirmThenClose => {
  const [confirmedId, setConfirmedId] = useState<string | undefined>()
  const [isOpen, setIsOpen] = useState(true)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])
  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])
  const confirmThenClose = (id: string) => {
    setConfirmedId(id)
    timers.current.push(
      setTimeout(() => {
        setIsOpen(false)
        timers.current.push(setTimeout(() => onCloseRef.current(), MODAL_EXIT_MS))
      }, CONFIRM_HOLD_MS),
    )
  }
  return { isOpen, confirmedId, confirmThenClose }
}
