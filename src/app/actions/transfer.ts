"use server";

import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";

export async function transferStockAction(payload: { sourceId: string, targetLocationId: string, transferQty: number }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession) throw new Error("Unauthorized");

    await dbConnect();

    const sourceStock = await StockItem.findById(payload.sourceId).session(session);
    if (!sourceStock) throw new Error("ไม่พบข้อมูลสินค้าต้นทาง");
    if (sourceStock.currentQuantity < payload.transferQty) throw new Error("จำนวนสินค้าไม่พอสำหรับการโอนย้าย");

    // ตรวจสอบว่ามีรายการเดิมที่ปลายทางหรือไม่ (Lot เดียวกัน)
    let targetStock = await StockItem.findOne({
      itemName: sourceStock.itemName,
      lotNumber: sourceStock.lotNumber,
      locationId: payload.targetLocationId
    }).session(session);

    if (targetStock) {
      targetStock.currentQuantity += payload.transferQty;
      await targetStock.save({ session });
    } else {
      const newStockData = sourceStock.toObject();
      delete newStockData._id;
      newStockData.locationId = payload.targetLocationId;
      newStockData.initialQuantity = payload.transferQty;
      newStockData.currentQuantity = payload.transferQty;
      // ปรับ QR Code ให้เป็นมาตรฐานเดียวกัน
      newStockData.qrCodeValue = `${newStockData.itemName.toUpperCase().replace(/\s+/g, '-')}-${newStockData.lotNumber}-${payload.targetLocationId}`;
      await StockItem.create([newStockData], { session });
    }

    // หักยอดจากต้นทาง
    sourceStock.currentQuantity -= payload.transferQty;
    if (sourceStock.currentQuantity === 0) sourceStock.status = 'Out of Stock';
    await sourceStock.save({ session });

    await session.commitTransaction();
    
    revalidatePath("/stock");
    revalidatePath("/transfer");
    return { success: true, message: "โอนย้ายสต๊อกสำเร็จ!" };
  } catch (error: any) {
    await session.abortTransaction();
    return { success: false, message: error.message };
  } finally {
    session.endSession();
  }
}