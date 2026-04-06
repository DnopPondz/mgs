import Link from "next/link";
import { Plus, Search, Package } from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import Category from "@/models/Category";
import StockTableClient from "./StockTableClient";

export const dynamic = "force-dynamic";

export default async function StockListPage() {
  await dbConnect();
  
  // 1. ดึงข้อมูลทั้งหมดที่มีของเหลือ เรียงตามวันหมดอายุ (เก่าไปใหม่)
  const rawStocks = await StockItem.find({ currentQuantity: { $gt: 0 } })
    .populate({ path: 'categoryId', select: 'name', model: Category })
    .sort({ expiryDate: 1 })
    .lean();

  // 2. จัดกลุ่มสินค้าตามชื่อ (itemName) เพื่อรวมยอด
  const groupedData = rawStocks.reduce((acc: any, item: any) => {
    const itemName = item.itemName;
    
    if (!acc[itemName]) {
      acc[itemName] = {
        itemName: itemName,
        category: item.categoryId?.name || "-",
        unit: item.unit,
        totalQuantity: 0,
        minStockLevel: item.minStockLevel,
        lots: [] // กล่องใส่รายละเอียดย่อย (ล็อตแยก)
      };
    }
    
    // บวกรวมยอด และเก็บล็อตย่อย
    acc[itemName].totalQuantity += item.currentQuantity;
    // แปลง ObjectId เป็น string เพื่อไม่ให้ Error ฝั่ง Client
    acc[itemName].lots.push(JSON.parse(JSON.stringify(item)));
    
    return acc;
  }, {});

  const groupedArray = Object.values(groupedData);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            Stock Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage aggregated stocks and track specific batches.</p>
        </div>
        <Link 
          href="/stock/add" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Stock
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

      {/* เรียกใช้งานตารางกางได้ (Client Component) */}
      <StockTableClient groupedStocks={groupedArray} />
    </div>
  );
}