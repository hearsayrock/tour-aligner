import { NextRequest, NextResponse } from 'next/server'
import { getDockConversation } from '@/app/actions/chat-dock'
import { isDockMessageCursor } from '@/lib/chat-dock'

export async function GET(request: NextRequest) {
  const startedAt = performance.now()
  const params = request.nextUrl.searchParams
  const kind = params.get('kind')
  const id = params.get('id')
  const scope = params.get('scope')
  const before = params.get('before')
  const beforeId = params.get('beforeId')
  const cursor = before && beforeId ? { createdAt: before, id: beforeId } : undefined
  const headers = { 'Cache-Control': 'private, no-store' }
  if (
    !id ||
    !scope ||
    !['private', 'backstage'].includes(kind ?? '') ||
    ((before || beforeId) && (!cursor || !isDockMessageCursor(cursor)))
  ) {
    return NextResponse.json(
      { error: 'Could not load this conversation. Try again.' },
      { status: 400, headers }
    )
  }
  const result = await getDockConversation(scope, { kind: kind as 'private' | 'backstage', id }, cursor)
  return NextResponse.json(result, {
    status: result.error ? (result.accessChanged ? 403 : 404) : 200,
    headers: {
      ...headers,
      'Server-Timing': `ta-conversation;dur=${(performance.now() - startedAt).toFixed(0)}`,
    },
  })
}
