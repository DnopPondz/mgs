"use server";

import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import AuditLog from "@/models/AuditLog";
import Category from "@/models/Category";
import Location from "@/models/Location";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// 🕵️ ฟังก์ชันเก็บประวัติ
export async function logAudit(action: string, details: string) {
  const session = await getServerSession(authOptions);
  const userName = session?.user?.name || "System";
  await AuditLog.create({ action, details, user: userName });
}

// 📋 ฟังก์ชันดึงประวัติ
export async function getAuditLogsAction() {
  await dbConnect();
  const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(50).lean();
  return JSON.parse(JSON.stringify(logs));
}

// ⚖️ ฟังก์ชันปรับปรุงสต๊อก (Cycle Count)
export async function adjustStockAction(payload: { stockId: string, newQty: number, reason: string }) {
  try {
    await dbConnect();
    const stock = await StockItem.findById(payload.stockId);
    if (!stock) return { success: false, message: "Item not found" };

    const oldQty = stock.currentQuantity;
    stock.currentQuantity = payload.newQty;
    await stock.save();

    await logAudit("ADJUST_STOCK", `ปรับยอด ${stock.itemName} (Lot: ${stock.lotNumber}) จาก ${oldQty} เป็น ${payload.newQty} | เหตุผล: ${payload.reason}`);
    return { success: true, message: "Stock adjusted successfully!" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// 📥 ฟังก์ชันนำเข้า Excel (Bulk Import)
export async function bulkImportAction(items: any[]) {
  try {
    await dbConnect();
    const defaultCategory = await Category.findOne();
    const defaultLocation = await Location.findOne();

    const insertData = items.map(item => ({
      itemName: item["Item Name"] || "Unknown",
      lotNumber: item["Lot Number"] || `IMP-${Date.now()}`,
      initialQuantity: Number(item["Quantity"]) || 0,
      currentQuantity: Number(item["Quantity"]) || 0,
      unitCost: Number(item["Unit Cost"]) || 0,
      unit: item["Unit"] || "pcs",
      minStockLevel: Number(item["Min Level"]) || 10,
      manufactureDate: new Date(),
      expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      shelfLifeDays: 365,
      categoryId: defaultCategory?._id,
      locationId: defaultLocation?._id,
      qrCodeValue: `${item["Item Name"]}-${item["Lot Number"]}-${Date.now()}`.replace(/\s+/g, '-')
    }));

    await StockItem.insertMany(insertData);
    await logAudit("BULK_IMPORT", `นำเข้าข้อมูลสินค้าจำนวน ${items.length} รายการผ่าน Excel`);
    
    return { success: true, message: `Imported ${items.length} items successfully!` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}