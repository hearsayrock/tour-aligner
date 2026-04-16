import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const explicitNext = searchParams.get('next')
  let next = explicitNext && explicitNext.startsWith('/') ? explicitNext : '/dashboard'

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

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // If no explicit next param, check if this is a new user who needs onboarding
      if (!explicitNext) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('primary_role')
            .eq('id', user.id)
            .single()
          if (!profile?.primary_role) {
            next = '/onboarding'
          }
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
