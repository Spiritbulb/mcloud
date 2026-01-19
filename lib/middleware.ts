import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const pathname = request.nextUrl.pathname
  const pathSegments = pathname.split('/').filter(Boolean)
  const potentialSlug = pathSegments[0]

  console.log('Middleware - pathname:', pathname)
  console.log('Middleware - user:', user?.sub)
  console.log('Middleware - potentialSlug:', potentialSlug)

  if (
    !user &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/auth')
  ) {
    console.log('Redirecting to login - no user')
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // If user is logged in and on auth page, redirect to their org
  if (user && pathname.startsWith('/auth')) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.sub)
      .single()

    console.log('Auth page - profile:', profile)

    if (profile?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('slug')
        .eq('id', profile.organization_id)
        .single()

      console.log('Auth page - org:', org)

      if (org?.slug) {
        const redirectTo = request.nextUrl.searchParams.get('redirect')
        console.log('Redirecting to org:', org.slug)
        return NextResponse.redirect(
          new URL(redirectTo || `/${org.slug}`, request.url)
        )
      }
    }
  }

  // If accessing an org route, verify user has access
  if (user && potentialSlug && !pathname.startsWith('/auth') && pathname !== '/') {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.sub)
      .single()

    console.log('Org route - profile:', profile)

    if (!profile?.organization_id) {
      console.log('Redirecting to login - no org in profile')
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('slug')
      .eq('id', profile.organization_id)
      .single()

    console.log('Org route - org:', org)
    console.log('Org route - slug match:', org?.slug === potentialSlug)

    if (!org || org.slug !== potentialSlug) {
      console.log('Redirecting to login - slug mismatch')
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
