import type { ReactNode } from 'react'
import { Pencil } from 'lucide-react'

export function ArtistEditSection({
  label,
  onEdit,
  children,
}: {
  label: string
  onEdit?: () => void
  children: ReactNode
}) {
  if (!onEdit) return <>{children}</>
  return (
    <div
      className="artist-edit-section"
      onClick={(event) => {
        if (
          event.target instanceof Element &&
          !event.target.closest(
            'button,a,input,select,textarea,label,summary,audio,video,iframe,[role="button"]'
          )
        )
          onEdit()
      }}
    >
      <button type="button" className="artist-edit-tag" onClick={onEdit}>
        <Pencil size={12} />
        {label}
      </button>
      {children}
    </div>
  )
}
