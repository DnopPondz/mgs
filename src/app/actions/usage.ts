"use server";

import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import StockUsage from "@/models/StockUsage";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function useStockAction(payload: { 
  stockId: string, 
  quantityToUse: number,
  reason: string 
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, message: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };

    await dbConnect();

    const stock = await StockItem.findById(payload.stockId);
    if (!stock) return { success: false, message: "ไม่พบสินค้าในสต๊อก" };

    if (stock.currentQuantity < payload.quantityToUse) {
      return { success: false, message: "จำนวนสินค้าในสต๊อกไม่เพียงพอ!" };
    }

    stock.currentQuantity -= payload.quantityToUse;

    if (stock.currentQuantity === 0) {
      stock.status = 'Out of Stock';
    } else if (stock.currentQuantity <= stock.minStockLevel) {
      stock.status = 'Low Stock';
    }

    await stock.save();

    await StockUsage.create({
      stockId: stock._id,
      userId: session.user.id, // ใช้ ID จาก Session เพื่อความปลอดภัย
      quantityUsed: payload.quantityToUse,
      reason: payload.reason,
    });

    revalidatePath("/scan");
    revalidatePath("/stock");
    revalidatePath("/");

    return { 
      success: true, 
      message: `เบิกสินค้า ${payload.quantityToUse} ${stock.unit} สำเร็จ คงเหลือ: ${stock.currentQuantity}` 
    };

  } catch (error: any) {
    return { success: false, message: error.message || "เกิดข้อผิดพลาดในการเบิกสินค้า" };
  }
}