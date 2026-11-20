'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
export function StudioSheet({
  title,
  close,
  children,
}: {
  title: string
  close: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    const prior = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (prior instanceof HTMLElement && prior.isConnected) prior.focus({ preventScroll: true })
    }
  }, [])
  return (
    <dialog
      data-theme="light"
      className="studio-sheet"
      ref={ref}
      aria-labelledby="studio-sheet-title"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect()
          if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
            close()
        }
      }}
    >
      <header>
        <h2 id="studio-sheet-title">{title}</h2>
        <button className="studio-icon" aria-label="Close" onClick={close}>
          <X size={20} />
        </button>
      </header>
      <div className="studio-sheet-body">{children}</div>
    </dialog>
  )
}
