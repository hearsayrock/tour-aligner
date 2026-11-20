import { createClient } from '@/lib/supabase/client'
import type { StudioKind } from './model'
export async function uploadStudioPhoto(file: File, kind: StudioKind, id: string, maxSide = 1600) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024)
    throw new Error('Choose a JPG, PNG, or WebP under 12 MB.')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Could not read this image.')
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const image = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.88))
  if (!image || image.size > 5242880) throw new Error('Choose a smaller photo.')
  const path = [kind, id, crypto.randomUUID() + '.webp'].join('/')
  const { error } = await createClient()
    .storage.from('studio-media')
    .upload(path, image, { contentType: 'image/webp', upsert: false })
  if (error) throw new Error(error.message)
  return '/studio-media/' + path
}
