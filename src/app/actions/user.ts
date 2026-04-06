"use server";

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function createUserAction(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string;

    if (!name || !email || !password) {
      return { success: false, message: "All fields are required." };
    }

    await dbConnect();

    // 1. เช็คว่ามี Email นี้ซ้ำในระบบหรือยัง
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return { success: false, message: "Email is already registered." };
    }

    // 2. เข้ารหัส Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. บันทึกผู้ใช้ใหม่
    await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "Staff",
    });

    revalidatePath("/users");
    return { success: true, message: "User created successfully!" };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to create user." };
  }
}