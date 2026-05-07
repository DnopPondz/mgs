"use server";

import { addDays } from "date-fns";
import mongoose from "mongoose";
import { z } from "zod";
import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { logAudit } from "@/app/actions/system";
import StockItem from "@/models/StockItem";
import StockUsage from "@/models/StockUsage";
import PurchaseOrder from "@/models/PurchaseOrder";
import Sale from "@/models/Sale";
import StockWriteOff from "@/models/StockWriteOff";
import { recordStockMovement } from "@/app/actions/enterprise";

function getStockStatus(currentQuantity: number, minStockLevel: number) {
  if (currentQuantity <= 0) return "Out of Stock";
  if (currentQuantity <= minStockLevel) return "Low Stock";
  return "Healthy";
}

function revalidatePharmacyPages() {
  revalidatePath("/");
  revalidatePath("/purchase");
  revalidatePath("/stock");
  revalidatePath("/scan");
  revalidatePath("/transfer");
  revalidatePath("/usage");
}

function makeNumber(prefix: string) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${yyyy}${mm}${dd}-${random}`;
}

async function getActiveSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

async function requireAdminSession() {
  const session = await getActiveSession();
  if (session.user.role !== "Admin") throw new Error("Unauthorized");
  return session;
}

function safeObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
}

const poItemSchema = z.object({
  itemName: z.string().trim().min(1),
  requestedQty: z.coerce.number().int().positive(),
  unit: z.string().trim().optional().default("pcs"),
  unitCost: z.coerce.number().nonnegative().optional().default(0),
  categoryId: z.string().optional(),
  medicineType: z.string().optional().default("General"),
  minStockLevel: z.coerce.number().nonnegative().optional().default(0),
});

const createPurchaseOrderSchema = z.object({
  supplierName: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  autoGenerateFromLowStock: z.boolean().optional().default(false),
  items: z.array(poItemSchema).optional().default([]),
});

type POItemPayload = z.infer<typeof poItemSchema>;

export async function createPurchaseOrderAction(rawPayload: unknown) {
  try {
    const session = await requireAdminSession();
    const parsed = createPurchaseOrderSchema.safeParse(rawPayload);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message || "Invalid payload" };
    }

    await dbConnect();
    const payload = parsed.data;
    let poItems: POItemPayload[] = payload.items;

    if (payload.autoGenerateFromLowStock) {
      const lowStockItems = await StockItem.aggregate([
        { $match: { deletedAt: null } },
        {
          $group: {
            _id: "$itemName",
            totalQty: { $sum: "$currentQuantity" },
            minStockLevel: { $max: "$minStockLevel" },
            unit: { $first: "$unit" },
            unitCost: { $first: "$unitCost" },
            categoryId: { $first: "$categoryId" },
            medicineType: { $first: "$medicineType" },
          },
        },
        { $match: { $expr: { $lte: ["$totalQty", "$minStockLevel"] } } },
      ]);

      poItems = lowStockItems.map((item: Record<string, unknown>) => {
        const minStock = Number(item.minStockLevel) || 0;
        const totalQty = Number(item.totalQty) || 0;
        const requestedQty = Math.max((minStock * 2) - totalQty, 1);
        return {
          itemName: String(item._id || "").trim(),
          requestedQty,
          unit: String(item.unit || "pcs"),
          unitCost: Number(item.unitCost) || 0,
          categoryId: item.categoryId ? String(item.categoryId) : undefined,
          medicineType: String(item.medicineType || "General"),
          minStockLevel: minStock,
        };
      }).filter((item) => item.itemName.length > 0);
    }

    if (poItems.length === 0) {
      return { success: false, message: "ไม่มีรายการสินค้าในใบสั่งซื้อ" };
    }

    let poNumber = makeNumber("PO");
    while (await PurchaseOrder.findOne({ poNumber }).lean()) {
      poNumber = makeNumber("PO");
    }

    const totalEstimatedCost = poItems.reduce((acc, item) => acc + (item.requestedQty * (item.unitCost || 0)), 0);
    const orderedBy = safeObjectId(session.user.id);

    const created = await PurchaseOrder.create({
      poNumber,
      supplierName: payload.supplierName,
      status: "Ordered",
      notes: payload.notes,
      totalEstimatedCost,
      orderedBy,
      items: poItems.map((item) => ({
        itemName: item.itemName,
        requestedQty: item.requestedQty,
        receivedQty: 0,
        unit: item.unit,
        unitCost: item.unitCost,
        categoryId: item.categoryId && mongoose.Types.ObjectId.isValid(item.categoryId)
          ? new mongoose.Types.ObjectId(item.categoryId)
          : null,
        medicineType: item.medicineType,
        minStockLevel: item.minStockLevel,
      })),
    });

    await logAudit("CREATE_PO", `สร้างใบสั่งซื้อ ${poNumber} จำนวน ${poItems.length} รายการ`);
    revalidatePharmacyPages();

    return {
      success: true,
      message: "สร้างใบสั่งซื้อสำเร็จ",
      data: { poId: created._id.toString(), poNumber: created.poNumber },
    };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "ไม่สามารถสร้างใบสั่งซื้อได้" };
  }
}

const receiveItemSchema = z.object({
  itemName: z.string().trim().min(1),
  receiveQty: z.coerce.number().int().positive(),
  lotNumber: z.string().trim().min(1),
  manufactureDate: z.string().or(z.date()),
  shelfLifeDays: z.coerce.number().int().positive(),
  unit: z.string().optional(),
  unitCost: z.coerce.number().nonnegative().optional(),
  salePrice: z.coerce.number().nonnegative().optional(),
  minStockLevel: z.coerce.number().nonnegative().optional(),
  genericName: z.string().optional().default(""),
  strength: z.string().optional().default(""),
  medicineType: z.string().optional().default("General"),
  usageInstructions: z.string().optional().default(""),
  imageUrl: z.string().optional().default(""),
  categoryId: z.string().optional(),
});

const receivePOPayloadSchema = z.object({
  poId: z.string(),
  locationId: z.string(),
  notes: z.string().optional().default(""),
  receivedItems: z.array(receiveItemSchema).min(1),
});

export async function receiveStockFromPOAction(rawPayload: unknown) {
  const tx = await mongoose.startSession();
  tx.startTransaction();
  try {
    await requireAdminSession();
    const parsed = receivePOPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Invalid payload");
    }

    const payload = parsed.data;
    const poId = safeObjectId(payload.poId);
    const locationId = safeObjectId(payload.locationId);
    if (!poId || !locationId) throw new Error("ข้อมูล PO หรือ Location ไม่ถูกต้อง");

    await dbConnect();

    const po = await PurchaseOrder.findById(poId).session(tx);
    if (!po) throw new Error("ไม่พบใบสั่งซื้อ");
    if (po.status === "Cancelled") throw new Error("ใบสั่งซื้อนี้ถูกยกเลิกแล้ว");

    for (const receivedItem of payload.receivedItems) {
      const poItem = po.items.find((item: { itemName: string }) => item.itemName === receivedItem.itemName);
      if (!poItem) {
        throw new Error(`รายการ ${receivedItem.itemName} ไม่ได้อยู่ใน PO นี้`);
      }

      const remainingQty = Number(poItem.requestedQty) - Number(poItem.receivedQty);
      if (receivedItem.receiveQty > remainingQty) {
        throw new Error(`รับสินค้าเกินจำนวนที่ค้างรับของ ${receivedItem.itemName}`);
      }

      const mfgDate = new Date(receivedItem.manufactureDate);
      if (Number.isNaN(mfgDate.getTime())) {
        throw new Error(`Manufacture date ไม่ถูกต้องสำหรับ ${receivedItem.itemName}`);
      }
      const expDate = addDays(mfgDate, receivedItem.shelfLifeDays);

      const activeStock = await StockItem.findOne({
        itemName: receivedItem.itemName,
        lotNumber: receivedItem.lotNumber,
        locationId,
        deletedAt: null,
      }).session(tx);

      if (activeStock) {
        activeStock.initialQuantity += receivedItem.receiveQty;
        activeStock.currentQuantity += receivedItem.receiveQty;
        activeStock.status = getStockStatus(activeStock.currentQuantity, activeStock.minStockLevel);
        if (typeof receivedItem.unitCost === "number") activeStock.unitCost = receivedItem.unitCost;
        if (typeof receivedItem.salePrice === "number") activeStock.salePrice = receivedItem.salePrice;
        if (typeof receivedItem.minStockLevel === "number") activeStock.minStockLevel = receivedItem.minStockLevel;
        await activeStock.save({ session: tx });
      } else {
        const fallbackCategoryId = poItem.categoryId && mongoose.Types.ObjectId.isValid(poItem.categoryId.toString())
          ? poItem.categoryId
          : null;
        const categoryId = receivedItem.categoryId && mongoose.Types.ObjectId.isValid(receivedItem.categoryId)
          ? new mongoose.Types.ObjectId(receivedItem.categoryId)
          : fallbackCategoryId;

        const qrCodeValue = `${receivedItem.itemName.toUpperCase().replace(/\s+/g, "-")}-${receivedItem.lotNumber}-${locationId.toString()}`;

        await StockItem.create([{
          itemName: receivedItem.itemName,
          genericName: receivedItem.genericName,
          strength: receivedItem.strength,
          medicineType: receivedItem.medicineType || poItem.medicineType || "General",
          usageInstructions: receivedItem.usageInstructions,
          categoryId,
          locationId,
          lotNumber: receivedItem.lotNumber,
          initialQuantity: receivedItem.receiveQty,
          currentQuantity: receivedItem.receiveQty,
          unit: receivedItem.unit || poItem.unit || "pcs",
          minStockLevel: typeof receivedItem.minStockLevel === "number" ? receivedItem.minStockLevel : Number(poItem.minStockLevel) || 0,
          manufactureDate: mfgDate,
          expiryDate: expDate,
          shelfLifeDays: receivedItem.shelfLifeDays,
          qrCodeValue,
          status: getStockStatus(receivedItem.receiveQty, typeof receivedItem.minStockLevel === "number" ? receivedItem.minStockLevel : Number(poItem.minStockLevel) || 0),
          imageUrl: receivedItem.imageUrl,
          unitCost: typeof receivedItem.unitCost === "number" ? receivedItem.unitCost : Number(poItem.unitCost) || 0,
          salePrice: typeof receivedItem.salePrice === "number" ? receivedItem.salePrice : 0,
          deletedAt: null,
          deletedBy: null,
          deleteReason: "",
        }], { session: tx });
      }

      poItem.receivedQty = Number(poItem.receivedQty) + receivedItem.receiveQty;
    }

    const allReceived = po.items.every((item: { requestedQty: number; receivedQty: number }) => item.receivedQty >= item.requestedQty);
    const anyReceived = po.items.some((item: { receivedQty: number }) => item.receivedQty > 0);
    po.status = allReceived ? "Received" : anyReceived ? "Partially Received" : "Ordered";
    if (allReceived) po.receivedAt = new Date();
    if (payload.notes) po.notes = `${po.notes || ""}\n[Receive] ${payload.notes}`.trim();

    await po.save({ session: tx });
    await tx.commitTransaction();

    await logAudit("RECEIVE_PO", `รับสินค้าเข้าจาก ${po.poNumber} จำนวน ${payload.receivedItems.length} รายการ`);
    revalidatePharmacyPages();
    return { success: true, message: "รับสินค้าเข้า PO สำเร็จ", data: { poNumber: po.poNumber, status: po.status } };
  } catch (error: unknown) {
    await tx.abortTransaction();
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "ไม่สามารถรับสินค้าเข้าจาก PO ได้" };
  } finally {
    tx.endSession();
  }
}

const sellItemSchema = z.object({
  itemName: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive(),
});

const sellPayloadSchema = z.object({
  items: z.array(sellItemSchema).min(1),
  paymentMethod: z.enum(["cash", "card", "transfer", "e-wallet"]).optional().default("cash"),
  discount: z.coerce.number().nonnegative().optional().default(0),
  taxRate: z.coerce.number().nonnegative().optional().default(0),
  customerName: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export async function sellMedicineAction(rawPayload: unknown) {
  const tx = await mongoose.startSession();
  tx.startTransaction();
  try {
    const session = await getActiveSession();
    const parsed = sellPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Invalid payload");
    const payload = parsed.data;

    await dbConnect();

    let saleNumber = makeNumber("SL");
    while (await Sale.findOne({ saleNumber }).lean()) {
      saleNumber = makeNumber("SL");
    }

    const saleItems: Array<Record<string, unknown>> = [];
    const usageRows: Array<Record<string, unknown>> = [];
    let subtotal = 0;
    let totalCost = 0;

    for (const itemRequest of payload.items) {
      const lots = await StockItem.find({
        itemName: itemRequest.itemName,
        deletedAt: null,
        currentQuantity: { $gt: 0 },
      })
        .sort({ expiryDate: 1, createdAt: 1 })
        .session(tx);

      if (lots.length === 0) {
        throw new Error(`ไม่พบสต๊อกของ ${itemRequest.itemName}`);
      }

      const availableQty = lots.reduce((acc: number, lot: { currentQuantity: number }) => acc + lot.currentQuantity, 0);
      if (availableQty < itemRequest.quantity) {
        throw new Error(`สต๊อก ${itemRequest.itemName} ไม่พอ (คงเหลือ ${availableQty})`);
      }

      let remainingQty = itemRequest.quantity;
      let itemSaleAmount = 0;
      let itemCostAmount = 0;
      const lotAllocations: Array<Record<string, unknown>> = [];
      const defaultUnit = lots[0].unit || "pcs";

      for (const lot of lots) {
        if (remainingQty <= 0) break;
        const withdrawQty = Math.min(remainingQty, lot.currentQuantity);
        if (withdrawQty <= 0) continue;

        lot.currentQuantity -= withdrawQty;
        lot.status = getStockStatus(lot.currentQuantity, lot.minStockLevel);
        await lot.save({ session: tx });

        const unitCost = Number(lot.unitCost) || 0;
        const salePrice = Number(lot.salePrice) || 0;
        itemSaleAmount += withdrawQty * salePrice;
        itemCostAmount += withdrawQty * unitCost;

        lotAllocations.push({
          stockId: lot._id,
          lotNumber: lot.lotNumber,
          quantity: withdrawQty,
          returnedQty: 0,
          unitCost,
          salePrice,
        });

        usageRows.push({
          stockId: lot._id,
          userId: session.user.id,
          quantityUsed: withdrawQty,
          reason: `Sale ${saleNumber}`,
        });

        await recordStockMovement({
          stockId: lot._id,
          itemName: lot.itemName,
          lotNumber: lot.lotNumber,
          branchId: lot.branchId,
          locationId: lot.locationId,
          movementType: "SALE",
          quantity: -withdrawQty,
          balanceAfter: lot.currentQuantity,
          referenceType: "Sale",
          note: `Sale ${saleNumber}`,
          performedBy: session.user.id,
        });

        remainingQty -= withdrawQty;
      }

      subtotal += itemSaleAmount;
      totalCost += itemCostAmount;
      const weightedSalePrice = itemRequest.quantity > 0 ? itemSaleAmount / itemRequest.quantity : 0;
      const weightedCost = itemRequest.quantity > 0 ? itemCostAmount / itemRequest.quantity : 0;

      saleItems.push({
        itemName: itemRequest.itemName,
        quantity: itemRequest.quantity,
        returnedQty: 0,
        unit: defaultUnit,
        unitCost: weightedCost,
        salePrice: weightedSalePrice,
        costAmount: itemCostAmount,
        saleAmount: itemSaleAmount,
        lotAllocations,
      });
    }

    const discount = payload.discount || 0;
    const taxableAmount = Math.max(subtotal - discount, 0);
    const taxAmount = taxableAmount * ((payload.taxRate || 0) / 100);
    const netTotal = taxableAmount + taxAmount;
    const grossProfit = netTotal - totalCost;

    const sale = await Sale.create([{
      saleNumber,
      soldBy: session.user.id,
      soldAt: new Date(),
      paymentMethod: payload.paymentMethod,
      customerName: payload.customerName,
      items: saleItems,
      subtotal,
      discount,
      taxRate: payload.taxRate,
      taxAmount,
      netTotal,
      grossProfit,
      status: "Completed",
      notes: payload.notes,
    }], { session: tx });

    if (usageRows.length > 0) {
      await StockUsage.create(usageRows, { session: tx });
    }

    await tx.commitTransaction();

    await logAudit("SELL_MEDICINE", `ขายยาเลขที่ ${saleNumber} มูลค่าสุทธิ ${netTotal.toFixed(2)}`);
    revalidatePharmacyPages();

    return {
      success: true,
      message: "บันทึกการขายสำเร็จ",
      data: {
        saleId: sale[0]._id.toString(),
        saleNumber,
        subtotal,
        discount,
        taxRate: payload.taxRate,
        taxAmount,
        netTotal,
        grossProfit,
      },
    };
  } catch (error: unknown) {
    await tx.abortTransaction();
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "ไม่สามารถบันทึกการขายได้" };
  } finally {
    tx.endSession();
  }
}

const returnPayloadSchema = z.object({
  saleId: z.string(),
  itemName: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().optional().default(""),
});

export async function returnToStockAction(rawPayload: unknown) {
  const tx = await mongoose.startSession();
  tx.startTransaction();
  try {
    const session = await getActiveSession();
    const parsed = returnPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Invalid payload");
    const payload = parsed.data;

    const saleId = safeObjectId(payload.saleId);
    if (!saleId) throw new Error("Sale ID ไม่ถูกต้อง");

    await dbConnect();

    const sale = await Sale.findById(saleId).session(tx);
    if (!sale) throw new Error("ไม่พบรายการขาย");

    const saleItem = sale.items.find((item: { itemName: string }) => item.itemName === payload.itemName);
    if (!saleItem) throw new Error("ไม่พบสินค้าในบิลนี้");

    const canReturnQty = Number(saleItem.quantity) - Number(saleItem.returnedQty || 0);
    if (payload.quantity > canReturnQty) {
      throw new Error(`คืนได้สูงสุด ${canReturnQty} หน่วย`);
    }

    let remaining = payload.quantity;
    const usageRows: Array<Record<string, unknown>> = [];
    for (const allocation of saleItem.lotAllocations) {
      if (remaining <= 0) break;
      const allocationQty = Number(allocation.quantity) || 0;
      const returnedQty = Number(allocation.returnedQty) || 0;
      const availableForReturn = allocationQty - returnedQty;
      if (availableForReturn <= 0) continue;

      const qtyToReturn = Math.min(availableForReturn, remaining);
      const stock = await StockItem.findOne({ _id: allocation.stockId, deletedAt: null }).session(tx);
      if (!stock) throw new Error(`ไม่พบ stock lot ${allocation.lotNumber} สำหรับคืนสินค้า`);

      stock.currentQuantity += qtyToReturn;
      stock.status = getStockStatus(stock.currentQuantity, stock.minStockLevel);
      await stock.save({ session: tx });

      allocation.returnedQty = returnedQty + qtyToReturn;
      remaining -= qtyToReturn;

      usageRows.push({
        stockId: stock._id,
        userId: session.user.id,
        quantityUsed: -qtyToReturn,
        reason: `Return ${sale.saleNumber}${payload.reason ? `: ${payload.reason}` : ""}`,
      });
    }

    if (remaining > 0) throw new Error("ไม่สามารถคืนสินค้าได้ครบตามจำนวนที่ร้องขอ");

    saleItem.returnedQty = Number(saleItem.returnedQty || 0) + payload.quantity;
    sale.returnHistory.push({
      itemName: payload.itemName,
      quantity: payload.quantity,
      reason: payload.reason,
      returnedBy: safeObjectId(session.user.id),
      returnedAt: new Date(),
    });

    const allRefunded = sale.items.every((item: { quantity: number; returnedQty: number }) => item.returnedQty >= item.quantity);
    sale.status = allRefunded ? "Refunded" : "Partially Returned";
    await sale.save({ session: tx });

    if (usageRows.length > 0) {
      await StockUsage.create(usageRows, { session: tx });
    }

    await tx.commitTransaction();
    await logAudit("RETURN_TO_STOCK", `คืนสินค้าเข้าคลังจากบิล ${sale.saleNumber} จำนวน ${payload.quantity} (${payload.itemName})`);
    revalidatePharmacyPages();
    return { success: true, message: "คืนสินค้าเข้าสต๊อกสำเร็จ" };
  } catch (error: unknown) {
    await tx.abortTransaction();
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "ไม่สามารถคืนสินค้าเข้าสต๊อกได้" };
  } finally {
    tx.endSession();
  }
}

const writeOffPayloadSchema = z.object({
  stockId: z.string(),
  quantity: z.coerce.number().int().positive(),
  reason: z.enum(["Expired", "Damaged", "Lost", "Regulatory", "Other"]),
  note: z.string().optional().default(""),
});

export async function writeOffStockAction(rawPayload: unknown) {
  try {
    const session = await requireAdminSession();
    const parsed = writeOffPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Invalid payload" };
    const payload = parsed.data;

    const stockId = safeObjectId(payload.stockId);
    if (!stockId) return { success: false, message: "Stock ID ไม่ถูกต้อง" };

    await dbConnect();
    const stock = await StockItem.findOne({ _id: stockId, deletedAt: null });
    if (!stock) return { success: false, message: "ไม่พบรายการสต๊อก" };
    if (stock.currentQuantity < payload.quantity) {
      return { success: false, message: `จำนวนไม่พอสำหรับตัดสูญเสีย (คงเหลือ ${stock.currentQuantity})` };
    }

    stock.currentQuantity -= payload.quantity;
    stock.status = getStockStatus(stock.currentQuantity, stock.minStockLevel);
    await stock.save();

    const unitCost = Number(stock.unitCost) || 0;
    await StockWriteOff.create({
      stockId: stock._id,
      itemName: stock.itemName,
      lotNumber: stock.lotNumber,
      quantity: payload.quantity,
      reason: payload.reason,
      note: payload.note,
      unit: stock.unit,
      unitCost,
      totalCost: unitCost * payload.quantity,
      writtenOffBy: safeObjectId(session.user.id),
      writtenOffAt: new Date(),
    });

    await StockUsage.create({
      stockId: stock._id,
      userId: session.user.id,
      quantityUsed: payload.quantity,
      reason: `WriteOff ${payload.reason}${payload.note ? `: ${payload.note}` : ""}`,
    });

    await logAudit("WRITE_OFF_STOCK", `ตัดสูญเสีย ${stock.itemName} Lot ${stock.lotNumber} จำนวน ${payload.quantity} | ${payload.reason}`);
    revalidatePharmacyPages();
    return { success: true, message: "บันทึกตัดสูญเสียสำเร็จ" };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "ไม่สามารถบันทึกตัดสูญเสียได้" };
  }
}

const cycleCountItemSchema = z.object({
  stockId: z.string(),
  actualQty: z.coerce.number().int().nonnegative(),
  reason: z.string().optional().default(""),
});

const cycleCountPayloadSchema = z.object({
  note: z.string().optional().default(""),
  counts: z.array(cycleCountItemSchema).min(1),
});

export async function cycleCountAction(rawPayload: unknown) {
  try {
    await requireAdminSession();
    const parsed = cycleCountPayloadSchema.safeParse(rawPayload);
    if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Invalid payload" };
    const payload = parsed.data;

    await dbConnect();

    const results: Array<Record<string, unknown>> = [];
    for (const row of payload.counts) {
      const stockId = safeObjectId(row.stockId);
      if (!stockId) continue;

      const stock = await StockItem.findOne({ _id: stockId, deletedAt: null });
      if (!stock) continue;

      const oldQty = Number(stock.currentQuantity) || 0;
      const nextQty = row.actualQty;
      const variance = nextQty - oldQty;

      stock.currentQuantity = nextQty;
      stock.status = getStockStatus(nextQty, stock.minStockLevel);
      await stock.save();

      results.push({
        stockId: stock._id.toString(),
        itemName: stock.itemName,
        lotNumber: stock.lotNumber,
        oldQty,
        newQty: nextQty,
        variance,
        reason: row.reason || "",
      });
    }

    if (results.length === 0) return { success: false, message: "ไม่มีรายการที่ปรับยอดได้" };

    await logAudit("CYCLE_COUNT", `Cycle count ${results.length} รายการ${payload.note ? ` | ${payload.note}` : ""}`);
    revalidatePharmacyPages();
    return { success: true, message: "บันทึก Cycle Count สำเร็จ", data: results };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "ไม่สามารถบันทึก Cycle Count ได้" };
  }
}

const alertPayloadSchema = z.object({
  daysToExpire: z.coerce.number().int().positive().optional().default(30),
});

export async function getStockAlertsAction(rawPayload?: unknown) {
  try {
    await getActiveSession();
    const parsed = alertPayloadSchema.safeParse(rawPayload || {});
    if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Invalid payload" };

    const { daysToExpire } = parsed.data;
    await dbConnect();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysToExpire);

    const lowStock = await StockItem.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: "$itemName",
          totalQty: { $sum: "$currentQuantity" },
          minStockLevel: { $max: "$minStockLevel" },
          unit: { $first: "$unit" },
        },
      },
      { $match: { $expr: { $and: [{ $gt: ["$totalQty", 0] }, { $lte: ["$totalQty", "$minStockLevel"] }] } } },
      { $sort: { totalQty: 1 } },
      { $limit: 50 },
    ]);

    const outOfStock = await StockItem.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: "$itemName",
          totalQty: { $sum: "$currentQuantity" },
          unit: { $first: "$unit" },
        },
      },
      { $match: { $expr: { $lte: ["$totalQty", 0] } } },
      { $sort: { _id: 1 } },
      { $limit: 50 },
    ]);

    const expiringSoon = await StockItem.find({
      deletedAt: null,
      currentQuantity: { $gt: 0 },
      expiryDate: { $lte: targetDate },
    })
      .select("itemName lotNumber expiryDate currentQuantity unit")
      .sort({ expiryDate: 1 })
      .limit(100)
      .lean();

    return {
      success: true,
      data: {
        daysToExpire,
        summary: {
          lowStockCount: lowStock.length,
          outOfStockCount: outOfStock.length,
          expiringSoonCount: expiringSoon.length,
        },
        lowStock,
        outOfStock,
        expiringSoon,
      },
    };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "ไม่สามารถดึงข้อมูลแจ้งเตือนได้" };
  }
}

const dailyReportPayloadSchema = z.object({
  date: z.string().optional(),
});

export async function getDailyPharmacyReportAction(rawPayload?: unknown) {
  try {
    await getActiveSession();
    const parsed = dailyReportPayloadSchema.safeParse(rawPayload || {});
    if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Invalid payload" };

    const dateBase = parsed.data.date ? new Date(parsed.data.date) : new Date();
    if (Number.isNaN(dateBase.getTime())) return { success: false, message: "Invalid date format" };

    const start = new Date(dateBase);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    await dbConnect();

    const sales = await Sale.find({ soldAt: { $gte: start, $lt: end } }).lean();
    const summary = sales.reduce(
      (acc, sale: Record<string, unknown>) => {
        const subtotal = Number(sale.subtotal) || 0;
        const discount = Number(sale.discount) || 0;
        const netTotal = Number(sale.netTotal) || 0;
        const grossProfit = Number(sale.grossProfit) || 0;
        acc.transactionCount += 1;
        acc.subtotal += subtotal;
        acc.discount += discount;
        acc.netSales += netTotal;
        acc.grossProfit += grossProfit;
        return acc;
      },
      { transactionCount: 0, subtotal: 0, discount: 0, netSales: 0, grossProfit: 0 }
    );

    const topItems = await Sale.aggregate([
      { $match: { soldAt: { $gte: start, $lt: end } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.itemName",
          quantity: { $sum: "$items.quantity" },
          salesAmount: { $sum: "$items.saleAmount" },
        },
      },
      { $sort: { salesAmount: -1 } },
      { $limit: 10 },
    ]);

    const expiringThreshold = new Date();
    expiringThreshold.setDate(expiringThreshold.getDate() + 30);
    const nearExpiryCount = await StockItem.countDocuments({
      deletedAt: null,
      currentQuantity: { $gt: 0 },
      expiryDate: { $lte: expiringThreshold },
    });

    const lowStockCount = (
      await StockItem.aggregate([
        { $match: { deletedAt: null } },
        {
          $group: {
            _id: "$itemName",
            totalQty: { $sum: "$currentQuantity" },
            minStockLevel: { $max: "$minStockLevel" },
          },
        },
        { $match: { $expr: { $and: [{ $gt: ["$totalQty", 0] }, { $lte: ["$totalQty", "$minStockLevel"] }] } } },
      ])
    ).length;

    return {
      success: true,
      data: {
        date: start.toISOString().slice(0, 10),
        summary: {
          ...summary,
          averageTicket: summary.transactionCount > 0 ? summary.netSales / summary.transactionCount : 0,
        },
        inventoryFlags: {
          nearExpiryCount,
          lowStockCount,
        },
        topItems,
      },
    };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "ไม่สามารถดึงรายงานประจำวันได้" };
  }
}
