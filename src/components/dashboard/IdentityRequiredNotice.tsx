import Link from 'next/link'

export function IdentityRequiredNotice({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <div className="mb-6 rounded-xl border border-warning-border bg-warning-tint px-4 py-3">
      <p className="text-sm font-semibold text-warning-text">{title}</p>
      <p className="mt-1 text-sm text-warning-text/85">{body}</p>
      <Link href="/dashboard" className="mt-2 inline-block text-sm font-medium text-warning-text hover:underline">
        Go to dashboard
      </Link>
    </div>
  )
}
