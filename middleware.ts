import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Abo-Gate: nur auf /dashboard prüfen, damit nicht jeder Seitenaufruf eine
  // zusätzliche Abfrage kostet. Gepflegt wird abo_status vom CopeCart-Webhook
  // (app/api/webhooks/copecart/route.ts).
  if (user && pathname.startsWith('/dashboard')) {
    const { data, error } = await supabase
      .from('abo_status')
      .select('zugang_bis')
      .eq('user_id', user.id)
      .maybeSingle()

    // Bewusst fail-open: ohne Datensatz (Bestandskonten, Admin, Tester) und
    // bei Abfragefehlern bleibt der Zugang offen. Eine kurze Störung der
    // Datenbank darf niemanden aussperren, der bezahlt hat.
    const gesperrt =
      !error &&
      data &&
      data.zugang_bis !== null &&
      new Date(data.zugang_bis).getTime() <= Date.now()

    if (gesperrt) {
      const url = request.nextUrl.clone()
      url.pathname = '/zugang'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  if (user && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
