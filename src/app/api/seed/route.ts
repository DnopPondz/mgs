import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export async function GET() {
  try {
    await dbConnect();
    
    // เช็คว่ามี admin หรือยัง
    const existingAdmin = await User.findOne({ email: "admin@example.com" });
    if (existingAdmin) {
      return NextResponse.json({ message: "Admin already exists!" });
    }

    // สร้างรหัสผ่านที่เข้ารหัสแล้ว
    const hashedPassword = await bcrypt.hash("password123", 10);
    
    // สร้างแอดมินคนแรก
    await User.create({
      name: "Super Admin",
      email: "admin@example.com",
      password: hashedPassword,
      role: "Admin",
      isActive: true,
    });

    return NextResponse.json({ 
      success: true, 
      message: "Admin created successfully! You can now login.",
      credentials: "Email: admin@example.com | Password: password123"
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to seed admin" }, { status: 500 });
  }
}