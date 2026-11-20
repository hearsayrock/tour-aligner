import { Suspense } from 'react'
import { TermsAcceptanceForm } from '@/components/legal/TermsAcceptanceForm'
import { TermsDocument } from '../page'

export default function AcceptTermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
      <header className="mb-8 rounded-2xl border border-danger-border bg-surface p-7 sm:p-8">
        <p className="text-sm font-medium text-brand-text">TourAligner</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Updated Terms and Conditions
        </h1>
        <p className="mt-4 leading-7 text-text-secondary">
          We&apos;ve updated our Terms and Conditions. Please read through and press Accept at the bottom of the
          screen to continue using TourAligner.
        </p>
      </header>
      <TermsDocument />
      <Suspense>
        <TermsAcceptanceForm />
      </Suspense>
    </main>
  )
}
