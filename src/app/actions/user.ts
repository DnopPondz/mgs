"use server";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/),
  role: z.enum(["Admin", "Pharmacist", "Staff", "Auditor"]).default("Staff"),
});

export async function createUserAction(formData: FormData) {
  try {
    // 1. ตรวจสอบสิทธิ์ว่าเป็น Admin หรือไม่
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return { success: false, message: "คุณไม่มีสิทธิ์สร้างผู้ใช้งานใหม่ (เฉพาะ Admin เท่านั้น)" };
    }

    const parsed = createUserSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role") || "Staff",
    });

    if (!parsed.success) {
      return { success: false, message: "ข้อมูลผู้ใช้ไม่ถูกต้อง: รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีตัวอักษรกับตัวเลข" };
    }
    const { name, email, password, role } = parsed.data;

    await dbConnect();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return { success: false, message: "อีเมลนี้ถูกใช้งานแล้วในระบบ" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    revalidatePath("/users");
    return { success: true, message: "สร้างบัญชีผู้ใช้สำเร็จ!" };
  } catch (error: any) {
    return { success: false, message: error.message || "ล้มเหลวในการสร้างผู้ใช้" };
  }
}
