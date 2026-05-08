"use server";

import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import StockUsage from "@/models/StockUsage";
import Category from "@/models/Category";
import Location from "@/models/Location";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/app/actions/system"; 
import mongoose from "mongoose";
import { addDays } from "date-fns";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { recordStockMovement } from "@/app/actions/enterprise";

function getStockStatus(currentQuantity: number, minStockLevel: number) {
  if (currentQuantity <= 0) return "Out of Stock";
  if (currentQuantity <= minStockLevel) return "Low Stock";
  return "Healthy";
}

function isAdminRole(role?: string | null) {
  return role === "Admin" || role === "AdminOwner";
}

// สร้าง Schema พื้นฐานสำหรับเช็คข้อมูล payload ป้องกัน Runtime Error
const stockPayloadSchema = z.object({
  categoryId: z.string(),
  locationId: z.string(),
  itemName: z.string(),
  genericName: z.string().optional().default(""),
  strength: z.string().optional().default(""),
  medicineType: z.string().optional().default("General"),
  usageInstructions: z.string().optional().default(""),
  lotNumber: z.string(),
  manufactureDate: z.string().or(z.date()),
  shelfLifeDays: z.coerce.number(),
  initialQuantity: z.coerce.number(),
  unitCost: z.coerce.number().optional().default(0),
  salePrice: z.coerce.number().optional().default(0),
  minStockLevel: z.coerce.number().optional().default(0),
  imageUrl: z.string().optional().default(""),
}).passthrough(); // .passthrough() ยอมให้มีฟิลด์อื่นๆ หลุดมาได้ (เช่น unit, minStockLevel)

const stockDeletePayloadSchema = z.object({
  stockId: z.string(),
  reason: z.string().trim().min(3, "กรุณาระบุเหตุผลการลบอย่างน้อย 3 ตัวอักษร"),
  confirmationText: z.string().trim().min(1, "กรุณากรอกข้อมูลยืนยัน"),
});

const bulkArchivePayloadSchema = z.object({
  stockIds: z.array(z.string()).min(1, "กรุณาเลือกรายการอย่างน้อย 1 รายการ"),
  reason: z.string().trim().min(3, "กรุณาระบุเหตุผลการลบอย่างน้อย 3 ตัวอักษร"),
  confirmationText: z.string().trim().min(1, "กรุณากรอกข้อมูลยืนยัน"),
});

function normalizeText(text: string) {
  return text.trim().toLowerCase();
}

function revalidateStockViews() {
  revalidatePath("/");
  revalidatePath("/stock");
  revalidatePath("/stock/recycle-bin");
  revalidatePath("/purchase");
  revalidatePath("/transfer");
  revalidatePath("/scan");
}

export async function createStockAction(rawPayload: unknown) {
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
    const archivedDuplicate = await StockItem.findOne({
      qrCodeValue,
      deletedAt: { $ne: null },
    }).lean();
    if (archivedDuplicate) {
      return { success: false, message: "พบ Lot นี้อยู่ใน Recycle Bin กรุณากู้คืนหรือลบถาวรก่อนเพิ่มใหม่" };
    }

    // จัดการเรื่องวันที่ โดยใช้ date-fns เพื่อความแม่นยำและป้องกันปัญหา Timezone
    const mfgDate = new Date(payload.manufactureDate);
    const expDate = addDays(mfgDate, payload.shelfLifeDays);
    const location = await Location.findById(payload.locationId).lean() as { branchId?: mongoose.Types.ObjectId } | null;

    const newStock = await StockItem.create({
      ...payload, // นำข้อมูลทั้งหมดใส่เข้าไป
      currentQuantity: payload.initialQuantity,
      status: getStockStatus(payload.initialQuantity, payload.minStockLevel),
      expiryDate: expDate,
      branchId: location?.branchId || null,
      qrCodeValue,
      imageUrl: payload.imageUrl,
      unitCost: payload.unitCost,
      salePrice: payload.salePrice,
      deletedAt: null,
      deletedBy: null,
      deleteReason: "",
    });

    await recordStockMovement({
      stockId: newStock._id,
      itemName: newStock.itemName,
      lotNumber: newStock.lotNumber,
      branchId: newStock.branchId,
      locationId: newStock.locationId,
      movementType: "IN",
      quantity: newStock.currentQuantity,
      balanceAfter: newStock.currentQuantity,
      referenceType: "StockItem",
      note: "Manual stock create/restock",
      performedBy: session.user.id,
    });

    await logAudit("ADD_STOCK", `เพิ่มสต๊อก: ${payload.itemName} (Lot: ${payload.lotNumber})`);

    return { success: true, message: "Stock added successfully!", qrCodeValue: newStock.qrCodeValue };
  } catch (error: unknown) {
    // ตรวจสอบกรณี QR Code ซ้ำ (Duplicate Key)
    if (typeof error === "object" && error && "code" in error && (error as { code: number }).code === 11000) {
      return { success: false, message: "QR Code หรือ Lot นี้มีในระบบแล้ว" };
    }
    console.error("Create Stock Error:", error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Failed to create medicine item" };
  }
}

export async function deleteStockAction(payload: { stockId: string; reason: string; confirmationText: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return { success: false, message: "Unauthorized" };
    }

    const parsed = stockDeletePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message || "Invalid payload" };
    }
    const parsedPayload = parsed.data;

    if (!mongoose.Types.ObjectId.isValid(parsedPayload.stockId)) {
      return { success: false, message: "Invalid stock ID" };
    }

    await dbConnect();

    const stock = await StockItem.findOne({ _id: parsedPayload.stockId, deletedAt: null });
    if (!stock) {
      return { success: false, message: "ไม่พบรายการสินค้าที่ใช้งานอยู่" };
    }

    const confirmation = normalizeText(parsedPayload.confirmationText);
    const validConfirmations = [normalizeText(stock.lotNumber), normalizeText(stock.itemName)];
    if (!validConfirmations.includes(confirmation)) {
      return { success: false, message: "ข้อมูลยืนยันไม่ถูกต้อง กรุณาพิมพ์ Lot หรือชื่อยาให้ตรงกัน" };
    }

    const usageCount = await StockUsage.countDocuments({ stockId: stock._id });
    const deletedById = mongoose.Types.ObjectId.isValid(session.user.id) ? new mongoose.Types.ObjectId(session.user.id) : null;
    stock.deletedAt = new Date();
    stock.deletedBy = deletedById;
    stock.deleteReason = parsedPayload.reason;
    stock.status = "Archived";
    await stock.save();
    await logAudit(
      "ARCHIVE_STOCK",
      `ย้ายไป Recycle Bin: ${stock.itemName} (Lot: ${stock.lotNumber}) | Reason: ${parsedPayload.reason} | Usage records: ${usageCount}`
    );

    revalidateStockViews();

    return { success: true, message: "ย้ายสินค้าไป Recycle Bin แล้ว" };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "ไม่สามารถย้ายรายการสินค้าไป Recycle Bin ได้" };
  }
}

export async function bulkArchiveStockAction(payload: { stockIds: string[]; reason: string; confirmationText: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return { success: false, message: "Unauthorized" };
    }

    const parsed = bulkArchivePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message || "Invalid payload" };
    }
    const parsedPayload = parsed.data;

    if (normalizeText(parsedPayload.confirmationText) !== "archive") {
      return { success: false, message: "การยืนยันไม่ถูกต้อง กรุณาพิมพ์ ARCHIVE เพื่อยืนยัน" };
    }

    const validIds = Array.from(new Set(parsedPayload.stockIds))
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (validIds.length === 0) {
      return { success: false, message: "ไม่พบรายการที่ถูกต้องสำหรับการลบ" };
    }

    await dbConnect();

    const result = await StockItem.updateMany(
      { _id: { $in: validIds }, deletedAt: null },
      {
        $set: {
          deletedAt: new Date(),
          deletedBy: mongoose.Types.ObjectId.isValid(session.user.id) ? new mongoose.Types.ObjectId(session.user.id) : null,
          deleteReason: parsedPayload.reason,
          status: "Archived",
        },
      }
    );

    if (result.modifiedCount === 0) {
      return { success: false, message: "ไม่พบรายการที่ยังใช้งานอยู่สำหรับการลบ" };
    }

    await logAudit(
      "ARCHIVE_STOCK_BULK",
      `ย้ายสินค้าไป Recycle Bin จำนวน ${result.modifiedCount} รายการ | Reason: ${parsedPayload.reason}`
    );

    revalidateStockViews();
    return { success: true, message: `ย้ายสินค้าไป Recycle Bin แล้ว ${result.modifiedCount} รายการ` };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "ไม่สามารถลบหลายรายการได้" };
  }
}

export async function restoreStockAction(payload: { stockId: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return { success: false, message: "Unauthorized" };
    }

    if (!payload?.stockId || !mongoose.Types.ObjectId.isValid(payload.stockId)) {
      return { success: false, message: "Invalid stock ID" };
    }

    await dbConnect();

    const stock = await StockItem.findOne({ _id: payload.stockId, deletedAt: { $ne: null } });
    if (!stock) {
      return { success: false, message: "ไม่พบรายการใน Recycle Bin" };
    }

    stock.deletedAt = null;
    stock.deletedBy = null;
    stock.deleteReason = "";
    stock.status = getStockStatus(stock.currentQuantity, stock.minStockLevel);
    await stock.save();

    await logAudit("RESTORE_STOCK", `กู้คืนสินค้า: ${stock.itemName} (Lot: ${stock.lotNumber})`);
    revalidateStockViews();
    return { success: true, message: "กู้คืนรายการสำเร็จ" };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "ไม่สามารถกู้คืนรายการได้" };
  }
}

export async function permanentlyDeleteStockAction(payload: { stockId: string; confirmationText: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return { success: false, message: "Unauthorized" };
    }

    if (!payload?.stockId || !mongoose.Types.ObjectId.isValid(payload.stockId)) {
      return { success: false, message: "Invalid stock ID" };
    }

    const confirmationText = payload.confirmationText?.trim();
    if (!confirmationText) {
      return { success: false, message: "กรุณากรอกข้อมูลยืนยันก่อนลบถาวร" };
    }

    await dbConnect();

    const stock = await StockItem.findOne({ _id: payload.stockId, deletedAt: { $ne: null } });
    if (!stock) {
      return { success: false, message: "ไม่พบรายการใน Recycle Bin" };
    }

    const confirmation = normalizeText(confirmationText);
    const validConfirmations = [normalizeText(stock.lotNumber), normalizeText(stock.itemName)];
    if (!validConfirmations.includes(confirmation)) {
      return { success: false, message: "ข้อมูลยืนยันไม่ถูกต้อง กรุณาพิมพ์ Lot หรือชื่อยาให้ตรงกัน" };
    }

    const usageCount = await StockUsage.countDocuments({ stockId: stock._id });
    if (usageCount > 0) {
      return { success: false, message: "ลบถาวรไม่ได้ เพราะมีประวัติการเบิกสินค้าอยู่ในระบบ" };
    }

    await StockItem.findByIdAndDelete(stock._id);
    await logAudit("PURGE_STOCK", `ลบถาวรจาก Recycle Bin: ${stock.itemName} (Lot: ${stock.lotNumber})`);

    revalidateStockViews();
    return { success: true, message: "ลบถาวรเรียบร้อยแล้ว" };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "ไม่สามารถลบถาวรรายการนี้ได้" };
  }
}

export async function getDropdownData() {
  try {
    await dbConnect();

    const [categories, locations, itemTemplates] = await Promise.all([
      Category.find({}).select("name defaultShelfLifeDays").sort({ createdAt: -1 }).lean(),
      Location.find({}).select("name branchId").sort({ createdAt: -1 }).lean(),
      StockItem.aggregate([
        { $match: { deletedAt: null } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$itemName",
            categoryId: { $first: "$categoryId" },
            locationId: { $first: "$locationId" },
            unit: { $first: "$unit" },
            minStockLevel: { $first: "$minStockLevel" },
            shelfLifeDays: { $first: "$shelfLifeDays" },
            unitCost: { $first: "$unitCost" },
            salePrice: { $first: "$salePrice" },
            genericName: { $first: "$genericName" },
            strength: { $first: "$strength" },
            medicineType: { $first: "$medicineType" },
            usageInstructions: { $first: "$usageInstructions" },
            imageUrl: { $first: "$imageUrl" },
          },
        },
      ]),
    ]);

    const serialized = JSON.parse(JSON.stringify({ categories, locations, itemTemplates }));
    return { success: true, ...serialized };
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
        $match: { currentQuantity: { $gt: 0 }, deletedAt: null } 
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
