export { default } from "next-auth/middleware";

export const config = {
  // เพิ่ม api/stock/scan เข้าไปในรายการที่ไม่ต้องตรวจ Token
  matcher: ["/((?!api/auth|api/stock/scan|_next/static|_next/image|favicon.ico).*)"], 
};