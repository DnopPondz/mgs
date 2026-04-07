export { default } from "next-auth/middleware";

export const config = {
  // เปลี่ยนจาก ?!api เป็น ?!api/auth เพื่อล็อคโฟลเดอร์ API อื่นๆ ทั้งหมด (เช่น /api/seed จะโดนล็อคด้วย)
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};