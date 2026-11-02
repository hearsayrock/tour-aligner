// Backstage pages enforce profile ownership and event membership.
export function isArtistWorkspacePath(pathname: string) {
  if (['/dashboard', '/dashboard/profile', '/dashboard/profile/edit', '/dashboard/account',
    '/dashboard/settings', '/dashboard/profiles', '/dashboard/bands', '/dashboard/backstage'].includes(pathname)) {
    return true
  }

  return pathname === '/dashboard/bands/new'
    || /^\/dashboard\/bands\/[^/]+\/edit$/.test(pathname)
    || /^\/dashboard\/backstage\/[^/]+$/.test(pathname)
}
