"use server";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import mongoose from "mongoose";

const createUserSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/),
  role: z.enum(["AdminOwner", "Admin", "Pharmacist", "Staff", "Auditor"]).default("Staff"),
});

function isAdminRole(role?: string | null) {
  return role === "AdminOwner" || role === "Admin";
}

function isAdminOwnerRole(role?: string | null) {
  return role === "AdminOwner";
}

export async function createUserAction(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
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

    if (role === "AdminOwner" && !isAdminOwnerRole(session.user.role)) {
      return { success: false, message: "สร้าง Admin Owner ได้เฉพาะ Admin Owner เท่านั้น" };
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
      role,
    });

    revalidatePath("/users");
    return { success: true, message: "สร้างบัญชีผู้ใช้สำเร็จ!" };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "ล้มเหลวในการสร้างผู้ใช้" };
  }
}

export async function deleteUserAction(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminOwnerRole(session.user.role)) {
      return { success: false, message: "ลบบัญชีผู้ใช้ได้เฉพาะ Admin Owner เท่านั้น" };
    }

    const userId = String(formData.get("userId") || "");
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { success: false, message: "User ID ไม่ถูกต้อง" };
    }

    if (userId === session.user.id) {
      return { success: false, message: "ไม่ควรลบบัญชีที่กำลังใช้งานอยู่ กรุณาใช้ Admin Owner คนอื่นทำรายการ" };
    }

    await dbConnect();
    const user = await User.findById(userId);
    if (!user) return { success: false, message: "ไม่พบผู้ใช้นี้" };

    if (user.role === "AdminOwner") {
      const ownerCount = await User.countDocuments({ role: "AdminOwner", isActive: true });
      if (ownerCount <= 1) {
        return { success: false, message: "ไม่สามารถลบ Admin Owner คนสุดท้ายของระบบได้" };
      }
    }

    await User.findByIdAndDelete(userId);
    revalidatePath("/users");
    return { success: true, message: "ลบบัญชีผู้ใช้สำเร็จ" };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "ลบบัญชีผู้ใช้ไม่สำเร็จ" };
  }
}
