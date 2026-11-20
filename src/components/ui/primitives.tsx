import Link from 'next/link'

type Tone = 'default' | 'muted' | 'brand' | 'success' | 'warning' | 'danger' | 'info'
type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'dark' | 'success' | 'danger'

export const badgeToneClass: Record<Tone, string> = {
  default: 'border-border bg-surface text-ink',
  muted: 'border-border bg-surface-2 text-text-secondary',
  brand: 'border-brand-tint-border bg-brand-tint text-brand-tint-text',
  success: 'border-success-border bg-success-tint text-success-text',
  warning: 'border-warning-border bg-warning-tint text-warning-text',
  danger: 'border-danger-border bg-danger-tint text-danger-text',
  info: 'border-info-border bg-info-tint text-info-text',
}

const buttonToneClass: Record<ButtonTone, string> = {
  primary: 'border-edge bg-brand text-on-brand hover:bg-brand-dim',
  secondary: 'border-edge bg-surface text-ink hover:bg-surface-2',
  ghost: 'border-transparent text-ink hover:border-edge hover:bg-surface-2',
  dark: 'border-edge bg-ink text-page',
  success: 'border-edge bg-success-tint text-success-text',
  danger: 'border-edge bg-danger text-on-danger hover:bg-danger-hover',
}

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function ButtonLink({
  href,
  children,
  tone = 'primary',
  className,
}: {
  href: string
  children: React.ReactNode
  tone?: ButtonTone
  className?: string
}) {
  return (
    <Link href={href} className={cx(buttonBaseClass(tone), className)}>
      {children}
    </Link>
  )
}

export function buttonBaseClass(tone: ButtonTone = 'primary') {
  return cx(
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-[1.5px] px-5 py-2 font-ds-display text-base leading-none font-extrabold tracking-wide uppercase motion-safe:transition-[transform,box-shadow,background-color] motion-safe:hover:-translate-x-0.5 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hard-sm',
    'focus-visible:outline-edge focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50',
    buttonToneClass[tone]
  )
}

export function Card({
  children,
  className,
  as: Component = 'section',
}: {
  children: React.ReactNode
  className?: string
  as?: 'section' | 'div' | 'article'
}) {
  return (
    <Component className={cx('rounded-ds-2xl border border-border bg-surface text-ink', className)}>
      {children}
    </Component>
  )
}

export function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: React.ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span className={cx('inline-flex min-h-6 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', badgeToneClass[tone], className)}>
      {children}
    </span>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  backHref,
  backLabel = 'Back',
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
  backHref?: string
  backLabel?: string
}) {
  return (
    <div className="workspace-page-header mb-8">
      {backHref && (
        <Link href={backHref} className="mb-4 inline-flex min-h-9 items-center text-sm font-medium text-text-secondary transition-colors hover:text-ink">
          {backLabel}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="mb-2 font-ds-mono text-xs font-medium uppercase tracking-widest text-brand-text">{eyebrow}</p>}
          <h1 className="font-ds-display text-4xl leading-none font-extrabold uppercase text-ink-strong sm:text-5xl">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="section-heading mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cx('px-6 py-10 text-center', className)}>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-secondary">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </Card>
  )
}

export const inputClass =
  'w-full rounded-ds-lg border border-border-strong bg-field px-4 py-3 text-sm text-ink placeholder:text-text-subtle focus:border-edge focus:bg-surface'

export const labelClass = 'mb-1.5 block text-sm font-medium text-text-secondary'
