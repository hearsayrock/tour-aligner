export const ACTIVE_IDENTITY_COOKIE = 'ta_active_identity'

export type ManagedIdentityKind = 'band' | 'venue'

export type ManagedIdentity = {
  kind: ManagedIdentityKind
  id: string
  name: string
  href: string
}

export type ActiveIdentity = { kind: 'all' } | ManagedIdentity

export function identityValue(identity: ActiveIdentity) {
  return identity.kind === 'all' ? 'all' : `${identity.kind}:${identity.id}`
}

export function parseIdentityValue(value: string | null | undefined):
  | { kind: 'all' }
  | { kind: ManagedIdentityKind; id: string }
  | null {
  if (!value || value === 'all') return value === 'all' ? { kind: 'all' } : null

  const [kind, id, extra] = value.split(':')
  if (extra || (kind !== 'band' && kind !== 'venue') || !id) return null

  return { kind, id }
}

export function resolveActiveIdentity(
  cookieValue: string | null | undefined,
  identities: ManagedIdentity[]
): ActiveIdentity {
  if (identities.length === 0) return { kind: 'all' }
  if (identities.length === 1) return identities[0]

  const parsed = parseIdentityValue(cookieValue)
  if (!parsed || parsed.kind === 'all') return { kind: 'all' }

  return identities.find((identity) => identity.kind === parsed.kind && identity.id === parsed.id) ?? { kind: 'all' }
}

export function identityMatchesThread(
  identity: ActiveIdentity,
  thread: { band_id: string; venue_id: string }
) {
  if (identity.kind === 'all') return true
  return identity.kind === 'band' ? thread.band_id === identity.id : thread.venue_id === identity.id
}

export function activeIdentityLabel(identity: ActiveIdentity) {
  if (identity.kind === 'all') return 'All Identities'
  return identity.name
}

export function activeIdentityRoleLabel(identity: ActiveIdentity) {
  if (identity.kind === 'all') return 'all identities'
  return identity.kind === 'band' ? 'artist' : 'venue'
}
