import Link from 'next/link'

export function IdentityRequiredNotice({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <div className="mb-6 rounded-xl border border-[#F2D7A6] bg-[#FFF7E8] px-4 py-3">
      <p className="text-sm font-semibold text-[#8A5A12]">{title}</p>
      <p className="mt-1 text-sm text-[#8A5A12]/85">{body}</p>
      <Link href="/dashboard" className="mt-2 inline-block text-sm font-medium text-[#8A5A12] hover:underline">
        Go to dashboard
      </Link>
    </div>
  )
}
