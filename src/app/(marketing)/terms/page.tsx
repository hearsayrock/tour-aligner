import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Terms and Conditions for TourAligner.',
}

const sectionHeading = 'mt-10 text-xl font-semibold tracking-tight text-[#252525]'
const subheading = 'mt-6 text-base font-semibold text-[#252525]'
const paragraph = 'mt-4 leading-7 text-[#555555]'
const list = 'mt-4 list-disc space-y-2 pl-6 leading-7 text-[#555555]'

export function TermsDocument() {
  return (
    <article className="rounded-2xl border border-[#E8E8E8] bg-white p-7 shadow-sm sm:p-12">
        <p className="text-sm font-medium text-[#FD6A2F]">TourAligner</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#252525] sm:text-4xl">
          Terms and Conditions
        </h1>
        <p className={paragraph}><strong>Effective Date:</strong> September 4, 2026</p>
        <p className="mt-1 leading-7 text-[#555555]"><strong>Last Updated:</strong> September 4, 2026</p>

        <h2 className={sectionHeading}>1. Introduction and Acceptance of Terms</h2>
        <p className={paragraph}>
          Welcome to TourAligner (&quot;TourAligner,&quot; &quot;the Platform,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), a service that helps independent artists, bands, and venues (collectively, &quot;Users&quot;) build profiles, connect, and coordinate live show bookings through a matching-based communication tool.
        </p>
        <p className={paragraph}>
          By creating an account, accessing, or using www.touraligner.com (the &quot;Site&quot;) or any related services, you (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) agree to be bound by these Terms and Conditions (&quot;Terms&quot;). If you do not agree to these Terms, you must not access or use the Platform.
        </p>
        <p className={paragraph}>
          If you are creating an account on behalf of a band, venue, agency, or other organization, you represent that you have the authority to bind that entity to these Terms, and &quot;you&quot; refers to both you individually and that entity.
        </p>
        <p className={paragraph}>
          We may revise these Terms at any time. Material changes will be communicated through the Platform or by email. Continued use of the Platform after changes take effect constitutes acceptance of the revised Terms.
        </p>

        <h2 className={sectionHeading}>2. Description of Service</h2>
        <p className={paragraph}>
          TourAligner provides a communication and matching platform designed to connect artists and venues based on tour dates, location, and musical compatibility. The Platform allows Users to create profiles, search for compatible matches, message one another, and coordinate potential bookings.
        </p>
        <p className={paragraph}>
          <strong>TourAligner does not process payments, handle ticketing, manage refunds, or facilitate any financial transaction between Users.</strong> All financial arrangements, ticketing, contracts, and payment terms for any show or event are negotiated and executed directly and exclusively between the artist and venue involved. TourAligner is not a party to any such agreement.
        </p>

        <h2 className={sectionHeading}>3. Intellectual Property Rights</h2>
        <h3 className={subheading}>3.1 Platform Ownership</h3>
        <p className={paragraph}>
          All content, features, software, design elements, trademarks, logos, and other intellectual property comprising the Platform itself (excluding User Content, as defined below) are owned by TourAligner or its licensors and are protected by applicable copyright, trademark, and other intellectual property laws. Nothing in these Terms grants you any right to use TourAligner&apos;s name, branding, or trademarks without prior written consent.
        </p>
        <h3 className={subheading}>3.2 User Content and Limited License</h3>
        <p className={paragraph}>
          &quot;User Content&quot; means any material you upload, post, or otherwise submit to the Platform, including but not limited to profile information, band or artist names, logos, photographs, music, audio links, videos, biographical text, and other creative or promotional assets.
        </p>
        <p className={paragraph}>
          You retain all ownership rights in your User Content. By submitting User Content to the Platform, you grant TourAligner a limited, non-exclusive, royalty-free, worldwide, sublicensable license to host, store, display, reproduce, and distribute that User Content solely for the purpose of operating, maintaining, and providing the matching and communication services offered by the Platform (for example, displaying your profile to prospective venues or artists, or enabling search and discovery features).
        </p>
        <p className={paragraph}>
          This license does not grant TourAligner any right to sell, license to third parties for unrelated purposes, or use your User Content in advertising outside the ordinary function of the Platform without your separate written consent. This license terminates when you remove the applicable User Content or close your account, except to the extent copies have been retained for backup, legal, or archival purposes, or content has been shared with another User through the ordinary use of the Platform.
        </p>
        <h3 className={subheading}>3.3 Representations Regarding User Content</h3>
        <p className={paragraph}>
          You represent and warrant that you own or have obtained all necessary rights, licenses, and permissions to submit your User Content and to grant the license described above, and that your User Content does not infringe the intellectual property, publicity, or privacy rights of any third party.
        </p>

        <h2 className={sectionHeading}>4. User Accounts and Conduct</h2>
        <h3 className={subheading}>4.1 Account Registration</h3>
        <p className={paragraph}>To use certain features of the Platform, you must create an account and provide accurate, current, and complete information. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.</p>
        <h3 className={subheading}>4.2 Eligibility</h3>
        <p className={paragraph}>You must be at least 18 years old, or the age of majority in your jurisdiction, to create an account. Users representing a band, venue, or organization must have actual authority to act on that entity&apos;s behalf.</p>
        <h3 className={subheading}>4.3 Acceptable Use</h3>
        <p className={paragraph}>When using the Platform, you agree not to:</p>
        <ul className={list}>
          <li>Provide false, misleading, or fraudulent information in your profile or communications;</li>
          <li>Impersonate any person or entity, or misrepresent your affiliation with a band, venue, or organization;</li>
          <li>Use the Platform to harass, threaten, defame, or abuse other Users;</li>
          <li>Post content that is unlawful, obscene, discriminatory, or infringes the rights of others;</li>
          <li>Use the Platform to solicit or advertise unrelated commercial services without authorization;</li>
          <li>Attempt to circumvent, disable, or interfere with the Platform&apos;s security or matching functionality;</li>
          <li>Scrape, harvest, or collect data from the Platform using automated means; or</li>
          <li>Use the Platform for any purpose other than legitimate artist–venue booking coordination.</li>
        </ul>
        <h3 className={subheading}>4.4 Booking Interactions</h3>
        <p className={paragraph}>TourAligner facilitates introductions and communication only. Any agreement to book, perform, host, cancel, or reschedule a show — including terms related to payment, guarantees, door splits, technical requirements, or cancellation — is a matter solely between the artist and venue. TourAligner is not a party to, and does not review, approve, or enforce, any such agreement.</p>
        <h3 className={subheading}>4.5 Suspension and Termination</h3>
        <p className={paragraph}>We reserve the right to suspend or terminate any account, at our discretion, for violation of these Terms, fraudulent activity, or conduct that harms other Users or the Platform. You may close your account at any time by following the instructions on the Platform or contacting us directly.</p>

        <h2 className={sectionHeading}>5. Limitation of Liability</h2>
        <h3 className={subheading}>5.1 No Involvement in Events</h3>
        <p className={paragraph}><strong>TourAligner is a communication and matching tool only. We do not organize, produce, promote, guarantee, or have any control over any show, performance, or event arranged through the Platform.</strong> We make no representation or warranty regarding the reliability, conduct, competence, or safety of any artist, venue, or other User.</p>
        <h3 className={subheading}>5.2 Disclaimer of Warranties</h3>
        <p className={paragraph}>The Platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis, without warranties of any kind, whether express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, non-infringement, or that the Platform will be uninterrupted, secure, or error-free.</p>
        <h3 className={subheading}>5.3 Limitation of Liability</h3>
        <p className={paragraph}>To the fullest extent permitted by applicable law, TourAligner and its officers, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or goodwill, arising from or related to:</p>
        <ul className={list}>
          <li>Your use of, or inability to use, the Platform;</li>
          <li>Any outage, downtime, or interruption of the Platform;</li>
          <li>The cancellation, postponement, or rescheduling of any event or show facilitated through the Platform;</li>
          <li>Any injury, loss, damage, dispute, or incident occurring at, or in connection with, an event or show facilitated through the Platform; or</li>
          <li>Any interaction, agreement, or dispute between Users, including disputes regarding payment, performance quality, or contractual terms.</li>
        </ul>
        <p className={paragraph}>Where liability cannot be fully excluded under applicable law, TourAligner&apos;s total aggregate liability arising out of or related to these Terms or the Platform shall not exceed the greater of (a) the amount you paid to TourAligner in the twelve (12) months preceding the claim, or (b) one hundred U.S. dollars ($100).</p>
        <h3 className={subheading}>5.4 Indemnification</h3>
        <p className={paragraph}>You agree to indemnify and hold harmless TourAligner from any claims, damages, losses, or expenses (including reasonable attorneys&apos; fees) arising from your use of the Platform, your User Content, your violation of these Terms, or any dispute between you and another User.</p>

        <h2 className={sectionHeading}>6. Governing Law and Dispute Resolution</h2>
        <p className={paragraph}>These Terms are governed by the laws of the State of Utah, without regard to conflict-of-law principles. Any disputes arising under these Terms shall be resolved exclusively in the state courts located in Salt Lake County, Utah, or the United States District Court for the District of Utah, and you consent to the personal jurisdiction and venue of those courts.</p>

        <h2 className={sectionHeading}>7. General Provisions</h2>
        <p className={paragraph}>If any provision of these Terms is found unenforceable, the remaining provisions will continue in full force. Our failure to enforce any provision does not waive our right to do so later. These Terms constitute the entire agreement between you and TourAligner regarding use of the Platform.</p>

        <h2 className={sectionHeading}>8. Contact</h2>
        <p className={paragraph}>Questions about these Terms may be directed to <a href="mailto:nate@touraligner.com" className="text-[#FD6A2F] hover:underline">nate@touraligner.com</a>.</p>

        <p className="mt-12 border-t border-[#E8E8E8] pt-6 text-sm italic leading-6 text-[#777777]">This document is a draft template and has not been reviewed by a licensed attorney. It should be reviewed by qualified legal counsel in your jurisdiction before publication, particularly regarding liability limitations, governing law, and compliance with applicable consumer protection or data privacy laws.</p>
    </article>
  )
}

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
      <TermsDocument />
    </main>
  )
}
