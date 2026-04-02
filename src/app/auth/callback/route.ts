import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/dashboard'

  if (!next.startsWith('/')) {
    next = '/dashboard'
  }

  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  const successRedirectUrl = isLocalEnv
    ? `${origin}${next}`
    : forwardedHost
      ? `https://${forwardedHost}${next}`
      : `${origin}${next}`
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
      const response = NextResponse.redirect(successRedirectUrl)
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })
      return response
    }
  }

  return NextResponse.redirect(errorRedirectUrl)
}
