"use server";

import { addDays, subDays } from "date-fns";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import dbConnect from "@/lib/dbConnect";
import { requireAdmin, requirePermission, requireSession } from "@/lib/authz";
import { logAudit } from "@/app/actions/system";
import ApprovalRequest from "@/models/ApprovalRequest";
import AlertDelivery from "@/models/AlertDelivery";
import Branch from "@/models/Branch";
import Category from "@/models/Category";
import GoodsReceipt from "@/models/GoodsReceipt";
import Location from "@/models/Location";
import PurchaseOrder from "@/models/PurchaseOrder";
import PurchaseRequest from "@/models/PurchaseRequest";
import RecallCase from "@/models/RecallCase";
import Sale from "@/models/Sale";
import StockItem from "@/models/StockItem";
import StockMovement from "@/models/StockMovement";
import StockUsage from "@/models/StockUsage";
import SupplierInvoice from "@/models/SupplierInvoice";
import TransferRequest from "@/models/TransferRequest";
import User from "@/models/User";

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function makeNumber(prefix: string) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${yyyy}${mm}${dd}-${random}`;
}

async function makeUniqueNumber(model: mongoose.Model<any>, field: string, prefix: string) {
  let value = makeNumber(prefix);
  while (await model.findOne({ [field]: value }).lean()) {
    value = makeNumber(prefix);
  }
  return value;
}

function objectId(value?: string | null) {
  return value && mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(value) : null;
}

function getStockStatus(currentQuantity: number, minStockLevel: number) {
  if (currentQuantity <= 0) return "Out of Stock";
  if (currentQuantity <= minStockLevel) return "Low Stock";
  return "Healthy";
}

function revalidateEnterprise() {
  [
    "/",
    "/alerts",
    "/approvals",
    "/branches",
    "/integrations",
    "/pos",
    "/procurement",
    "/purchase",
    "/recall",
    "/reports",
    "/stock",
    "/system",
    "/transfer",
    "/usage",
  ].forEach((path) => revalidatePath(path));
}

export async function recordStockMovement(payload: {
  stockId: mongoose.Types.ObjectId | string;
  itemName: string;
  lotNumber: string;
  branchId?: mongoose.Types.ObjectId | string | null;
  locationId?: mongoose.Types.ObjectId | string | null;
  movementType: "IN" | "OUT" | "TRANSFER_IN" | "TRANSFER_OUT" | "ADJUST" | "SALE" | "RETURN" | "WRITE_OFF" | "RECALL";
  quantity: number;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: mongoose.Types.ObjectId | string | null;
  note?: string;
  performedBy?: mongoose.Types.ObjectId | string | null;
}) {
  await StockMovement.create({
    ...payload,
    stockId: objectId(String(payload.stockId)) || payload.stockId,
    branchId: payload.branchId ? objectId(String(payload.branchId)) : null,
    locationId: payload.locationId ? objectId(String(payload.locationId)) : null,
    referenceId: payload.referenceId ? objectId(String(payload.referenceId)) : null,
    performedBy: payload.performedBy ? objectId(String(payload.performedBy)) : null,
  });
}

export async function getAlertsDashboardAction() {
  await requireSession();
  await dbConnect();

  const targetDate = addDays(new Date(), 30);

  const [
    lowStock,
    outOfStock,
    expiringSoon,
    pendingTransfers,
    pendingApprovals,
    lastDeliveries,
  ] = await Promise.all([
    StockItem.aggregate([
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
    ]),
    StockItem.aggregate([
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
    ]),
    StockItem.find({
      deletedAt: null,
      currentQuantity: { $gt: 0 },
      expiryDate: { $lte: targetDate },
    })
      .populate("locationId", "name")
      .populate("branchId", "name code")
      .select("itemName lotNumber expiryDate currentQuantity unit locationId branchId")
      .sort({ expiryDate: 1 })
      .limit(100)
      .lean(),
    TransferRequest.find({ status: "Pending" })
      .populate("sourceLocationId", "name")
      .populate("targetLocationId", "name")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    ApprovalRequest.countDocuments({ status: "Pending" }),
    AlertDelivery.find().sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  return serialize({
    summary: {
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      expiringSoonCount: expiringSoon.length,
      pendingTransferCount: pendingTransfers.length,
      pendingApprovalCount: pendingApprovals,
    },
    lowStock,
    outOfStock,
    expiringSoon,
    pendingTransfers,
    lastDeliveries,
  });
}

export async function sendAlertDigestAction() {
  try {
    const session = await requireAdmin();
    const data = await getAlertsDashboardAction();
    const summary = `Alerts: ${data.summary.expiringSoonCount} expiring, ${data.summary.lowStockCount} low, ${data.summary.outOfStockCount} out, ${data.summary.pendingTransferCount} transfer pending`;
    const payload = {
      text: summary,
      summary: data.summary,
      generatedAt: new Date().toISOString(),
    };

    const targets = [
      { channel: "webhook", url: process.env.ALERT_WEBHOOK_URL },
      { channel: "email-webhook", url: process.env.ALERT_EMAIL_WEBHOOK_URL },
      { channel: "line-webhook", url: process.env.ALERT_LINE_WEBHOOK_URL },
    ].filter((target): target is { channel: string; url: string } => Boolean(target.url));

    await dbConnect();
    if (targets.length === 0) {
      await AlertDelivery.create({
        channel: "dashboard",
        status: "Skipped",
        summary: "No alert webhook env configured",
        sentBy: objectId(session.user.id),
      });
      return { success: true, message: "ยังไม่ได้ตั้งค่า webhook สำหรับส่งอีเมล/ไลน์ ระบบบันทึก dashboard alert แล้ว" };
    }

    for (const target of targets) {
      try {
        const response = await fetch(target.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        await AlertDelivery.create({
          channel: target.channel,
          status: response.ok ? "Sent" : "Failed",
          summary,
          responseCode: response.status,
          sentBy: objectId(session.user.id),
        });
      } catch (error: unknown) {
        await AlertDelivery.create({
          channel: target.channel,
          status: "Failed",
          summary,
          errorMessage: error instanceof Error ? error.message : "Unknown webhook error",
          sentBy: objectId(session.user.id),
        });
      }
    }

    await logAudit("SEND_ALERT_DIGEST", summary);
    revalidateEnterprise();
    return { success: true, message: "ส่ง alert digest แล้ว" };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "ส่ง alert digest ไม่สำเร็จ" };
  }
}

const branchSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(1).max(12),
  address: z.string().optional().default(""),
  contactName: z.string().optional().default(""),
  contactPhone: z.string().optional().default(""),
});

export async function createBranchAction(rawPayload: unknown) {
  try {
    await requireAdmin();
    const parsed = branchSchema.safeParse(rawPayload);
    if (!parsed.success) return { success: false, message: "ข้อมูลสาขาไม่ถูกต้อง" };

    await dbConnect();
    await Branch.create({ ...parsed.data, code: parsed.data.code.toUpperCase() });
    await logAudit("CREATE_BRANCH", `สร้างสาขา ${parsed.data.name}`);
    revalidateEnterprise();
    return { success: true, message: "สร้างสาขาสำเร็จ" };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "สร้างสาขาไม่สำเร็จ" };
  }
}

export async function assignLocationBranchAction(rawPayload: unknown) {
  try {
    await requireAdmin();
    const parsed = z.object({ locationId: z.string(), branchId: z.string().optional().default("") }).safeParse(rawPayload);
    if (!parsed.success) return { success: false, message: "ข้อมูลไม่ถูกต้อง" };

    await dbConnect();
    await Location.findByIdAndUpdate(parsed.data.locationId, { branchId: objectId(parsed.data.branchId) });
    await StockItem.updateMany({ locationId: parsed.data.locationId }, { branchId: objectId(parsed.data.branchId) });
    await logAudit("ASSIGN_LOCATION_BRANCH", `ผูก location เข้ากับ branch`);
    revalidateEnterprise();
    return { success: true, message: "อัปเดตสาขาของ Location แล้ว" };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "อัปเดตสาขาไม่สำเร็จ" };
  }
}

export async function assignUserBranchAction(rawPayload: unknown) {
  try {
    await requireAdmin();
    const parsed = z.object({ userId: z.string(), branchId: z.string().optional().default("") }).safeParse(rawPayload);
    if (!parsed.success) return { success: false, message: "ข้อมูลไม่ถูกต้อง" };

    await dbConnect();
    await User.findByIdAndUpdate(parsed.data.userId, { branchId: objectId(parsed.data.branchId) });
    await logAudit("ASSIGN_USER_BRANCH", `ผูก user เข้ากับ branch`);
    revalidateEnterprise();
    return { success: true, message: "อัปเดตสาขาของผู้ใช้แล้ว" };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "อัปเดตผู้ใช้ไม่สำเร็จ" };
  }
}

const purchaseRequestItemSchema = z.object({
  itemName: z.string().trim().min(1),
  requestedQty: z.coerce.number().int().positive(),
  unit: z.string().trim().optional().default("pcs"),
  unitCost: z.coerce.number().nonnegative().optional().default(0),
  categoryId: z.string().optional().default(""),
  medicineType: z.string().optional().default("General"),
  reason: z.string().optional().default(""),
});

const purchaseRequestSchema = z.object({
  supplierName: z.string().optional().default(""),
  branchId: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  items: z.array(purchaseRequestItemSchema).min(1),
});

export async function createPurchaseRequestAction(rawPayload: unknown) {
  try {
    const session = await requirePermission("purchase:request");
    const parsed = purchaseRequestSchema.safeParse(rawPayload);
    if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Invalid PR" };

    await dbConnect();
    const prNumber = await makeUniqueNumber(PurchaseRequest, "prNumber", "PR");
    const items = parsed.data.items.map((item) => ({
      ...item,
      categoryId: objectId(item.categoryId),
    }));
    const totalEstimatedCost = items.reduce((acc, item) => acc + item.requestedQty * item.unitCost, 0);

    const pr = await PurchaseRequest.create({
      prNumber,
      supplierName: parsed.data.supplierName,
      branchId: objectId(parsed.data.branchId) || objectId(session.user.branchId || ""),
      items,
      totalEstimatedCost,
      requestedBy: objectId(session.user.id),
      notes: parsed.data.notes,
      status: "Pending Approval",
    });

    await ApprovalRequest.create({
      requestNumber: await makeUniqueNumber(ApprovalRequest, "requestNumber", "APR"),
      actionType: "PURCHASE_REQUEST",
      summary: `อนุมัติ PR ${prNumber} มูลค่า ${totalEstimatedCost.toFixed(2)}`,
      payload: { prId: pr._id.toString() },
      requestedBy: objectId(session.user.id),
    });

    await logAudit("CREATE_PR", `สร้างใบขอซื้อ ${prNumber}`);
    revalidateEnterprise();
    return { success: true, message: "สร้าง PR และส่งอนุมัติแล้ว", data: serialize(pr) };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "สร้าง PR ไม่สำเร็จ" };
  }
}

async function convertPurchaseRequestToPO(prId: string, reviewerId: string) {
  const pr = await PurchaseRequest.findById(prId);
  if (!pr) throw new Error("ไม่พบ PR");
  if (!["Pending Approval", "Approved"].includes(pr.status)) throw new Error("PR นี้ไม่อยู่ในสถานะที่อนุมัติได้");

  const poNumber = await makeUniqueNumber(PurchaseOrder, "poNumber", "PO");
  const po = await PurchaseOrder.create({
    poNumber,
    supplierName: pr.supplierName,
    status: "Ordered",
    items: pr.items.map((item: any) => ({
      itemName: item.itemName,
      requestedQty: item.requestedQty,
      receivedQty: 0,
      unit: item.unit,
      unitCost: item.unitCost,
      categoryId: item.categoryId || null,
      medicineType: item.medicineType,
      minStockLevel: 0,
    })),
    totalEstimatedCost: pr.totalEstimatedCost,
    notes: pr.notes,
    orderedBy: objectId(reviewerId),
    orderedAt: new Date(),
  });

  pr.status = "Converted to PO";
  pr.reviewedBy = objectId(reviewerId);
  pr.reviewedAt = new Date();
  pr.convertedPoId = po._id;
  await pr.save();
  return po;
}

const receiveGoodsSchema = z.object({
  poId: z.string(),
  locationId: z.string(),
  notes: z.string().optional().default(""),
  items: z.array(z.object({
    itemName: z.string().trim().min(1),
    quantity: z.coerce.number().int().positive(),
    lotNumber: z.string().trim().min(1),
    manufactureDate: z.string(),
    shelfLifeDays: z.coerce.number().int().positive(),
    unit: z.string().optional().default("pcs"),
    unitCost: z.coerce.number().nonnegative().optional().default(0),
    salePrice: z.coerce.number().nonnegative().optional().default(0),
    categoryId: z.string().optional().default(""),
    minStockLevel: z.coerce.number().nonnegative().optional().default(0),
  })).min(1),
});

export async function receiveGoodsReceiptAction(rawPayload: unknown) {
  try {
    const session = await requirePermission("stock:write");
    const parsed = receiveGoodsSchema.safeParse(rawPayload);
    if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Invalid GRN" };

    await dbConnect();
    const payload = parsed.data;
    const po = await PurchaseOrder.findById(payload.poId);
    if (!po) return { success: false, message: "ไม่พบ PO" };
    if (po.status === "Cancelled") return { success: false, message: "PO ถูกยกเลิกแล้ว" };

    const location = await Location.findById(payload.locationId).lean() as any;
    const branchId = location?.branchId || objectId(session.user.branchId || "");
    const grnItems: any[] = [];

    for (const item of payload.items) {
      const poItem = po.items.find((row: any) => row.itemName === item.itemName);
      if (!poItem) return { success: false, message: `${item.itemName} ไม่อยู่ใน PO นี้` };

      const remaining = Number(poItem.requestedQty) - Number(poItem.receivedQty || 0);
      if (item.quantity > remaining) return { success: false, message: `รับ ${item.itemName} เกินจำนวนค้างรับ` };

      const mfgDate = new Date(item.manufactureDate);
      const expiryDate = addDays(mfgDate, item.shelfLifeDays);
      const qrCodeValue = `${item.itemName.toUpperCase().replace(/\s+/g, "-")}-${item.lotNumber}-${payload.locationId}`;

      let stock = await StockItem.findOne({ itemName: item.itemName, lotNumber: item.lotNumber, locationId: payload.locationId, deletedAt: null });
      if (stock) {
        stock.currentQuantity += item.quantity;
        stock.initialQuantity += item.quantity;
        stock.status = getStockStatus(stock.currentQuantity, stock.minStockLevel);
        await stock.save();
      } else {
        stock = await StockItem.create({
          itemName: item.itemName,
          categoryId: objectId(item.categoryId) || poItem.categoryId || null,
          locationId: objectId(payload.locationId),
          branchId,
          lotNumber: item.lotNumber,
          initialQuantity: item.quantity,
          currentQuantity: item.quantity,
          unit: item.unit || poItem.unit || "pcs",
          minStockLevel: item.minStockLevel,
          manufactureDate: mfgDate,
          expiryDate,
          shelfLifeDays: item.shelfLifeDays,
          qrCodeValue,
          status: getStockStatus(item.quantity, item.minStockLevel),
          unitCost: item.unitCost || poItem.unitCost || 0,
          salePrice: item.salePrice,
          medicineType: poItem.medicineType || "General",
          deletedAt: null,
        });
      }

      poItem.receivedQty = Number(poItem.receivedQty || 0) + item.quantity;
      grnItems.push({
        stockId: stock._id,
        itemName: item.itemName,
        lotNumber: item.lotNumber,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unitCost || poItem.unitCost || 0,
        expiryDate,
      });

      await recordStockMovement({
        stockId: stock._id,
        itemName: stock.itemName,
        lotNumber: stock.lotNumber,
        branchId,
        locationId: payload.locationId,
        movementType: "IN",
        quantity: item.quantity,
        balanceAfter: stock.currentQuantity,
        referenceType: "GoodsReceipt",
        note: `GRN from ${po.poNumber}`,
        performedBy: session.user.id,
      });
    }

    const allReceived = po.items.every((item: any) => Number(item.receivedQty || 0) >= Number(item.requestedQty || 0));
    const anyReceived = po.items.some((item: any) => Number(item.receivedQty || 0) > 0);
    po.status = allReceived ? "Received" : anyReceived ? "Partially Received" : "Ordered";
    if (allReceived) po.receivedAt = new Date();
    await po.save();

    const grnNumber = await makeUniqueNumber(GoodsReceipt, "grnNumber", "GRN");
    const grn = await GoodsReceipt.create({
      grnNumber,
      poId: po._id,
      poNumber: po.poNumber,
      branchId,
      locationId: objectId(payload.locationId),
      receivedBy: objectId(session.user.id),
      items: grnItems,
      notes: payload.notes,
    });

    await logAudit("CREATE_GRN", `รับสินค้า ${grnNumber} จาก ${po.poNumber}`);
    revalidateEnterprise();
    return { success: true, message: "รับของเข้าและเพิ่ม lot เข้าสต๊อกแล้ว", data: serialize(grn) };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "รับของเข้าไม่สำเร็จ" };
  }
}

const invoiceSchema = z.object({
  invoiceNumber: z.string().trim().min(1),
  poId: z.string().optional().default(""),
  grnId: z.string().optional().default(""),
  supplierName: z.string().optional().default(""),
  invoiceDate: z.string().optional().default(""),
  dueDate: z.string().optional().default(""),
  subtotal: z.coerce.number().nonnegative(),
  taxAmount: z.coerce.number().nonnegative().optional().default(0),
  discount: z.coerce.number().nonnegative().optional().default(0),
  paidAmount: z.coerce.number().nonnegative().optional().default(0),
  notes: z.string().optional().default(""),
});

export async function createSupplierInvoiceAction(rawPayload: unknown) {
  try {
    const session = await requireAdmin();
    const parsed = invoiceSchema.safeParse(rawPayload);
    if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message || "Invalid invoice" };
    const payload = parsed.data;

    await dbConnect();
    const totalAmount = Math.max(payload.subtotal + payload.taxAmount - payload.discount, 0);
    const paidAmount = Math.min(payload.paidAmount, totalAmount);
    const invoice = await SupplierInvoice.create({
      ...payload,
      poId: objectId(payload.poId),
      grnId: objectId(payload.grnId),
      invoiceDate: payload.invoiceDate ? new Date(payload.invoiceDate) : new Date(),
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      totalAmount,
      paidAmount,
      status: paidAmount >= totalAmount ? "Paid" : paidAmount > 0 ? "Partially Paid" : "Unpaid",
      createdBy: objectId(session.user.id),
    });

    await logAudit("CREATE_SUPPLIER_INVOICE", `บันทึกใบกำกับ ${payload.invoiceNumber}`);
    revalidateEnterprise();
    return { success: true, message: "บันทึกใบกำกับแล้ว", data: serialize(invoice) };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "บันทึกใบกำกับไม่สำเร็จ" };
  }
}

const approvalSchema = z.object({
  actionType: z.enum(["DELETE_STOCK", "TRANSFER_STOCK", "ADJUST_STOCK", "WRITE_OFF"]),
  summary: z.string().trim().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export async function createApprovalRequestAction(rawPayload: unknown) {
  try {
    const session = await requireSession();
    const parsed = approvalSchema.safeParse(rawPayload);
    if (!parsed.success) return { success: false, message: "ข้อมูลคำขออนุมัติไม่ถูกต้อง" };

    await dbConnect();
    const request = await ApprovalRequest.create({
      requestNumber: await makeUniqueNumber(ApprovalRequest, "requestNumber", "APR"),
      actionType: parsed.data.actionType,
      summary: parsed.data.summary,
      payload: parsed.data.payload,
      requestedBy: objectId(session.user.id),
    });

    await logAudit("CREATE_APPROVAL_REQUEST", `${request.requestNumber}: ${parsed.data.summary}`);
    revalidateEnterprise();
    return { success: true, message: "ส่งคำขออนุมัติแล้ว", data: serialize(request) };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "ส่งคำขอไม่สำเร็จ" };
  }
}

export async function createTransferRequestAction(rawPayload: unknown) {
  try {
    const session = await requirePermission("transfer:request");
    const parsed = z.object({
      sourceId: z.string(),
      targetLocationId: z.string(),
      transferQty: z.coerce.number().int().positive(),
      reason: z.string().optional().default(""),
    }).safeParse(rawPayload);
    if (!parsed.success) return { success: false, message: "ข้อมูลคำขอโอนไม่ถูกต้อง" };

    await dbConnect();
    const stock = await StockItem.findOne({ _id: parsed.data.sourceId, deletedAt: null });
    if (!stock) return { success: false, message: "ไม่พบ stock ต้นทาง" };
    if (stock.currentQuantity < parsed.data.transferQty) return { success: false, message: "จำนวนต้นทางไม่พอ" };
    const targetLocation = await Location.findById(parsed.data.targetLocationId).lean() as any;
    if (!targetLocation) return { success: false, message: "ไม่พบ location ปลายทาง" };

    const request = await TransferRequest.create({
      requestNumber: await makeUniqueNumber(TransferRequest, "requestNumber", "TR"),
      sourceStockId: stock._id,
      itemName: stock.itemName,
      lotNumber: stock.lotNumber,
      sourceLocationId: stock.locationId,
      targetLocationId: objectId(parsed.data.targetLocationId),
      sourceBranchId: stock.branchId || null,
      targetBranchId: targetLocation.branchId || null,
      quantity: parsed.data.transferQty,
      reason: parsed.data.reason,
      requestedBy: objectId(session.user.id),
    });

    await ApprovalRequest.create({
      requestNumber: await makeUniqueNumber(ApprovalRequest, "requestNumber", "APR"),
      actionType: "TRANSFER_STOCK",
      summary: `อนุมัติโอน ${stock.itemName} Lot ${stock.lotNumber} จำนวน ${parsed.data.transferQty}`,
      payload: parsed.data,
      requestedBy: objectId(session.user.id),
    });

    await logAudit("CREATE_TRANSFER_REQUEST", `สร้างคำขอโอน ${request.requestNumber}`);
    revalidateEnterprise();
    return { success: true, message: "ส่งคำขอโอนและรออนุมัติแล้ว", data: serialize(request) };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "สร้างคำขอโอนไม่สำเร็จ" };
  }
}

async function executeApprovedRequest(request: any, reviewerId: string) {
  const payload = request.payload || {};
  if (request.actionType === "PURCHASE_REQUEST") {
    const po = await convertPurchaseRequestToPO(payload.prId, reviewerId);
    return `สร้าง PO ${po.poNumber} จาก PR`;
  }

  if (request.actionType === "ADJUST_STOCK") {
    const stock = await StockItem.findOne({ _id: payload.stockId, deletedAt: null });
    if (!stock) throw new Error("ไม่พบ stock");
    const oldQty = Number(stock.currentQuantity) || 0;
    const nextQty = Number(payload.newQty);
    if (!Number.isFinite(nextQty) || nextQty < 0) throw new Error("จำนวนใหม่ไม่ถูกต้อง");
    stock.currentQuantity = nextQty;
    stock.status = getStockStatus(nextQty, stock.minStockLevel);
    await stock.save();
    await recordStockMovement({
      stockId: stock._id,
      itemName: stock.itemName,
      lotNumber: stock.lotNumber,
      branchId: stock.branchId,
      locationId: stock.locationId,
      movementType: "ADJUST",
      quantity: nextQty - oldQty,
      balanceAfter: nextQty,
      referenceType: "ApprovalRequest",
      referenceId: request._id,
      note: payload.reason || "",
      performedBy: reviewerId,
    });
    return `ปรับยอด ${stock.itemName} จาก ${oldQty} เป็น ${nextQty}`;
  }

  if (request.actionType === "DELETE_STOCK") {
    const stock = await StockItem.findOne({ _id: payload.stockId, deletedAt: null });
    if (!stock) throw new Error("ไม่พบ stock");
    stock.deletedAt = new Date();
    stock.deletedBy = objectId(reviewerId);
    stock.deleteReason = payload.reason || "Approved archive";
    await stock.save();
    return `ย้าย ${stock.itemName} Lot ${stock.lotNumber} เข้า Recycle Bin`;
  }

  if (request.actionType === "TRANSFER_STOCK") {
    const stock = await StockItem.findOne({ _id: payload.sourceId, deletedAt: null });
    if (!stock) throw new Error("ไม่พบ stock ต้นทาง");
    const transferQty = Number(payload.transferQty);
    const targetLocationId = String(payload.targetLocationId || "");
    if (!Number.isFinite(transferQty) || transferQty <= 0) throw new Error("จำนวนโอนไม่ถูกต้อง");
    if (stock.currentQuantity < transferQty) throw new Error("จำนวนต้นทางไม่พอ");

    const targetLocation = await Location.findById(targetLocationId).lean() as any;
    const targetBranchId = targetLocation?.branchId || null;
    let targetStock = await StockItem.findOne({
      itemName: stock.itemName,
      lotNumber: stock.lotNumber,
      locationId: targetLocationId,
      deletedAt: null,
    });

    if (targetStock) {
      targetStock.currentQuantity += transferQty;
      targetStock.status = getStockStatus(targetStock.currentQuantity, targetStock.minStockLevel);
      await targetStock.save();
    } else {
      const cloned = stock.toObject();
      delete cloned._id;
      targetStock = await StockItem.create({
        ...cloned,
        locationId: objectId(targetLocationId),
        branchId: targetBranchId,
        initialQuantity: transferQty,
        currentQuantity: transferQty,
        status: getStockStatus(transferQty, cloned.minStockLevel),
        qrCodeValue: `${cloned.itemName.toUpperCase().replace(/\s+/g, "-")}-${cloned.lotNumber}-${targetLocationId}`,
        deletedAt: null,
        deletedBy: null,
        deleteReason: "",
      });
    }

    stock.currentQuantity -= transferQty;
    stock.status = getStockStatus(stock.currentQuantity, stock.minStockLevel);
    await stock.save();
    await recordStockMovement({
      stockId: stock._id,
      itemName: stock.itemName,
      lotNumber: stock.lotNumber,
      branchId: stock.branchId,
      locationId: stock.locationId,
      movementType: "TRANSFER_OUT",
      quantity: -transferQty,
      balanceAfter: stock.currentQuantity,
      referenceType: "ApprovalRequest",
      referenceId: request._id,
      performedBy: reviewerId,
    });
    await recordStockMovement({
      stockId: targetStock._id,
      itemName: targetStock.itemName,
      lotNumber: targetStock.lotNumber,
      branchId: targetStock.branchId,
      locationId: targetStock.locationId,
      movementType: "TRANSFER_IN",
      quantity: transferQty,
      balanceAfter: targetStock.currentQuantity,
      referenceType: "ApprovalRequest",
      referenceId: request._id,
      performedBy: reviewerId,
    });
    await TransferRequest.findOneAndUpdate(
      {
        sourceStockId: stock._id,
        targetLocationId: objectId(targetLocationId),
        quantity: transferQty,
        status: "Pending",
      },
      {
        status: "Completed",
        reviewedBy: objectId(reviewerId),
        reviewedAt: new Date(),
        completedAt: new Date(),
      }
    );
    return `โอน ${stock.itemName} จำนวน ${transferQty}`;
  }

  return "อนุมัติคำขอแล้ว";
}

export async function reviewApprovalRequestAction(rawPayload: unknown) {
  try {
    const session = await requireAdmin();
    const parsed = z.object({
      requestId: z.string(),
      decision: z.enum(["Approved", "Rejected"]),
      reviewerNote: z.string().optional().default(""),
    }).safeParse(rawPayload);
    if (!parsed.success) return { success: false, message: "ข้อมูลการอนุมัติไม่ถูกต้อง" };

    await dbConnect();
    const request = await ApprovalRequest.findById(parsed.data.requestId);
    if (!request) return { success: false, message: "ไม่พบคำขอ" };
    if (request.status !== "Pending") return { success: false, message: "คำขอนี้ถูกพิจารณาแล้ว" };

    let executionMessage = "";
    if (parsed.data.decision === "Approved") {
      executionMessage = await executeApprovedRequest(request, session.user.id);
    }

    request.status = parsed.data.decision;
    request.reviewedBy = objectId(session.user.id);
    request.reviewedAt = new Date();
    request.reviewerNote = parsed.data.reviewerNote;
    await request.save();

    await logAudit("REVIEW_APPROVAL", `${request.requestNumber}: ${parsed.data.decision} ${executionMessage}`);
    revalidateEnterprise();
    return { success: true, message: parsed.data.decision === "Approved" ? `อนุมัติแล้ว: ${executionMessage}` : "ปฏิเสธคำขอแล้ว" };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "พิจารณาคำขอไม่สำเร็จ" };
  }
}

const recallSchema = z.object({
  itemName: z.string().trim().min(1),
  lotNumber: z.string().trim().optional().default(""),
  reason: z.string().trim().min(1),
  severity: z.enum(["Info", "Warning", "Critical"]).optional().default("Warning"),
  notes: z.string().optional().default(""),
});

export async function createRecallCaseAction(rawPayload: unknown) {
  try {
    const session = await requirePermission("recall:read");
    const parsed = recallSchema.safeParse(rawPayload);
    if (!parsed.success) return { success: false, message: "ข้อมูล recall ไม่ถูกต้อง" };

    await dbConnect();
    const filter: Record<string, unknown> = { itemName: parsed.data.itemName, deletedAt: null };
    if (parsed.data.lotNumber) filter.lotNumber = parsed.data.lotNumber;

    const stocks = await StockItem.find(filter)
      .populate("locationId", "name")
      .populate("branchId", "name code")
      .lean() as any[];

    const affectedStocks = stocks.map((stock) => ({
      stockId: stock._id,
      itemName: stock.itemName,
      lotNumber: stock.lotNumber,
      currentQuantity: stock.currentQuantity,
      locationName: stock.locationId?.name || "",
      branchName: stock.branchId?.name || "",
    }));

    const stockIds = stocks.map((stock) => stock._id);
    const usedRows = await StockUsage.aggregate([
      { $match: { stockId: { $in: stockIds } } },
      { $group: { _id: null, qty: { $sum: "$quantityUsed" } } },
    ]);

    const recall = await RecallCase.create({
      recallNumber: await makeUniqueNumber(RecallCase, "recallNumber", "RC"),
      ...parsed.data,
      affectedStocks,
      totalOnHand: affectedStocks.reduce((acc, stock) => acc + Number(stock.currentQuantity || 0), 0),
      soldOrUsedQty: Number(usedRows[0]?.qty) || 0,
      openedBy: objectId(session.user.id),
    });

    await logAudit("CREATE_RECALL", `เปิด recall ${recall.recallNumber} ${parsed.data.itemName} ${parsed.data.lotNumber || "all lots"}`);
    revalidateEnterprise();
    return { success: true, message: "เปิด Recall Case แล้ว", data: serialize(recall) };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "สร้าง recall ไม่สำเร็จ" };
  }
}

export async function closeRecallCaseAction(rawPayload: unknown) {
  try {
    const session = await requireAdmin();
    const parsed = z.object({ recallId: z.string(), notes: z.string().optional().default("") }).safeParse(rawPayload);
    if (!parsed.success) return { success: false, message: "ข้อมูลไม่ถูกต้อง" };

    await dbConnect();
    const recall = await RecallCase.findById(parsed.data.recallId);
    if (!recall) return { success: false, message: "ไม่พบ recall" };
    recall.status = "Completed";
    recall.closedBy = objectId(session.user.id);
    recall.closedAt = new Date();
    if (parsed.data.notes) recall.notes = parsed.data.notes;
    await recall.save();
    await logAudit("CLOSE_RECALL", `ปิด recall ${recall.recallNumber}`);
    revalidateEnterprise();
    return { success: true, message: "ปิด Recall Case แล้ว" };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "ปิด recall ไม่สำเร็จ" };
  }
}

export async function getReportsAction(rawPayload?: unknown) {
  await requirePermission("reports:read");
  const parsed = z.object({
    days: z.coerce.number().int().positive().max(365).optional().default(30),
  }).safeParse(rawPayload || {});
  const days = parsed.success ? parsed.data.days : 30;
  const start = subDays(new Date(), days);

  await dbConnect();
  const salesSummary = await Sale.aggregate([
    { $match: { soldAt: { $gte: start } } },
    {
      $group: {
        _id: null,
        transactionCount: { $sum: 1 },
        netSales: { $sum: "$netTotal" },
        grossProfit: { $sum: "$grossProfit" },
      },
    },
  ]);

  const usageByUser = await StockUsage.aggregate([
    { $match: { createdAt: { $gte: start } } },
    { $group: { _id: "$userId", quantity: { $sum: "$quantityUsed" }, transactions: { $sum: 1 } } },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    { $project: { name: { $ifNull: ["$user.name", "Unknown"] }, quantity: 1, transactions: 1 } },
    { $sort: { quantity: -1 } },
    { $limit: 20 },
  ]);

  const usageByCategory = await StockUsage.aggregate([
    { $match: { createdAt: { $gte: start } } },
    { $lookup: { from: "stockitems", localField: "stockId", foreignField: "_id", as: "stock" } },
    { $unwind: "$stock" },
    { $lookup: { from: "categories", localField: "stock.categoryId", foreignField: "_id", as: "category" } },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    { $group: { _id: { $ifNull: ["$category.name", "Uncategorized"] }, quantity: { $sum: "$quantityUsed" } } },
    { $sort: { quantity: -1 } },
  ]);

  const usageByBranch = await StockUsage.aggregate([
    { $match: { createdAt: { $gte: start } } },
    { $lookup: { from: "stockitems", localField: "stockId", foreignField: "_id", as: "stock" } },
    { $unwind: "$stock" },
    { $lookup: { from: "branches", localField: "stock.branchId", foreignField: "_id", as: "branch" } },
    { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
    { $group: { _id: { $ifNull: ["$branch.name", "No branch"] }, quantity: { $sum: "$quantityUsed" } } },
    { $sort: { quantity: -1 } },
  ]);

  const abc = await Sale.aggregate([
    { $match: { soldAt: { $gte: start } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.itemName", salesAmount: { $sum: "$items.saleAmount" }, quantity: { $sum: "$items.quantity" } } },
    { $sort: { salesAmount: -1 } },
    { $limit: 50 },
  ]);
  const abcTotal = abc.reduce((acc, item) => acc + Number(item.salesAmount || 0), 0);
  let cumulative = 0;
  const abcAnalysis = abc.map((item) => {
    cumulative += Number(item.salesAmount || 0);
    const ratio = abcTotal > 0 ? cumulative / abcTotal : 0;
    return { ...item, class: ratio <= 0.8 ? "A" : ratio <= 0.95 ? "B" : "C" };
  });

  const activeUsageStockIds = await StockUsage.distinct("stockId", { createdAt: { $gte: start } });
  const deadStock = await StockItem.find({
    deletedAt: null,
    currentQuantity: { $gt: 0 },
    _id: { $nin: activeUsageStockIds },
  })
    .select("itemName lotNumber currentQuantity unit expiryDate")
    .sort({ currentQuantity: -1 })
    .limit(30)
    .lean();

  const inventoryValueRows = await StockItem.aggregate([
    { $match: { deletedAt: null, currentQuantity: { $gt: 0 } } },
    { $group: { _id: null, value: { $sum: { $multiply: ["$currentQuantity", "$unitCost"] } } } },
  ]);
  const inventoryValue = Number(inventoryValueRows[0]?.value) || 0;
  const cogs = Number(salesSummary[0]?.netSales || 0) - Number(salesSummary[0]?.grossProfit || 0);
  const turnover = inventoryValue > 0 ? cogs / inventoryValue : 0;

  return serialize({
    days,
    summary: {
      transactionCount: Number(salesSummary[0]?.transactionCount) || 0,
      netSales: Number(salesSummary[0]?.netSales) || 0,
      grossProfit: Number(salesSummary[0]?.grossProfit) || 0,
      inventoryValue,
      turnover,
    },
    usageByUser,
    usageByCategory,
    usageByBranch,
    abcAnalysis,
    deadStock,
  });
}

export async function importInventoryRowsAction(rawRows: unknown) {
  try {
    const session = await requireAdmin();
    const rows = z.array(z.record(z.string(), z.unknown())).safeParse(rawRows);
    if (!rows.success) return { success: false, message: "รูปแบบไฟล์นำเข้าไม่ถูกต้อง" };

    await dbConnect();
    const defaultCategory = await Category.findOne().lean() as any;
    const defaultLocation = await Location.findOne().lean() as any;
    if (!defaultLocation) return { success: false, message: "กรุณาสร้าง Location ก่อน import" };

    let imported = 0;
    const errors: string[] = [];
    for (const [index, row] of rows.data.entries()) {
      const itemName = String(row["Item Name"] || row["Name"] || row["Product"] || "").trim();
      const quantity = Number(row["Quantity"] || row["Qty"] || row["Stock"] || 0);
      if (!itemName || !Number.isFinite(quantity) || quantity < 0) {
        errors.push(`Row ${index + 2}: missing item name or quantity`);
        continue;
      }
      const lotNumber = String(row["Lot Number"] || row["Lot"] || `IMP-${Date.now()}-${index}`).trim();
      const unit = String(row["Unit"] || "pcs").trim();
      const minStockLevel = Number(row["Min Level"] || row["Min"] || 0);
      const shelfLifeDays = Number(row["Shelf Life Days"] || row["Shelf Life"] || 365);
      const mfgDate = row["Manufacture Date"] ? new Date(String(row["Manufacture Date"])) : new Date();
      const expiryDate = addDays(mfgDate, Number.isFinite(shelfLifeDays) ? shelfLifeDays : 365);
      const locationId = defaultLocation._id;
      const branchId = defaultLocation.branchId || objectId(session.user.branchId || "");
      const qrCodeValue = `${itemName.toUpperCase().replace(/\s+/g, "-")}-${lotNumber}-${locationId.toString()}`;

      const existing = await StockItem.findOne({ qrCodeValue, deletedAt: null });
      if (existing) {
        existing.currentQuantity += quantity;
        existing.initialQuantity += quantity;
        existing.status = getStockStatus(existing.currentQuantity, existing.minStockLevel);
        await existing.save();
      } else {
        await StockItem.create({
          itemName,
          genericName: String(row["Generic Name"] || ""),
          strength: String(row["Strength"] || ""),
          medicineType: String(row["Type"] || row["Medicine Type"] || "General"),
          usageInstructions: String(row["Usage"] || ""),
          categoryId: defaultCategory?._id || null,
          locationId,
          branchId,
          lotNumber,
          initialQuantity: quantity,
          currentQuantity: quantity,
          unit,
          minStockLevel: Number.isFinite(minStockLevel) ? minStockLevel : 0,
          manufactureDate: mfgDate,
          expiryDate,
          shelfLifeDays: Number.isFinite(shelfLifeDays) ? shelfLifeDays : 365,
          qrCodeValue,
          status: getStockStatus(quantity, Number.isFinite(minStockLevel) ? minStockLevel : 0),
          unitCost: Number(row["Unit Cost"] || 0),
          salePrice: Number(row["Sale Price"] || row["Regular price"] || 0),
          imageUrl: String(row["Images"] || row["Image"] || ""),
          deletedAt: null,
        });
      }
      imported += 1;
    }

    await logAudit("IMPORT_INVENTORY", `นำเข้า ${imported} รายการ (${errors.length} errors)`);
    revalidateEnterprise();
    return { success: true, message: `นำเข้าสำเร็จ ${imported} รายการ`, errors };
  } catch (error: unknown) {
    if (error instanceof Error) return { success: false, message: error.message };
    return { success: false, message: "นำเข้าไม่สำเร็จ" };
  }
}
