import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import { TERMS_DOCUMENT_KEY, TERMS_DOCUMENT_VERSION } from '@/lib/legal'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const explicitNext = searchParams.get('next')
  const termsVersion = searchParams.get('terms_version')
  let next = explicitNext && explicitNext.startsWith('/') ? explicitNext : '/dashboard/profiles'

  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  const errorRedirectUrl = `${origin}/login?error=oauth`

  if (code) {
    const cookiesToSet: Array<{
      name: string
      value: string
      options: Parameters<NextResponse['cookies']['set']>[2]
    }> = []

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(newCookies) {
            newCookies.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              cookiesToSet.push({ name, value, options })
            })
          },
        },
      }
    )

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (termsVersion === TERMS_DOCUMENT_VERSION) {
        const { error: acceptanceError } = await supabase.rpc('record_legal_document_acceptance', {
          p_document_key: TERMS_DOCUMENT_KEY,
          p_document_version: termsVersion,
        })
        if (acceptanceError) {
          await supabase.auth.signOut()
          const response = NextResponse.redirect(`${origin}/signup?error=terms`)
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          return response
        }
      }

      // If no explicit next param, check if this is a new user who needs onboarding
      if (!explicitNext) {
        const user = sessionData.user
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('primary_role, is_admin')
            .eq('id', user.id)
            .single()
          if (profile?.is_admin) next = '/dashboard'
          else if (!profile?.primary_role) next = '/onboarding'
        }
      }

      const redirectUrl = isLocalEnv
        ? `${origin}${next}`
        : forwardedHost
          ? `https://${forwardedHost}${next}`
          : `${origin}${next}`

      const response = NextResponse.redirect(redirectUrl)
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })
      return response
    }
  }

  return NextResponse.redirect(errorRedirectUrl)
}
