// Keep the early-access workspace limited to profiles, artist discovery, and private chats.
export function isArtistWorkspacePath(pathname: string) {
  if (['/dashboard', '/dashboard/profile', '/dashboard/profile/edit', '/dashboard/account',
    '/dashboard/settings', '/dashboard/profiles', '/dashboard/bands', '/dashboard/inbox'].includes(pathname)) {
    return true
  }

  return pathname === '/dashboard/bands/new'
    || /^\/dashboard\/bands\/[^/]+\/edit$/.test(pathname)
    || /^\/dashboard\/inbox\/private\/[^/]+$/.test(pathname)
}
