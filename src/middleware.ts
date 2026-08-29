import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
])

function isPublicArtistProfile(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  return parts.length === 2 && parts[0] === 'bands'
}

function isArtistProfilePath(pathname: string) {
  if (pathname === '/dashboard' || pathname === '/dashboard/profile' || pathname === '/dashboard/profile/edit') {
    return true
  }

  if (pathname === '/dashboard/account' || pathname === '/dashboard/settings' || pathname === '/dashboard/profiles') {
    return true
  }

  return pathname === '/dashboard/bands/new' || /^\/dashboard\/bands\/[^/]+\/edit$/.test(pathname)
}

function redirectWithSession(request: NextRequest, response: NextResponse, pathname: string) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  const redirect = NextResponse.redirect(url)
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  return redirect
}

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/auth/') || isPublicArtistProfile(pathname)) {
    return response
  }

  if (!user) {
    return PUBLIC_PATHS.has(pathname)
      ? response
      : redirectWithSession(request, response, '/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (pathname === '/') {
    return redirectWithSession(request, response, profile?.is_admin ? '/dashboard' : '/dashboard/profiles')
  }

  if (profile?.is_admin || pathname === '/onboarding') return response

  if (isArtistProfilePath(pathname)) {
    return pathname === '/dashboard'
      ? redirectWithSession(request, response, '/dashboard/profiles')
      : response
  }

  return redirectWithSession(request, response, '/dashboard/profiles')
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
