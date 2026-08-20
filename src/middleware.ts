import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const publicPaths = ["/", "/auth/login", "/auth/register", "/auth/error", "/api/auth", "/api/seed"]
const authPaths = ["/auth/login", "/auth/register"]

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isPublicPath = publicPaths.some((path) => req.nextUrl.pathname.startsWith(path))
  const isAuthPath = authPaths.some((path) => req.nextUrl.pathname.startsWith(path))
  const isApiAuthPath = req.nextUrl.pathname.startsWith("/api/auth")

  if (isApiAuthPath) return NextResponse.next()

  if (!isLoggedIn && !isPublicPath) {
    const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)
    return NextResponse.redirect(new URL(`/auth/login?callbackUrl=${callbackUrl}`, req.nextUrl.origin))
  }

  if (isLoggedIn && isAuthPath) {
    const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") || "/dashboard"
    return NextResponse.redirect(new URL(callbackUrl, req.nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
}