import { Suspense } from 'react'
import { TermsAcceptanceForm } from '@/components/legal/TermsAcceptanceForm'
import { TermsDocument } from '../page'

export default function AcceptTermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
      <header className="mb-8 rounded-2xl border border-[#F7C6B2] bg-[#FFFAF7] p-7 sm:p-8">
        <p className="text-sm font-medium text-[#FD6A2F]">TourAligner</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#252525] sm:text-4xl">
          Updated Terms and Conditions
        </h1>
        <p className="mt-4 leading-7 text-[#555555]">
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
