"use server";

import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function transferStockAction(payload: { sourceId: string, targetLocationId: string, transferQty: number }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { success: false, message: "Unauthorized" };

    await dbConnect();

    const sourceStock = await StockItem.findById(payload.sourceId);
    if (!sourceStock) return { success: false, message: "Source stock not found." };
    if (sourceStock.currentQuantity < payload.transferQty) return { success: false, message: "Not enough quantity to transfer." };

    let targetStock = await StockItem.findOne({
      itemName: sourceStock.itemName,
      lotNumber: sourceStock.lotNumber,
      locationId: payload.targetLocationId
    });

    if (targetStock) {
      targetStock.currentQuantity += payload.transferQty;
      await targetStock.save();
    
} else {
  const newStockData = sourceStock.toObject();
  delete newStockData._id;
  newStockData.locationId = payload.targetLocationId;
  newStockData.initialQuantity = payload.transferQty;
  newStockData.currentQuantity = payload.transferQty;
  // ค่า unitCost และ imageUrl จะถูก copy ไปด้วยผ่าน toObject()
  newStockData.qrCodeValue = `${newStockData.itemName}-${newStockData.lotNumber}-${payload.targetLocationId}`.replace(/\s+/g, '-');
  await StockItem.create(newStockData);
}

    sourceStock.currentQuantity -= payload.transferQty;
    await sourceStock.save();

    return { success: true, message: "Stock transferred successfully!" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}