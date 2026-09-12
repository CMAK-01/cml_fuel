import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/db";
import { compare } from "bcryptjs"; 
import { ROLES } from "@/lib/roles";


const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis");
        }

        const user = await prisma.users.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          throw new Error("Identifiants invalides");
        }

        const isValid = await verifyPassword(credentials.password, user.password_hash);
        if (!isValid) {
          throw new Error("Identifiants invalides");
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.nom || user.email,
          role: user.role || ROLES.CONDUCTEUR,
        };
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 heures
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
