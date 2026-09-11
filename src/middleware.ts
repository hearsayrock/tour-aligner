import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { TERMS_DOCUMENT_KEY, TERMS_DOCUMENT_VERSION } from '@/lib/legal'
import { logServerTiming } from '@/lib/performance'

const PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/terms',
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

function redirectToTermsAcceptance(request: NextRequest, response: NextResponse) {
  const url = request.nextUrl.clone()
  const destination = `${request.nextUrl.pathname}${request.nextUrl.search}`
  url.pathname = '/terms/accept'
  url.search = ''
  url.searchParams.set('redirectTo', destination)
  const redirect = NextResponse.redirect(url)
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  return redirect
}

export async function middleware(request: NextRequest) {
  const startedAt = performance.now()
  const sessionStartedAt = performance.now()
  const { response, supabase, user } = await updateSession(request)
  const sessionMs = performance.now() - sessionStartedAt
  const { pathname } = request.nextUrl
  const log = (outcome: string, accessMs = 0) => {
    const totalMs = performance.now() - startedAt
    logServerTiming(`middleware ${pathname} (${outcome})`, {
      session: sessionMs,
      access: accessMs,
      total: totalMs,
    })
    if (process.env.NODE_ENV === 'development') {
      response.headers.set(
        'Server-Timing',
        `ta-auth;dur=${sessionMs.toFixed(0)}, ta-access;dur=${accessMs.toFixed(0)}, ta-middleware;dur=${totalMs.toFixed(0)}`
      )
    }
  }

  if (pathname.startsWith('/auth/') || pathname === '/terms' || isPublicArtistProfile(pathname)) {
    log('public')
    return response
  }

  if (!user) {
    if (pathname === '/terms/accept') {
      log('terms-login-redirect')
      return redirectWithSession(request, response, '/login')
    }
    log(PUBLIC_PATHS.has(pathname) ? 'public' : 'login-redirect')
    return PUBLIC_PATHS.has(pathname)
      ? response
      : redirectWithSession(request, response, '/')
  }

  if (pathname === '/terms/accept') {
    log('terms-accept')
    return response
  }

  const accessStartedAt = performance.now()
  // Route access used to make four concurrent PostgREST requests here. A single
  // embedded profile request preserves the same RLS checks while avoiding four
  // connections for every navigation and every Next.js link prefetch.
  const { data: rawAccess } = await supabase
    .from('profiles')
    .select(`
      is_admin,
      bands!bands_user_id_fkey(id),
      venues!venues_claimed_by_user_id_fkey(id),
      legal_document_acceptances!legal_document_acceptances_user_id_fkey(id, document_key, document_version)
    `)
    .eq('id', user.id)
    .eq('legal_document_acceptances.document_key', TERMS_DOCUMENT_KEY)
    .eq('legal_document_acceptances.document_version', TERMS_DOCUMENT_VERSION)
    .limit(1, { referencedTable: 'bands' })
    .limit(1, { referencedTable: 'venues' })
    .limit(1, { referencedTable: 'legal_document_acceptances' })
    .maybeSingle()
  const accessMs = performance.now() - accessStartedAt

  const access = rawAccess as unknown as {
    is_admin: boolean
    bands: Array<{ id: string }> | null
    venues: Array<{ id: string }> | null
    legal_document_acceptances: Array<{ id: string }> | null
  } | null
  const hasManagedProfile = Boolean(access?.bands?.length || access?.venues?.length)
  const hasAcceptedCurrentTerms = Boolean(access?.legal_document_acceptances?.length)

  if (!hasAcceptedCurrentTerms) {
    log('terms-redirect', accessMs)
    return redirectToTermsAcceptance(request, response)
  }

  if (pathname === '/') {
    log('root-redirect', accessMs)
    return redirectWithSession(
      request,
      response,
      access?.is_admin ? '/dashboard' : hasManagedProfile ? '/dashboard/profiles' : '/onboarding'
    )
  }

  // Administrators retain access to the admin workspace without a managed artist or venue.
  if (access?.is_admin) {
    log('admin', accessMs)
    return response
  }

  // A role selection alone is not onboarding completion. The account must own an artist
  // profile or manage a claimed venue before it can access the product workspace.
  if (!hasManagedProfile) {
    // Account information remains available during setup so users can update their details
    // or sign out, but profile-management screens stay behind onboarding.
    log('onboarding', accessMs)
    return pathname === '/onboarding' || pathname === '/dashboard/account'
      ? response
      : redirectWithSession(request, response, '/onboarding')
  }

  if (pathname === '/onboarding') {
    log('profile-redirect', accessMs)
    return redirectWithSession(request, response, '/dashboard/profiles')
  }

  if (isArtistProfilePath(pathname)) {
    log('artist-profile', accessMs)
    return pathname === '/dashboard'
      ? redirectWithSession(request, response, '/dashboard/profiles')
      : response
  }

  log('profile-redirect', accessMs)
  return redirectWithSession(request, response, '/dashboard/profiles')
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
