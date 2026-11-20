import { createClient } from '@/lib/supabase/server'
import { mediaPattern } from '@/lib/studio/model'
export const dynamic = 'force-dynamic'
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join('/')
  if (!mediaPattern.test('/studio-media/' + path)) return new Response(null, { status: 404 })
  const db = await createClient()
  const { data, error } = await db.storage.from('studio-media').createSignedUrl(path, 60)
  if (error || !data)
    return new Response(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } })
  return new Response(null, {
    status: 307,
    headers: { Location: data.signedUrl, 'Cache-Control': 'private, no-store' },
  })
}
