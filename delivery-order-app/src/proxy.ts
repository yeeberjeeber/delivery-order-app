import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

type Role = "driver" | "supervisor" | "finance" | "admin"

const PROTECTED: Record<string, Role[]> = {
  "/driver":     ["driver"],
  "/supervisor": ["supervisor"],
  "/finance":    ["finance"],
  "/admin":      ["admin"],
}

const PUBLIC_PATHS = [
  "/driver/login",
  "/login",
  "/",
]

const ROLE_HOME: Record<Role, string> = {
  driver:     "/driver/dashboard",
  supervisor: "/supervisor/dashboard",
  finance:    "/finance/dashboard",
  admin:      "/admin/dashboard",
}

export async function proxy(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))

  if (!user && !isPublic) {
    const loginUrl = pathname.startsWith("/driver") ? "/driver/login" : "/login"
    return NextResponse.redirect(new URL(loginUrl, request.url))
  }

  if (user) {
    const profile = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const role = profile.data?.role as Role | undefined

    if (isPublic && role) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
    }

    for (const [prefix, allowedRoles] of Object.entries(PROTECTED)) {
      if (pathname.startsWith(prefix) && role && !allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/", request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
