"use server";

import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import StockUsage from "@/models/StockUsage";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { recordStockMovement } from "@/app/actions/enterprise";

export async function useStockAction(payload: { 
  stockId: string, 
  quantityToUse: number,
  reason: string 
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, message: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };

    const quantity = Number(payload.quantityToUse);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { success: false, message: "จำนวนที่เบิกต้องมากกว่า 0" };
    }

    await dbConnect();

    const stock = await StockItem.findOne({ _id: payload.stockId, deletedAt: null });
    if (!stock) return { success: false, message: "ไม่พบสินค้าในสต๊อก" };

    if (stock.currentQuantity < quantity) {
      return { success: false, message: "จำนวนสินค้าในสต๊อกไม่เพียงพอ!" };
    }

    stock.currentQuantity -= quantity;

    if (stock.currentQuantity === 0) {
      stock.status = 'Out of Stock';
    } else if (stock.currentQuantity <= stock.minStockLevel) {
      stock.status = 'Low Stock';
    } else {
      stock.status = 'Healthy';
    }

    await stock.save();

    await StockUsage.create({
      stockId: stock._id,
      userId: session.user.id, // ใช้ ID จาก Session เพื่อความปลอดภัย
      quantityUsed: quantity,
      reason: payload.reason,
    });

    await recordStockMovement({
      stockId: stock._id,
      itemName: stock.itemName,
      lotNumber: stock.lotNumber,
      branchId: stock.branchId,
      locationId: stock.locationId,
      movementType: "OUT",
      quantity: -quantity,
      balanceAfter: stock.currentQuantity,
      referenceType: "StockUsage",
      note: payload.reason,
      performedBy: session.user.id,
    });

    revalidatePath("/scan");
    revalidatePath("/stock");
    revalidatePath("/");

    return { 
      success: true, 
      message: `เบิกสินค้า ${quantity} ${stock.unit} สำเร็จ คงเหลือ: ${stock.currentQuantity}` 
    };

  } catch (error: unknown) {
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "เกิดข้อผิดพลาดในการเบิกสินค้า" };
  }
}
