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
      credentials: { email: { type: "text" }, password: { type: "password" } },
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
        
        return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
      }
    })
  ],
  // 👇 ใช้ Secret จาก .env 
  secret: process.env.NEXTAUTH_SECRET, 
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.role = user.role; token.id = user.id; }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  pages: { signIn: '/login' },
  session: { strategy: "jwt" }
};