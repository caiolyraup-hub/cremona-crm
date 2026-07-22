import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getWorkspaceByIdCompatible, getWorkspaceIdForUser } from '@/lib/workspace-compat'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Webhooks de provedores precisam ser publicos e nao podem depender de auth, onboarding ou cookies.
  if (pathname === '/api/whatsapp/webhook' || pathname.startsWith('/api/webhooks/twilio/')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const isLanding = pathname === '/'
  const isDashboard = pathname.startsWith('/dashboard')
  const isOnboarding = pathname.startsWith('/onboarding')
  const isAuthPage = pathname === '/login' || pathname === '/register'

  let user = null
  try {
    const {
      data: { user: resolvedUser },
    } = await supabase.auth.getUser()
    user = resolvedUser
  } catch {
    if (isDashboard || isOnboarding) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  if (isLanding) return supabaseResponse

  if ((isDashboard || isOnboarding) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isAuthPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if ((isDashboard || isOnboarding) && user) {
    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 3000))

    const workspaceResult = await Promise.race([
      getWorkspaceIdForUser(supabase, user.id),
      timeout,
    ])

    if (!workspaceResult) {
      console.warn('[middleware] workspace query timeout for user', user.id)
      return supabaseResponse
    }

    const { workspaceId } = workspaceResult

    if (workspaceId) {
      const workspaceData = await Promise.race([
        getWorkspaceByIdCompatible(supabase, workspaceId),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
      ])

      if (!workspaceData) {
        console.warn('[middleware] workspace fetch timeout for workspace', workspaceId)
        return supabaseResponse
      }

      const { workspace, error, usesLegacyOnboardingSchema } = workspaceData

      if (
        !error &&
        workspace &&
        !usesLegacyOnboardingSchema &&
        isDashboard &&
        !workspace.onboarding_completed
      ) {
        const url = request.nextUrl.clone()
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }

      if (
        !error &&
        workspace &&
        isOnboarding &&
        (usesLegacyOnboardingSchema || workspace.onboarding_completed)
      ) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
