import Link from 'next/link'

type Tone = 'default' | 'muted' | 'brand' | 'success' | 'warning' | 'danger' | 'info'
type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'dark' | 'success' | 'danger'

const toneClass: Record<Tone, string> = {
  default: 'border-[#E2E2E2] bg-white text-[#2A2A2A]',
  muted: 'border-[#E8E8E8] bg-[#F6F6F6] text-[#666666]',
  brand: 'border-[#FFD5C4] bg-[#FFF3EE] text-[#A84216]',
  success: 'border-[#CBEAE2] bg-[#F3FBF8] text-[#14584E]',
  warning: 'border-[#F2D7A6] bg-[#FFF7E8] text-[#8A5A12]',
  danger: 'border-[#F3C6C6] bg-[#FFF1F1] text-[#9D2020]',
  info: 'border-[#BFE7EF] bg-[#F1FBFD] text-[#0E6275]',
}

const buttonToneClass: Record<ButtonTone, string> = {
  primary: 'border-[#FD6A2F] bg-[#FD6A2F] text-white hover:border-[#E55A22] hover:bg-[#E55A22]',
  secondary: 'border-[#E2E2E2] bg-white text-[#252525] hover:border-[#CFCFCF] hover:bg-[#F6F6F6]',
  ghost: 'border-transparent bg-transparent text-[#666666] hover:bg-[#F1F1F1] hover:text-[#252525]',
  dark: 'border-[#252525] bg-[#252525] text-white hover:border-black hover:bg-black',
  success: 'border-[#0C7C71] bg-[#0C7C71] text-white hover:border-[#0A695F] hover:bg-[#0A695F]',
  danger: 'border-[#D94848] bg-[#D94848] text-white hover:border-[#B93636] hover:bg-[#B93636]',
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
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FD6A2F] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
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
    <Component className={cx('rounded-2xl border border-[#E6E6E6] bg-white shadow-[0_14px_34px_rgba(20,20,20,0.04)]', className)}>
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
    <span className={cx('inline-flex min-h-6 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', toneClass[tone], className)}>
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
    <div className="mb-8">
      {backHref && (
        <Link href={backHref} className="mb-4 inline-flex min-h-9 items-center text-sm font-medium text-[#777777] transition-colors hover:text-[#252525]">
          {backLabel}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#A24A22]">{eyebrow}</p>}
          <h1 className="text-3xl font-bold tracking-tight text-[#181818] sm:text-4xl">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6F6F6F]">{description}</p>}
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
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-[#252525]">{title}</h2>
        {description && <p className="mt-1 text-sm text-[#777777]">{description}</p>}
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
      <h2 className="text-lg font-semibold text-[#252525]">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#777777]">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </Card>
  )
}

export const inputClass =
  'w-full rounded-xl border border-[#E2E2E2] bg-[#F7F7F7] px-4 py-3 text-sm text-[#252525] placeholder-[#A3A3A3] transition-colors focus:border-[#FD6A2F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FD6A2F]/15'

export const labelClass = 'mb-1.5 block text-sm font-medium text-[#626262]'
