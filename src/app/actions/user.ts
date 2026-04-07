"use server";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createUserAction(formData: FormData) {
  try {
    // 1. ตรวจสอบสิทธิ์ว่าเป็น Admin หรือไม่
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return { success: false, message: "คุณไม่มีสิทธิ์สร้างผู้ใช้งานใหม่ (เฉพาะ Admin เท่านั้น)" };
    }

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string;

    if (!name || !email || !password) {
      return { success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" };
    }

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
      role: role || "Staff",
    });

    revalidatePath("/users");
    return { success: true, message: "สร้างบัญชีผู้ใช้สำเร็จ!" };
  } catch (error: any) {
    return { success: false, message: error.message || "ล้มเหลวในการสร้างผู้ใช้" };
  }
}