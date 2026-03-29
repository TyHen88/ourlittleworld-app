import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { normalizeEmail } from "@/lib/password-auth"

type AuthUserClaims = {
  full_name?: string | null
  avatar_url?: string | null
  user_type?: string
  onboarding_completed?: boolean
}

type SessionUserClaims = {
  id?: string
  user_type?: string
  onboarding_completed?: boolean
}

const googleOAuthConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
)

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    ...(googleOAuthConfigured
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const normalizedEmail = normalizeEmail(String(credentials.email))

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail }
        })

        if (!user || !user.password || user.is_deleted) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
          image: user.avatar_url,
          user_type: user.user_type,
          onboarding_completed: user.onboarding_completed,
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        if (profile && "email_verified" in profile && profile.email_verified === false) {
          return false
        }
      }

      if (!user?.id) {
        return false
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          is_deleted: true,
          emailVerified: true,
          full_name: true,
          name: true,
          avatar_url: true,
          image: true,
        },
      })

      if (dbUser?.is_deleted) {
        if (account?.provider && account.provider !== "credentials" && account.providerAccountId) {
          await prisma.account.deleteMany({
            where: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          })

          return "/login?error=DeletedOAuthAccountRetry"
        }

        return false
      }

      if (account?.provider === "google" && dbUser) {

        const googleName = typeof user.name === "string" ? user.name.trim() : ""
        const googleImage = typeof user.image === "string" ? user.image : ""
        const updates: {
          emailVerified?: Date
          full_name?: string
          name?: string
          avatar_url?: string
          image?: string
        } = {}

        if (!dbUser.emailVerified) {
          updates.emailVerified = new Date()
        }
        if (!dbUser.full_name && googleName) {
          updates.full_name = googleName
        }
        if (!dbUser.name && googleName) {
          updates.name = googleName
        }
        if (!dbUser.avatar_url && googleImage) {
          updates.avatar_url = googleImage
        }
        if (!dbUser.image && googleImage) {
          updates.image = googleImage
        }

        if (Object.keys(updates).length > 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: updates,
          })
        }
      }

      return true
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const authUser = user as typeof user & AuthUserClaims
        const needsDbClaims =
          authUser.full_name === undefined ||
          authUser.avatar_url === undefined ||
          authUser.user_type === undefined ||
          authUser.onboarding_completed === undefined

        const dbUser =
          user.id && needsDbClaims
            ? await prisma.user.findUnique({
                where: { id: user.id },
                select: {
                  email: true,
                  full_name: true,
                  avatar_url: true,
                  user_type: true,
                  onboarding_completed: true,
                },
              })
            : null

        token.id = user.id
        token.email = user.email ?? dbUser?.email
        token.name = authUser.full_name ?? dbUser?.full_name ?? user.name
        token.picture = authUser.avatar_url ?? dbUser?.avatar_url ?? user.image
        token.user_type = authUser.user_type ?? dbUser?.user_type ?? "COUPLE"
        token.onboarding_completed =
          authUser.onboarding_completed ?? dbUser?.onboarding_completed ?? false
      }
      if (trigger === "update" && session) {
        return { ...token, ...session.user }
      }
      return token
    },
    async session({ session, token }) {
      if (token.id) {
        const sessionUser = session.user as typeof session.user & SessionUserClaims
        const authToken = token as typeof token & SessionUserClaims
        sessionUser.id = token.id as string
        sessionUser.user_type = authToken.user_type
        sessionUser.onboarding_completed = authToken.onboarding_completed
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
    error: "/login",
  }
})
