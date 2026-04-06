"use server";

import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import StockUsage from "@/models/StockUsage";
import { revalidatePath } from "next/cache";

export async function useStockAction(payload: { 
  stockId: string, 
  userId: string, 
  quantityToUse: number,
  reason: string 
}) {
  try {
    await dbConnect();

    // 1. ค้นหาสินค้าที่ต้องการเบิก
    const stock = await StockItem.findById(payload.stockId);
    if (!stock) return { success: false, message: "Stock item not found" };

    // 2. เช็คว่ายอดคงเหลือพอให้เบิกไหม
    if (stock.currentQuantity < payload.quantityToUse) {
      return { success: false, message: "Not enough items in stock!" };
    }

    // 3. หักลบจำนวน
    stock.currentQuantity -= payload.quantityToUse;

    // 4. อัปเดตสถานะ (Status) อัตโนมัติหากของหมด หรือเหลือน้อย
    if (stock.currentQuantity === 0) {
      stock.status = 'Out of Stock';
    } else if (stock.currentQuantity <= stock.minStockLevel) {
      stock.status = 'Low Stock';
    }

    await stock.save();

    // 5. บันทึกประวัติการเบิก
    await StockUsage.create({
      stockId: stock._id,
      userId: payload.userId,
      quantityUsed: payload.quantityToUse,
      reason: payload.reason,
    });

    // รีเฟรชข้อมูลหน้าเว็บ
    revalidatePath("/scan");
    revalidatePath("/stock");
    revalidatePath("/");

    return { 
      success: true, 
      message: `Successfully used ${payload.quantityToUse} ${stock.unit}. Remaining: ${stock.currentQuantity} ${stock.unit}` 
    };

  } catch (error: any) {
    console.error("Usage Error:", error);
    return { success: false, message: error.message || "Failed to process stock usage" };
  }
}