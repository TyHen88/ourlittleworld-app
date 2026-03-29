import NextAuth from "next-auth"
import authConfig from "./auth.config"

const { auth } = NextAuth(authConfig)

const authRoutes = new Set(["/login", "/register"])
const protectedRoutePrefixes = [
  "/budget",
  "/calendar",
  "/chat",
  "/create-post",
  "/dashboard",
  "/feed",
  "/goals",
  "/help",
  "/plan",
  "/profile",
  "/reminders",
  "/settings",
  "/trips",
]

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`)
}

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl
  const isProtectedRoute = protectedRoutePrefixes.some((route) =>
    matchesRoute(pathname, route)
  )
  const isAuthRoute = authRoutes.has(pathname)
  const isOnboardingRoute = matchesRoute(pathname, "/onboarding")

  if (!isLoggedIn && (isProtectedRoute || isOnboardingRoute)) {
    return Response.redirect(new URL("/login", req.nextUrl))
  }
  
  if (
    isLoggedIn &&
    (isAuthRoute || pathname === "/" || pathname === "/landing")
  ) {
    return Response.redirect(new URL("/dashboard", req.nextUrl))
  }
})

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.[^/]+$).*)",
  ],
}
