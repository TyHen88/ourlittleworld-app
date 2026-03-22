import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import Email from "next-auth/providers/email"
import bcrypt from "bcryptjs"
import nodemailer from "nodemailer"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Email({
      server: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      },
      from: process.env.SMTP_FROM,
      generateVerificationToken() {
        return Math.floor(100000 + Math.random() * 900000).toString()
      },
      async sendVerificationRequest({ identifier: email, url, token, provider }) {
        const { host } = new URL(url)
        const transporter = nodemailer.createTransport(provider.server)
        await transporter.sendMail({
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
        })
      },
    }),
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

        // @ts-ignore
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
          // @ts-ignore
          user_type: user.user_type,
          // @ts-ignore
          onboarding_completed: user.onboarding_completed,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        // @ts-ignore
        token.name = user.full_name || user.name
        // @ts-ignore
        token.picture = user.avatar_url || user.image
        // @ts-ignore
        token.user_type = user.user_type
        // @ts-ignore
        token.onboarding_completed = user.onboarding_completed
      }
      if (trigger === "update" && session) {
        return { ...token, ...session.user }
      }
      return token
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string
        // @ts-ignore
        session.user.user_type = token.user_type
        // @ts-ignore
        session.user.onboarding_completed = token.onboarding_completed
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/confirm-email", // Redirect to confirm-email after sending OTP
  }
})
