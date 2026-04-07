"use server";

import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import Category from "@/models/Category";
import Location from "@/models/Location";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/app/actions/system"; 
import mongoose from "mongoose";

export async function createStockAction(payload: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, message: "Unauthorized!" };

    await dbConnect();

    // ตรวจสอบความถูกต้องของรหัส ID ก่อนบันทึก
    if (!mongoose.Types.ObjectId.isValid(payload.categoryId) || 
        !mongoose.Types.ObjectId.isValid(payload.locationId)) {
      return { success: false, message: "Invalid Category or Location ID" };
    }

    const qrCodeValue = `${payload.itemName.toUpperCase().replace(/\s+/g, '-')}-${payload.lotNumber}`;

    // จัดการเรื่องวันที่ (ป้องกันปัญหา Timezone)
    const mfgDate = new Date(payload.manufactureDate);
    const expDate = new Date(mfgDate.getTime() + (Number(payload.shelfLifeDays) * 24 * 60 * 60 * 1000));

    const newStock = await StockItem.create({
      ...payload,
      currentQuantity: payload.initialQuantity,
      expiryDate: expDate,
      qrCodeValue,
      imageUrl: payload.imageUrl || "",
      unitCost: Number(payload.unitCost) || 0,
    });

    await logAudit("ADD_STOCK", `เพิ่มสต๊อก: ${payload.itemName} (Lot: ${payload.lotNumber})`);

    return { success: true, message: "Stock added successfully!", qrCodeValue: newStock.qrCodeValue };
  } catch (error: any) {
    // ตรวจสอบกรณี QR Code ซ้ำ (Duplicate Key)
    if (error.code === 11000) {
      return { success: false, message: "QR Code หรือ Lot นี้มีในระบบแล้ว" };
    }
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
    return { success: true, categories: JSON.parse(JSON.stringify(categories)), locations: JSON.parse(JSON.stringify(locations)), itemTemplates: JSON.parse(JSON.stringify(itemTemplates)) };
  } catch (error) {
    return { success: false, categories: [], locations: [], itemTemplates: [] };
  }
}

// เพิ่มฟังก์ชันหรือแก้ไขฟังก์ชันดึงข้อมูล Dashboard
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
    return { success: false, data: [] };
  }
}