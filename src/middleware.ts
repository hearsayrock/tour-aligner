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

  const [profileResult, bandsResult, venuesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single(),
    supabase
      .from('bands')
      .select('id')
      .eq('user_id', user.id)
      .limit(1),
    supabase
      .from('venues')
      .select('id')
      .eq('claimed_by_user_id', user.id)
      .limit(1),
  ])

  const profile = profileResult.data
  const hasManagedProfile = Boolean(bandsResult.data?.length || venuesResult.data?.length)

  if (pathname === '/') {
    return redirectWithSession(
      request,
      response,
      profile?.is_admin ? '/dashboard' : hasManagedProfile ? '/dashboard/profiles' : '/onboarding'
    )
  }

  // Administrators retain access to the admin workspace without a managed artist or venue.
  if (profile?.is_admin) return response

  // A role selection alone is not onboarding completion. The account must own an artist
  // profile or manage a claimed venue before it can access the product workspace.
  if (!hasManagedProfile) {
    // Account information remains available during setup so users can update their details
    // or sign out, but profile-management screens stay behind onboarding.
    return pathname === '/onboarding' || pathname === '/dashboard/account'
      ? response
      : redirectWithSession(request, response, '/onboarding')
  }

  if (pathname === '/onboarding') {
    return redirectWithSession(request, response, '/dashboard/profiles')
  }

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
