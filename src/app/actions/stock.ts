"use server";

import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import Category from "@/models/Category";
import Location from "@/models/Location";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/app/actions/system"; 
import mongoose from "mongoose";
import { addDays } from "date-fns";
import { z } from "zod";

// สร้าง Schema พื้นฐานสำหรับเช็คข้อมูล payload ป้องกัน Runtime Error
const stockPayloadSchema = z.object({
  categoryId: z.string(),
  locationId: z.string(),
  itemName: z.string(),
  lotNumber: z.string(),
  manufactureDate: z.string().or(z.date()),
  shelfLifeDays: z.coerce.number(),
  initialQuantity: z.coerce.number(),
  unitCost: z.coerce.number().optional().default(0),
  imageUrl: z.string().optional().default(""),
}).passthrough(); // .passthrough() ยอมให้มีฟิลด์อื่นๆ หลุดมาได้ (เช่น unit, minStockLevel)

export async function createStockAction(rawPayload: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, message: "Unauthorized!" };

    // ตรวจสอบความถูกต้องของข้อมูลผ่าน Zod
    const parsed = stockPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return { success: false, message: "ข้อมูลที่ส่งมาไม่ถูกต้อง (Invalid Data Format)" };
    }
    const payload = parsed.data;

    await dbConnect();

    // ตรวจสอบความถูกต้องของรหัส ID ก่อนบันทึก
    if (!mongoose.Types.ObjectId.isValid(payload.categoryId) || 
        !mongoose.Types.ObjectId.isValid(payload.locationId)) {
      return { success: false, message: "Invalid Category or Location ID" };
    }

    const qrCodeValue = `${payload.itemName.toUpperCase().replace(/\s+/g, '-')}-${payload.lotNumber}`;

    // จัดการเรื่องวันที่ โดยใช้ date-fns เพื่อความแม่นยำและป้องกันปัญหา Timezone
    const mfgDate = new Date(payload.manufactureDate);
    const expDate = addDays(mfgDate, payload.shelfLifeDays);

    const newStock = await StockItem.create({
      ...payload, // นำข้อมูลทั้งหมดใส่เข้าไป
      currentQuantity: payload.initialQuantity,
      expiryDate: expDate,
      qrCodeValue,
      imageUrl: payload.imageUrl,
      unitCost: payload.unitCost,
    });

    await logAudit("ADD_STOCK", `เพิ่มสต๊อก: ${payload.itemName} (Lot: ${payload.lotNumber})`);

    return { success: true, message: "Stock added successfully!", qrCodeValue: newStock.qrCodeValue };
  } catch (error: any) {
    // ตรวจสอบกรณี QR Code ซ้ำ (Duplicate Key)
    if (error.code === 11000) {
      return { success: false, message: "QR Code หรือ Lot นี้มีในระบบแล้ว" };
    }
    console.error("Create Stock Error:", error);
    return { success: false, message: error.message };
  }
}

export async function getDropdownData() {
  try {
    await dbConnect();
    const categories = await Category.find({}).lean();
    const locations = await Location.find({}).lean();
    const itemTemplates = await StockItem.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: {
          _id: "$itemName",
          categoryId: { $first: "$categoryId" },
          locationId: { $first: "$locationId" },
          unit: { $first: "$unit" },
          minStockLevel: { $first: "$minStockLevel" },
          shelfLifeDays: { $first: "$shelfLifeDays" },
          unitCost: { $first: "$unitCost" }, // ดึงราคาทุนเดิม
          imageUrl: { $first: "$imageUrl" }  // ดึงรูปภาพเดิม
        }
      }
    ]);
    return { 
      success: true, 
      categories: JSON.parse(JSON.stringify(categories)), 
      locations: JSON.parse(JSON.stringify(locations)), 
      itemTemplates: JSON.parse(JSON.stringify(itemTemplates)) 
    };
  } catch (error) {
    console.error("Failed to fetch dropdown data:", error); // ดักจับ Log เพื่อให้เช็คปัญหาได้ง่ายขึ้น
    return { success: false, categories: [], locations: [], itemTemplates: [] };
  }
}

export async function getDashboardStats() {
  try {
    await dbConnect();

    const stats = await StockItem.aggregate([
      { 
        // 1. กรองเฉพาะ Lot ที่ยังมีของเหลืออยู่เท่านั้น (มากกว่า 0)
        $match: { currentQuantity: { $gt: 0 } } 
      },
      {
        // 2. จัดกลุ่มตามชื่อสินค้าเพื่อดูยอดรวม
        $group: {
          _id: "$itemName",
          totalQuantity: { $sum: "$currentQuantity" },
          itemCount: { $count: {} }, // นับจำนวน Lot ที่ยังมีของ
          unit: { $first: "$unit" }
        }
      },
      { $sort: { totalQuantity: -1 } }
    ]);

    return { success: true, data: JSON.parse(JSON.stringify(stats)) };
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error); // ดักจับ Log
    return { success: false, data: [] };
  }
}