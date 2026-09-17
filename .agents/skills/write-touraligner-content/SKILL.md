---
name: write-touraligner-content
description: Draft, edit, or review customer-facing TourAligner copy, including proposed copy in chat and text introduced during feature development. Use for marketing, UI, onboarding, messages, emails, metadata, and public announcements. Not for internal technical documentation or ordinary developer conversation.
---

# Write TourAligner content

Read this entire file before drafting customer-facing copy. These are shared project instructions for every agent, not a Codex-only writing style. Follow explicit task instructions when they override a preference here. Do not change this guide or broaden the task merely to accommodate your draft.

## The target voice

Write like a sharp person in the music community talking to peers. TourAligner is witty, sassy, and smart. It has some swagger and is comfortable with irreverence. It is not a corporate booking platform trying to sound cool, a motivational coach, or a comedian performing in every paragraph.

The founders wrote the landing-page copy themselves after rejecting agent-written passes. Their wording is the reference, not those rejected drafts. The aim is to carry their judgment into new content, not to imitate a handful of slang words.

## Before drafting

Establish the following from the request and relevant project context. This is preparation, not a mandatory questionnaire for the developer.

- Who is reading: an artist, a band, a venue operator, an agent, a manager, or a mixed audience?
- What does the reader need here: an explanation, an action, a decision, a status, or a confirmation?
- What actually works now, and what is planned or available only to early users?
- What tone suits the surface and the reader's situation?
- Which existing human-approved passage is the closest reference?

Read the relevant page or flow, including surrounding labels and states. For brand-writing tasks, also read `src/app/(marketing)/page.tsx` from the repository root. The approved excerpts below capture the founders' voice as of 2026-09-16; the live page supplies current context. Do not assume every string in the repository, footer, modal, or metadata is a deliberate voice example.

Resolve material factual gaps before making claims. Ask a concise question only when the missing information cannot be safely inferred and would change the result. A request to diagnose copy does not authorize edits; a request to rewrite one section does not authorize adjacent rewrites.

## Firm requirements

### No em dashes

Do not use the em dash character in new or revised customer-facing copy. Choose a period, comma, colon, parentheses, or a different sentence. Do not replace every em dash with an en dash or double hyphen and keep the same manufactured construction. Ordinary hyphens in compound words are fine.

Do not silently alter a developer-supplied quotation that must remain exact. Flag a conflict between exact reproduction and this rule instead.

### Tell the truth about the product

Do not invent capabilities, testimonials, customer results, industry statistics, launch dates, guarantees, or first-hand experience. Distinguish current features from planned releases. A voice reference is not evidence that a feature is live. Do not promise bookings or venue replies that TourAligner cannot guarantee.

### Respect the reader and the scope

Direct sass at the broken process, not at a customer's ability, success, taste, or frustration. Do not mock an artist's draw or suggest that a venue owes a booking.

Do not make feedback about our toughness or willingness to hear criticism. The founders specifically rejected "We can take it." They want useful feedback, not a performance of defensiveness. Acknowledge a known product fault directly rather than turning it into a joke. Do not assume responsibility for an industry-wide problem without evidence.

Preserve approved human-written copy unless the task asks for a change. Do not polish its personality into generic professional language. Do not add intentional typos, bad grammar, or random rough edges as a simulation of humanity. Fix accidental errors when in scope without erasing intentional voice.

## Editorial judgment

### Speak from inside the scene

Use the vocabulary of the actual work: getting on the bill, chasing replies, stage plots, room capacity, availability, booking preferences, and tour dates. Artists and bookers do not need a paragraph explaining that music matters to them.

Use music-community references when they convey something. "Myspace the hell out of your personal public page" says customization, attitude, and a familiar kind of creative freedom. "Front row tickets," "doors open," and "set the stage" belong to the subject. Generic jokes about passwords or spreadsheet archaeology are not automatically the TourAligner voice merely because they sound casual.

Do not force an insider reference into every line or invent new slang to prove membership. Avoid treating the audience as a caricature. References should remain understandable enough to serve the task.

### Allow some bite, but earn it

Mild profanity can fit brand marketing when it gives a line real personality or clarity. It is permission, not a quota. Slang such as "spill the tea" is allowed when it feels natural in context. Do not scatter profanity, nostalgia, or trendy phrases across the product as a substitute for a point.

Prefer a specific, recognizable observation to a detachable joke. Read the page as a whole: several amusing lines can work together, but every paragraph should not follow the same setup and punchline pattern.

### State a position rather than stacking benefits

"The problem with the current booking system is that there is no system" makes a confident point. Avoid replacing that kind of clarity with vague claims about stronger profiles, cleaner workflows, seamless experiences, or empowered artists.

Use concrete nouns and ordinary verbs. Explain what the product holds or does, not merely how impressive it is. Terms such as "vibe," "ready," "fit," "momentum," "shape," and "workflow" are not banned. They become a problem when they recur as filler or conceal an unclear thought.

### Vary the cadence naturally

Avoid relying on the same sentence machinery throughout a page:

- "If you do X, then Y happens" or "do X so you can Y" in every explanation.
- Repeated "less X, more Y" contrasts or "not just X, but Y" positioning.
- Three rhetorical questions followed by a clever answer in every card.
- A slogan, a polished benefit list, and a reassuring punchline in every paragraph.
- Symmetrical fragments that make every section sound like the same advertisement.

These are editorial warnings, not bans on conditional explanations, lists, contrasts, or three-part phrases. The founders' audience descriptions use lists and cause-and-effect sentences. Their headings also use three-part rhythms. Use those forms when they are the natural choice; do not make them the default template.

Human does not mean deliberately choppy. Do not rewrite normal prose as "The music. The numbers. The places you can play." simply to avoid AI cadence. Mix longer explanations with concise instructions and occasional fragments according to the thought. Judge the whole surface, not an isolated punctuation mark or sentence length.

### Leave plain information plain

"Create an account and start building out your artist profile" needs no joke. Straightforward copy gives personality elsewhere room to work. Buttons should identify their action. Labels should name their field. Important helper text should explain a real requirement or consequence.

Do not append an explanation after the point has landed. The founders' final CTA ends with "Practice up / Set the stage / The next tour starts soon" and no supporting paragraph. Do not automatically refill that space with reassurance or another summary.

## Match the surface

| Surface | Tone and priority |
| --- | --- |
| Landing pages and brand campaigns | Confident, energetic, culturally fluent. Room for swagger and earned humor. Keep the product and next action clear. |
| Product UI and onboarding | Direct and useful. Some personality is welcome, but instructions must remain easy to follow. Do not advertise at users who are already trying to finish a task. |
| Empty states and routine confirmations | State what happened or what is missing, and supply a useful next action when one exists. No compulsory joke or pep talk. |
| Errors, cancellations, security, and sensitive booking details | Accuracy and respect first. Explain the state and recovery action. No sass that obscures consequences or belittles frustration. |
| Emails and notifications | Make the reason and relevant action apparent. Brand voice can support the message, not bury it. |
| Metadata and accessibility text | Descriptive and accurate. Do not trade clarity or accessibility for wit. |
| Legal text | Precise and appropriately formal. Do not inject brand slang, imply legal review, or alter legal meaning under a voice pass. |

## Approved examples and what they teach

These are founder-authored landing-page examples, not templates to reuse everywhere.

> The problem with the current booking system is that there is no system. With TourAligner your profile, venues, dates and messages are all in one place. Look, know, play the show.

Lesson: take a position, describe the product in familiar terms, then stop. The compressed ending can work because the surrounding explanation does its job.

> Set your tone and vibe. Myspace the hell out of your personal public page.

Lesson: cultural shorthand and mild profanity can convey personality more effectively than a generic "customize your visual identity" explanation. Do not turn this into a requirement to mention Myspace in unrelated copy.

> Spill the tea on what's broken
>
> Tell us what wastes your time or makes booking harder than it should be. We’re building around that.

Lesson: attitude in the heading, useful plain language in the body. The response stays focused on the customer's problem rather than our reaction to criticism.

> Create an account and start building out your artist profile.

Lesson: an ordinary instruction is allowed to be ordinary. Not every line needs to audition.

> Keep your room details, capacity, availability, booking preferences, and show info organized so artists know what you need before they reach out.

Lesson: a longer list and a causal explanation are appropriate when they name useful, domain-specific information. The rule is to avoid formulaic repetition, not to prohibit "so" or lists.

> Doors open, profile's tight, and you're first in line.

Lesson: natural shorthand and a music-related metaphor can carry the voice without formal explanation. This line is a style reference, not permission to promise launch access in an unrelated flow.

> Practice up
> Set the stage
> The next tour starts soon

Lesson: an ending can be brief. Do not attach another paragraph merely because a marketing layout usually has one. Timing claims still require current factual support.

The developer also explicitly approved this agent-proposed paragraph during discussion:

> TourAligner keeps your artist profile, venue research, dates, and messages in one place. Open it, see what’s happening, and get back to booking.

Lesson: useful product description followed by an ordinary action can sound natural. This is an approved reference, not a request to restore earlier discarded code changes.

## Rejected patterns from previous passes

- "Cleaner booking, stronger profiles, and less chaos": an abstract benefit stack that could describe almost any product.
- "Future you will be smug about it": personality attached to a routine confirmation without doing useful work.
- "We can take it.": makes feedback about us rather than the problem the customer is reporting.
- Rewriting everything into short fragments: an overcorrection that replaced one obvious formula with another.
- Treating "ready," "vibe," lists, or three-part phrases as universal forbidden forms: contradicted the founders' own writing.

Do not recycle these rejected lines as brand examples. Learn the reason for rejection instead of building a growing blacklist of ordinary words.

## Final review before presenting or saving copy

Review the complete requested surface, including headings, buttons, helper text, and changed states. For one small string, review enough surrounding copy to understand its role.

- Check that every capability, availability statement, and promise has support.
- Check for em dashes in the proposed copy, including metadata and emails. Do not remove them from unrelated files under this task.
- Read the copy aloud. Does it sound like a music-community peer, or a copywriter demonstrating "witty and sassy"?
- Look for repeated conditional explanations, contrasts, rhetorical questions, and punchline cadence. Revise patterns, not every individual occurrence.
- Remove filler, forced jokes, startup jargon, and explanations after the point has landed.
- Verify that plain information stayed clear, sensitive messages stayed respectful, and terminology matches the actual product.
- Confirm that approved copy outside the request was preserved.

Present the requested result rather than claiming the writing is objectively human or guaranteed to pass an AI detector. When editing project files, follow the repository's normal verification requirements. Do not use this skill as permission to commit, publish, send messages, or rewrite adjacent surfaces.

## Maintaining this shared skill

This file is the canonical source for all agents. Do not create a separate Claude version or duplicate these rules in another content guide. Update it when the developer approves new guidance or a real failure warrants a focused correction. Distinguish explicit requirements from inferred preferences, and preserve the nuance of approved examples. Do not convert each individual correction into a universal prohibition.
