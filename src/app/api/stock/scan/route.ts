import { NextResponse } from "next/server"; // แก้จาก next/route
import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const qrCodeValue = searchParams.get("qr");

  if (!qrCodeValue) {
    return NextResponse.json({ success: false, message: "QR code is required" }, { status: 400 });
  }

  try {
    await dbConnect();
    // เพิ่ม populate เพื่อดึงชื่อ Category และ Location มาแสดงผล
    const stock = await StockItem.findOne({ qrCodeValue })
      .populate("categoryId", "name")
      .populate("locationId", "name")
      .lean();

    if (!stock) {
      return NextResponse.json({ success: false, message: "Medicine not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: stock });
  } catch {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
