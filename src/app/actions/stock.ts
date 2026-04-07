"use server";

import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import Category from "@/models/Category";
import Location from "@/models/Location";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/app/actions/system"; // เชื่อมต่อระบบ Audit

export async function createStockAction(payload: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, message: "Unauthorized!" };

    await dbConnect();
    const qrCodeValue = `${payload.itemName.toUpperCase().replace(/\s+/g, '-')}-${payload.lotNumber}`;

    const newStock = await StockItem.create({
      ...payload,
      currentQuantity: payload.initialQuantity,
      expiryDate: new Date(new Date(payload.manufactureDate).getTime() + payload.shelfLifeDays * 24 * 60 * 60 * 1000),
      qrCodeValue,
      imageUrl: payload.imageUrl || "", // บันทึกรูป
      unitCost: Number(payload.unitCost) || 0, // บันทึกราคาทุน
    });

    // บันทึกประวัติลง Audit Log
    await logAudit("ADD_STOCK", `เพิ่มสต๊อก: ${payload.itemName} (Lot: ${payload.lotNumber}) จำนวน ${payload.initialQuantity}`);

    return { success: true, message: "Stock added successfully!", qrCodeValue: newStock.qrCodeValue };
  } catch (error: any) {
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