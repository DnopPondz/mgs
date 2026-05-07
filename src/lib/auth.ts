// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "./dbConnect";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: { email: { type: "text" }, password: { type: "password" }, remember: { type: "text" } },
      async authorize(credentials) {
        // เพิ่ม Guard Clause ตรวจสอบให้แน่ใจว่ามีการส่งข้อมูลมา
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        await dbConnect();
        const user = await User.findOne({ email: credentials.email });
        if (!user || !user.isActive) throw new Error("Invalid credentials or inactive account");
        
        // ถอด ! (Non-null assertion) ออกได้เลย เพราะตรวจสอบแล้วด้านบน
        const isMatch = await bcrypt.compare(credentials.password, user.password);
        if (!isMatch) throw new Error("Invalid credentials");

        const rememberLogin = credentials.remember !== "false";
        user.rememberLogin = rememberLogin;
        user.lastLoginAt = new Date();
        await user.save();
        
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions || [],
          branchId: user.branchId ? user.branchId.toString() : null,
          hasPin: Boolean(user.pinHash),
          rememberLogin,
        };
      }
    })
  ],
  // 👇 ใช้ Secret จาก .env 
  secret: process.env.NEXTAUTH_SECRET, 
  
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.permissions = user.permissions || [];
        token.branchId = user.branchId || null;
        token.hasPin = Boolean(user.hasPin);
        token.rememberLogin = user.rememberLogin !== false;
        token.pinVerifiedAt = Date.now();
      }
      if (trigger === "update" && session) {
        const nextSession = session as {
          pinVerifiedAt?: number;
          hasPin?: boolean;
          rememberLogin?: boolean;
        };
        if (typeof nextSession.pinVerifiedAt === "number") token.pinVerifiedAt = nextSession.pinVerifiedAt;
        if (typeof nextSession.hasPin === "boolean") token.hasPin = nextSession.hasPin;
        if (typeof nextSession.rememberLogin === "boolean") token.rememberLogin = nextSession.rememberLogin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.permissions = (token.permissions as string[]) || [];
        session.user.branchId = (token.branchId as string | null) || null;
        session.user.hasPin = Boolean(token.hasPin);
        session.user.rememberLogin = token.rememberLogin !== false;
        session.pinVerifiedAt = typeof token.pinVerifiedAt === "number" ? token.pinVerifiedAt : undefined;
      }
      return session;
    }
  },
  pages: { signIn: '/login' },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60, updateAge: 15 * 60 }
};
