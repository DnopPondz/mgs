"use server";

import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import AuditLog from "@/models/AuditLog";
import Category from "@/models/Category";
import Location from "@/models/Location";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

type BulkImportRow = Record<string, unknown>;

function getStockStatus(currentQuantity: number, minStockLevel: number) {
  if (currentQuantity <= 0) return "Out of Stock";
  if (currentQuantity <= minStockLevel) return "Low Stock";
  return "Healthy";
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "Admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

// 🕵️ ฟังก์ชันเก็บประวัติ
export async function logAudit(action: string, details: string) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  const userName = session?.user?.name || "System";
  await AuditLog.create({ action, details, user: userName });
}

// 📋 ฟังก์ชันดึงประวัติ
export async function getAuditLogsAction() {
  await requireAdmin();
  await dbConnect();
  const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(50).lean();
  return JSON.parse(JSON.stringify(logs));
}

// ⚖️ ฟังก์ชันปรับปรุงสต๊อก (Cycle Count)
export async function adjustStockAction(payload: { stockId: string, newQty: number, reason: string }) {
  try {
    await requireAdmin();

    const nextQty = Number(payload.newQty);
    if (!Number.isFinite(nextQty) || nextQty < 0) {
      return { success: false, message: "จำนวนใหม่ต้องเป็น 0 หรือมากกว่า" };
    }

    await dbConnect();
    const stock = await StockItem.findOne({ _id: payload.stockId, deletedAt: null });
    if (!stock) return { success: false, message: "Item not found" };

    const oldQty = stock.currentQuantity;
    stock.currentQuantity = nextQty;
    stock.status = getStockStatus(nextQty, stock.minStockLevel);
    await stock.save();

    await logAudit("ADJUST_STOCK", `ปรับยอด ${stock.itemName} (Lot: ${stock.lotNumber}) จาก ${oldQty} เป็น ${nextQty} | เหตุผล: ${payload.reason}`);
    return { success: true, message: "Stock adjusted successfully!" };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "ไม่สามารถปรับปรุงสต๊อกได้" };
  }
}

// 📥 ฟังก์ชันนำเข้า Excel (Bulk Import)
export async function bulkImportAction(items: BulkImportRow[]) {
  try {
    await requireAdmin();

    await dbConnect();
    const defaultCategory = await Category.findOne();
    const defaultLocation = await Location.findOne();

    const insertData = items.map((item, index) => {
      const quantity = Number(item["Quantity"]) || 0;
      const minLevel = Number(item["Min Level"]) || 10;
      const lotNumber = typeof item["Lot Number"] === "string" && item["Lot Number"].trim().length > 0
        ? item["Lot Number"]
        : `IMP-${Date.now()}-${index}`;

      return {
      itemName: item["Item Name"] || "Unknown",
      genericName: typeof item["Generic Name"] === "string" ? item["Generic Name"] : "",
      strength: typeof item["Strength"] === "string" ? item["Strength"] : "",
      medicineType: typeof item["Type"] === "string" ? item["Type"] : "General",
      usageInstructions: typeof item["Usage"] === "string" ? item["Usage"] : "",
      lotNumber,
      initialQuantity: quantity,
      currentQuantity: quantity,
      unitCost: Number(item["Unit Cost"]) || 0,
      salePrice: Number(item["Sale Price"]) || 0,
      unit: item["Unit"] || "pcs",
      minStockLevel: minLevel,
      manufactureDate: new Date(),
      expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      shelfLifeDays: 365,
      categoryId: defaultCategory?._id,
      locationId: defaultLocation?._id,
      qrCodeValue: `${item["Item Name"]}-${lotNumber}-${Date.now()}`.replace(/\s+/g, '-'),
      status: getStockStatus(quantity, minLevel),
      deletedAt: null,
      deletedBy: null,
      deleteReason: "",
    };
    });

    await StockItem.insertMany(insertData);
    await logAudit("BULK_IMPORT", `นำเข้าข้อมูลสินค้าจำนวน ${items.length} รายการผ่าน Excel`);
    
    return { success: true, message: `Imported ${items.length} items successfully!` };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "ไม่สามารถนำเข้าข้อมูลได้" };
  }
}
