import { NextResponse } from "next/server"; // แก้จาก next/route
import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import Category from "@/models/Category"; // ต้อง import เพื่อใช้ populate
import Location from "@/models/Location"; // ต้อง import เพื่อใช้ populate

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qrCodeValue = searchParams.get("qr");

  if (!qrCodeValue) {
    return NextResponse.json({ success: false, message: "QR Code is required" }, { status: 400 });
  }

  try {
    await dbConnect();
    // เพิ่ม populate เพื่อดึงชื่อ Category และ Location มาแสดงผล
    const stock = await StockItem.findOne({ qrCodeValue })
      .populate("categoryId", "name")
      .populate("locationId", "name")
      .lean();

    if (!stock) {
      return NextResponse.json({ success: false, message: "Stock item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: stock });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}