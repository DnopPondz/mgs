import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

// กำหนด path ที่ต้องการให้ Middleware ทำงาน (ป้องกันทุกหน้า ยกเว้น /login, /api, และไฟล์ static ต่างๆ)
// ในไฟล์ middleware.ts ที่เราเขียนไว้
export const config = {
  matcher: [
    "/((?!login|api|_next/static|_next/image|favicon.ico).*)",
  ],
};

