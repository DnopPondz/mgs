import Link from "next/link";
import { Plus, Search } from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import Category from "@/models/Category";
import StockTableClient from "./StockTableClient";

export const dynamic = "force-dynamic";

export default async function StockListPage() {
  await dbConnect();
  
  // 1. ดึงข้อมูลทั้งหมด และดึงชื่อ Category มาด้วย
  const rawStocks = await StockItem.find({ currentQuantity: { $gt: 0 } }) // ดึงเฉพาะที่ของยังไม่หมด
    .populate({ path: 'categoryId', select: 'name', model: Category })
    .sort({ expiryDate: 1 }) // เรียงวันหมดอายุใกล้สุดขึ้นก่อน
    .lean();

  // 2. จับกลุ่มสินค้า (Group By) ตาม itemName
  const groupedData = rawStocks.reduce((acc: any, item: any) => {
    const itemName = item.itemName;
    
    // ถ้าเพิ่งเจอชื่อสินค้านี้ครั้งแรก ให้สร้างกลุ่มใหม่
    if (!acc[itemName]) {
      acc[itemName] = {
        itemName: itemName,
        category: item.categoryId?.name || "-",
        unit: item.unit,
        totalQuantity: 0,
        minStockLevel: item.minStockLevel,
        lots: [] // เตรียมกล่องใส่ล็อตย่อยๆ
      };
    }
    
    // บวกรวมยอดปัจจุบัน และยัดล็อตย่อยเก็บไว้ในกลุ่ม
    acc[itemName].totalQuantity += item.currentQuantity;
    acc[itemName].lots.push(JSON.parse(JSON.stringify(item)));
    
    return acc;
  }, {});

  // แปลงจาก Object ให้กลับมาเป็น Array เพื่อส่งให้ตาราง
  const groupedArray = Object.values(groupedData);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your items, view details, and track batches.</p>
        </div>
        <Link 
          href="/stock/add" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add / Restock Item
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search by item name..." 
          className="bg-transparent border-none outline-none w-full text-gray-700 dark:text-gray-200"
        />
      </div>

      {/* 3. เรียกใช้ตารางฝั่ง Client ที่กดกางออกได้ */}
      <StockTableClient groupedStocks={groupedArray} />
    </div>
  );
}