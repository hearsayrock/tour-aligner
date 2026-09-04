import { createServerClient } from '@supabase/ssr'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseIssuer = `${supabaseUrl}/auth/v1`
const supabaseJwks = createRemoteJWKSet(new URL(`${supabaseIssuer}/.well-known/jwks.json`))

async function getVerifiedUserId(accessToken: string) {
  const { payload } = await jwtVerify(accessToken, supabaseJwks, {
    issuer: supabaseIssuer,
    audience: 'authenticated',
  })

  return typeof payload.sub === 'string' ? payload.sub : null
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

          response = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // A verified ES256 access token is sufficient to establish identity. The
  // project JWKS is cached by jose, avoiding an Auth /user network call on
  // every protected route while retaining signature, issuer, audience, and
  // expiry validation. If verification cannot complete (for example during
  // key rotation), fall back to Supabase's authoritative user lookup.
  const { data: { session } } = await supabase.auth.getSession()
  let user: { id: string } | null = null

  if (session?.access_token) {
    try {
      const userId = await getVerifiedUserId(session.access_token)
      user = userId ? { id: userId } : null
    } catch {
      const { data } = await supabase.auth.getUser()
      user = data.user ? { id: data.user.id } : null
    }
  }

  return { response, supabase, user }
}
