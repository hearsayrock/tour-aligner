export function localReturn(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value))
    return null
  try {
    const u = new URL(value, 'https://touraligner.invalid')
    return u.origin === 'https://touraligner.invalid' ? u.pathname + u.search + u.hash : null
  } catch {
    return null
  }
}
export function inquiryReturn(value: string | null | undefined) {
  const local = localReturn(value)
  if (!local) return null
  const url = new URL(local, 'https://touraligner.invalid')
  return /^\/bands\/[a-zA-Z0-9_-]+$/.test(url.pathname) && url.searchParams.get('inquire') === '1'
    ? local
    : null
}
