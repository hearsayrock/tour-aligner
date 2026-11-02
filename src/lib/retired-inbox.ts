const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parseRetiredInboxPath(path: string[]) {
  if (path.length === 1 && UUID.test(path[0])) return { kind: 'unknown' as const, id: path[0] }
  if (path.length === 2 && ['private', 'bookings'].includes(path[0]) && UUID.test(path[1])) {
    return { kind: path[0] === 'private' ? 'private' as const : 'booking' as const, id: path[1] }
  }
  return null
}

export function findBackstageForOldBooking(bookings: Array<{ event_id: string | null; show_date: string }>, today: string) {
  const linked = bookings.filter((booking) => booking.event_id)
  return linked.filter((booking) => booking.show_date >= today).sort((a, b) => a.show_date.localeCompare(b.show_date))[0]?.event_id
    ?? linked.sort((a, b) => b.show_date.localeCompare(a.show_date))[0]?.event_id
    ?? null
}
