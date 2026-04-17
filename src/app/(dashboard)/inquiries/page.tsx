import { redirect } from 'next/navigation'

export default function InquiriesRedirect() {
  redirect('/dashboard/inbox')
}

/*
export default function InquiriesPage() {
  return <p className="p-8 text-zinc-400">Inquiries — coming soon.</p>
}
*/
