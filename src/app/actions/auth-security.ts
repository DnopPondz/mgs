"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { requireSession } from "@/lib/authz";
import { logAudit } from "@/app/actions/system";

const pinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits"),
});

export async function setUserPinAction(rawPayload: unknown) {
  try {
    const session = await requireSession();
    const parsed = pinSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return { success: false, message: "PIN ต้องเป็นตัวเลข 4-6 หลัก" };
    }

    await dbConnect();
    const pinHash = await bcrypt.hash(parsed.data.pin, 10);
    await User.findByIdAndUpdate(session.user.id, {
      pinHash,
      pinUpdatedAt: new Date(),
      failedPinAttempts: 0,
      pinLockedUntil: null,
      lastTokenRefreshAt: new Date(),
    });

    await logAudit("SET_PIN", "ผู้ใช้ตั้งค่า PIN สำหรับ session refresh");
    return { success: true, message: "ตั้งค่า PIN สำเร็จ" };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "ไม่สามารถตั้งค่า PIN ได้" };
  }
}

export async function verifyUserPinAction(rawPayload: unknown) {
  try {
    const session = await requireSession();
    const parsed = pinSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return { success: false, message: "PIN ต้องเป็นตัวเลข 4-6 หลัก" };
    }

    await dbConnect();
    const user = await User.findById(session.user.id);
    if (!user || !user.isActive) {
      return { success: false, message: "บัญชีนี้ใช้งานไม่ได้" };
    }

    if (!user.pinHash) {
      return { success: false, message: "ยังไม่ได้ตั้งค่า PIN" };
    }

    if (user.pinLockedUntil && user.pinLockedUntil.getTime() > Date.now()) {
      return { success: false, message: "PIN ถูกล็อกชั่วคราว กรุณา login ใหม่" };
    }

    const ok = await bcrypt.compare(parsed.data.pin, user.pinHash);
    if (!ok) {
      const failedPinAttempts = Number(user.failedPinAttempts || 0) + 1;
      user.failedPinAttempts = failedPinAttempts;
      if (failedPinAttempts >= 5) {
        user.pinLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
      return {
        success: false,
        message: failedPinAttempts >= 5 ? "ใส่ PIN ผิดเกินกำหนด กรุณา login ใหม่" : "PIN ไม่ถูกต้อง",
      };
    }

    user.failedPinAttempts = 0;
    user.pinLockedUntil = null;
    user.lastTokenRefreshAt = new Date();
    await user.save();

    await logAudit("VERIFY_PIN", "ยืนยัน PIN เพื่อ refresh session");
    return { success: true, message: "PIN verified successfully", pinVerifiedAt: Date.now() };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "ไม่สามารถตรวจสอบ PIN ได้" };
  }
}
