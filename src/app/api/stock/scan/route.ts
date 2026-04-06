import { NextResponse } from "next/route";
import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qrCodeValue = searchParams.get("qr");

  if (!qrCodeValue) {
    return NextResponse.json({ success: false, message: "QR Code is required" }, { status: 400 });
  }

  try {
    await dbConnect();
    // ค้นหาสินค้าจาก qrCodeValue (ในระบบจริงอาจจะใช้ .populate('categoryId') เพื่อดึงชื่อหมวดหมู่มาด้วย)
    const stock = await StockItem.findOne({ qrCodeValue });

    if (!stock) {
      return NextResponse.json({ success: false, message: "Stock item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: stock });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}