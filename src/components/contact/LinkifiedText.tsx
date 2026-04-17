interface Props {
  text: string
  className?: string
  linkClassName?: string
}

const URL_PATTERN = /(https?:\/\/[^\s]+)/g

export function LinkifiedText({ text, className, linkClassName }: Props) {
  const parts = text.split(URL_PATTERN)

  return (
    <p className={className}>
      {parts.map((part, index) => {
        if (!part) return null

        if (/^https?:\/\//.test(part)) {
          return (
            <a
              key={`${part}-${index}`}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClassName ?? 'text-[#FD6A2F] hover:underline break-all'}
            >
              {part}
            </a>
          )
        }

        return <span key={`${part}-${index}`}>{part}</span>
      })}
    </p>
  )
}
