import NextAuth from "next-auth"
import authConfig from "./auth.config"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isOnDashboard = req.nextUrl.pathname.startsWith("/(app)") || 
                         req.nextUrl.pathname.startsWith("/dashboard") ||
                         req.nextUrl.pathname.startsWith("/budget") ||
                         req.nextUrl.pathname.startsWith("/calendar") ||
                         req.nextUrl.pathname.startsWith("/goals") ||
                         req.nextUrl.pathname.startsWith("/profile") ||
                         req.nextUrl.pathname.startsWith("/settings")

  if (isOnDashboard && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl))
  }
  
  if (isLoggedIn && req.nextUrl.pathname.startsWith("/login")) {
    return Response.redirect(new URL("/dashboard", req.nextUrl))
  }
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
