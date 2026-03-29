import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import Email from "next-auth/providers/email"
import type { EmailProviderSendVerificationRequestParams } from "next-auth/providers/email"
import Resend from "next-auth/providers/resend"
import bcrypt from "bcryptjs"
import {
  getDefaultFromAddress,
  getResendApiKey,
  getSmtpConfig,
  hasResendEmailProvider,
  sendEmailWithDefaultFrom,
} from "@/lib/email"

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

function buildOtpProvider() {
  const baseProvider = hasResendEmailProvider()
    ? Resend({
        apiKey: getResendApiKey(),
        from: getDefaultFromAddress(),
      })
    : (() => {
        const smtp = getSmtpConfig()
        return Email({
          server: {
            host: smtp.host,
            port: smtp.port,
            auth: smtp.auth,
          },
          from: getDefaultFromAddress(),
        })
      })()

  return {
    ...baseProvider,
    from: getDefaultFromAddress(),
    generateVerificationToken() {
      return Math.floor(100000 + Math.random() * 900000).toString()
    },
    async sendVerificationRequest({ identifier: email, token, provider }: EmailProviderSendVerificationRequestParams) {
      await sendEmailWithDefaultFrom({
        to: email,
        from: provider.from,
        subject: `Your OurLittleWorld Login Code: ${token}`,
        text: `Your login code is: ${token}\n\nThis code will expire in 24 hours.`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #FF6B9D; text-align: center;">OurLittleWorld</h2>
            <p>Hi there!</p>
            <p>Someone (hopefully you!) requested a login code for OurLittleWorld.</p>
            <div style="background-color: #FDF2F5; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #FF6B9D;">${token}</span>
            </div>
            <p>Enter this code in the app to sign in. This code is valid for 24 hours.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">Made with love by OurLittleWorld</p>
          </div>
        `,
      }, "auth-verification")
    },
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    buildOtpProvider(),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const authUser = user as typeof user & AuthUserClaims
        token.id = user.id
        token.email = user.email
        token.name = authUser.full_name || user.name
        token.picture = authUser.avatar_url || user.image
        token.user_type = authUser.user_type
        token.onboarding_completed = authUser.onboarding_completed
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
    verifyRequest: "/confirm-email", // Redirect to confirm-email after sending OTP
  }
})
