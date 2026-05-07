"use server";

import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import Location from "@/models/Location";
import { recordStockMovement } from "@/app/actions/enterprise";

function getStockStatus(currentQuantity: number, minStockLevel: number) {
  if (currentQuantity <= 0) return "Out of Stock";
  if (currentQuantity <= minStockLevel) return "Low Stock";
  return "Healthy";
}

export async function transferStockAction(payload: { sourceId: string, targetLocationId: string, transferQty: number }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession) throw new Error("Unauthorized");

    const transferQty = Number(payload.transferQty);
    if (!Number.isFinite(transferQty) || transferQty <= 0) {
      throw new Error("จำนวนที่โอนต้องมากกว่า 0");
    }

    if (!mongoose.Types.ObjectId.isValid(payload.sourceId) || !mongoose.Types.ObjectId.isValid(payload.targetLocationId)) {
      throw new Error("ข้อมูลรายการโอนไม่ถูกต้อง");
    }

    await dbConnect();

    const sourceStock = await StockItem.findOne({ _id: payload.sourceId, deletedAt: null }).session(session);
    if (!sourceStock) throw new Error("ไม่พบข้อมูลสินค้าต้นทาง");
    if (sourceStock.locationId.toString() === payload.targetLocationId) {
      throw new Error("ไม่สามารถโอนไปยังตำแหน่งเดิมได้");
    }
    const targetLocation = await Location.findById(payload.targetLocationId).lean() as { branchId?: mongoose.Types.ObjectId } | null;

    if (sourceStock.currentQuantity < transferQty) throw new Error("จำนวนสินค้าไม่พอสำหรับการโอนย้าย");

    // ตรวจสอบว่ามีรายการเดิมที่ปลายทางหรือไม่ (Lot เดียวกัน)
    const targetStock = await StockItem.findOne({
      itemName: sourceStock.itemName,
      lotNumber: sourceStock.lotNumber,
      locationId: payload.targetLocationId,
      deletedAt: null,
    }).session(session);

    if (targetStock) {
      targetStock.currentQuantity += transferQty;
      targetStock.status = getStockStatus(targetStock.currentQuantity, targetStock.minStockLevel);
      await targetStock.save({ session });
    } else {
      const archivedTargetStock = await StockItem.findOne({
        itemName: sourceStock.itemName,
        lotNumber: sourceStock.lotNumber,
        locationId: payload.targetLocationId,
        deletedAt: { $ne: null },
      }).session(session);

      if (archivedTargetStock) {
        archivedTargetStock.currentQuantity += transferQty;
        archivedTargetStock.deletedAt = null;
        archivedTargetStock.deletedBy = null;
        archivedTargetStock.deleteReason = "";
        archivedTargetStock.status = getStockStatus(archivedTargetStock.currentQuantity, archivedTargetStock.minStockLevel);
        await archivedTargetStock.save({ session });
      } else {
        const newStockData = sourceStock.toObject();
        delete newStockData._id;
        newStockData.locationId = payload.targetLocationId;
        newStockData.branchId = targetLocation?.branchId || null;
        newStockData.initialQuantity = transferQty;
        newStockData.currentQuantity = transferQty;
        newStockData.status = getStockStatus(transferQty, newStockData.minStockLevel);
        newStockData.deletedAt = null;
        newStockData.deletedBy = null;
        newStockData.deleteReason = "";
        // ปรับ QR Code ให้เป็นมาตรฐานเดียวกัน
        newStockData.qrCodeValue = `${newStockData.itemName.toUpperCase().replace(/\s+/g, '-')}-${newStockData.lotNumber}-${payload.targetLocationId}`;
        await StockItem.create([newStockData], { session });
      }
    }

    // หักยอดจากต้นทาง
    sourceStock.currentQuantity -= transferQty;
    sourceStock.status = getStockStatus(sourceStock.currentQuantity, sourceStock.minStockLevel);
    await sourceStock.save({ session });

    await recordStockMovement({
      stockId: sourceStock._id,
      itemName: sourceStock.itemName,
      lotNumber: sourceStock.lotNumber,
      branchId: sourceStock.branchId,
      locationId: sourceStock.locationId,
      movementType: "TRANSFER_OUT",
      quantity: -transferQty,
      balanceAfter: sourceStock.currentQuantity,
      referenceType: "Transfer",
      note: `Transfer to ${payload.targetLocationId}`,
      performedBy: authSession.user.id,
    });

    await session.commitTransaction();
    
    revalidatePath("/stock");
    revalidatePath("/transfer");
    return { success: true, message: "โอนย้ายสต๊อกสำเร็จ!" };
  } catch (error: unknown) {
    await session.abortTransaction();
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "โอนย้ายสต๊อกไม่สำเร็จ" };
  } finally {
    session.endSession();
  }
}
