"use server";

import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";

export async function createStockAction(formData: any) {
  try {
    await dbConnect();

    // 1. คำนวณวันหมดอายุอัตโนมัติ (วันผลิต + อายุการเก็บรักษา)
    const manufactureDate = new Date(formData.manufactureDate);
    const expiryDate = addDays(manufactureDate, Number(formData.shelfLifeDays));

    // 2. สร้างรหัส QR Code อัตโนมัติ (ใช้ TimeStamp + เลขสุ่มเพื่อไม่ให้ซ้ำ)
    const uniqueQrValue = `QR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 3. บันทึกลงฐานข้อมูล
    const newStock = new StockItem({
      ...formData,
      currentQuantity: formData.initialQuantity, // ตอนแรกรับเข้ามา current = initial
      expiryDate: expiryDate,
      qrCodeValue: uniqueQrValue,
    });

    await newStock.save();
    
    // รีเฟรชหน้าให้ข้อมูลอัปเดต
    revalidatePath("/stock");
    
    // คืนค่ากลับไปพร้อมข้อมูลเผื่อเอาไปโชว์ QR Code ทันที
    return { 
      success: true, 
      message: "Stock added successfully!",
      qrCodeValue: uniqueQrValue,
      stockId: newStock._id.toString()
    };
  } catch (error: any) {
    console.error("Error creating stock:", error);
    return { success: false, message: error.message || "Failed to add stock" };
  }
}