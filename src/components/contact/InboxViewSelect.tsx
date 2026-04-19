'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function InboxViewSelect({ value }: { value: 'active' | 'archived' }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <label className="flex items-center gap-2 text-sm text-[#777777]">
      <span>View</span>
      <select
        value={value}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString())
          const nextValue = event.target.value as 'active' | 'archived'

          if (nextValue === 'active') {
            params.delete('view')
          } else {
            params.set('view', nextValue)
          }

          const query = params.toString()
          router.replace(query ? `/dashboard/inbox?${query}` : '/dashboard/inbox')
        }}
        className="rounded-lg border border-[#E8E8E8] bg-white px-3 py-2 text-sm text-[#252525] transition-colors focus:outline-none focus:border-[#CCCCCC]"
      >
        <option value="active">Active</option>
        <option value="archived">Archived</option>
      </select>
    </label>
  )
}
