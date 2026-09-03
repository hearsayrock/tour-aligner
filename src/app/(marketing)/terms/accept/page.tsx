import { Suspense } from 'react'
import { TermsAcceptanceForm } from '@/components/legal/TermsAcceptanceForm'

export default function AcceptTermsPage() {
  return (
    <main>
      <Suspense>
        <TermsAcceptanceForm />
      </Suspense>
    </main>
  )
}
