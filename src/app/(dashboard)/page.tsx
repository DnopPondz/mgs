import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import { Package, Activity, Clock } from "lucide-react";
import DashboardChart from "./DashboardChart";
import CategoryPieChart from "./CategoryPieChart";

// ตั้งค่าให้หน้า Dashboard อัปเดตข้อมูลใหม่เสมอ
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await dbConnect();

  // 1. นับจำนวน Lot ทั้งหมดที่ยังมีสินค้าอยู่ (มากกว่า 0)
  const totalLots = await StockItem.countDocuments({ currentQuantity: { $gt: 0 } });

  // 2. คำนวณสินค้าที่ใกล้หมดอายุ (ภายใน 30 วัน) และต้องยังมีของเหลืออยู่
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const expiringSoonCount = await StockItem.countDocuments({
    expiryDate: { $lte: thirtyDaysFromNow },
    currentQuantity: { $gt: 0 }
  });

  // 3. ดึงข้อมูลสถานะสต๊อกรายสินค้า (เฉพาะที่มีของเหลือ > 0)
  const inventoryStatus = await StockItem.aggregate([
    {
      // กรองออกตั้งแต่ระดับ Database: ถ้าของหมดไม่ต้องเอามานับ lot
      $match: { currentQuantity: { $gt: 0 } }
    },
    {
      $group: {
        _id: "$itemName",
        totalQty: { $sum: "$currentQuantity" },
        minLevel: { $max: "$minStockLevel" },
        // แก้ไข: ดึง unitCost ล่าสุดมาใช้เพื่อให้คำนวณราคาได้ถูกต้อง
        unitCost: { $first: "$unitCost" } 
      }
    }
  ]);

  // คำนวณมูลค่ารวมของสินค้าที่มีอยู่ในคลังจริง (รองรับการแปลงค่าเป็นตัวเลขเพื่อให้แน่ใจว่าคำนวณได้)
  const totalValuation = inventoryStatus.reduce((acc, item) => {
    const cost = Number(item.unitCost) || 0;
    const qty = Number(item.totalQty) || 0;
    return acc + (qty * cost);
  }, 0);
  
  // นับรายการสินค้าที่จำนวนเหลือน้อยกว่าหรือเท่ากับจุดสั่งซื้อ (Min Level)
  const lowStockCount = inventoryStatus.filter(item => item.totalQty > 0 && item.totalQty <= item.minLevel).length;

  // ข้อมูลสำหรับกราฟแท่ง (Top 7 สินค้าที่มีจำนวนเยอะที่สุด)
  const chartData = inventoryStatus
    .map(item => ({ name: item._id, quantity: item.totalQty }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 7);

  // 4. ดึงข้อมูลหมวดหมู่ (Category) มาทำกราฟวงกลม (เฉพาะที่มีของเหลือ > 0)
  const categoryData = await StockItem.aggregate([
    { 
      // ถ้าของหมดไม่ต้องนำมานับสัดส่วนในหมวดหมู่
      $match: { currentQuantity: { $gt: 0 } } 
    },
    { 
      $group: { _id: "$categoryId", value: { $sum: 1 } } 
    },
    { 
      $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "cat" } 
    },
    { 
      $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } 
    },
    { 
      $project: { name: { $ifNull: ["$cat.name", "Uncategorized"] }, value: 1, _id: 0 } 
    }
  ]);

  // รายการ Card สรุปข้อมูลด้านบน
  const summaryCards = [
    { title: "Active Stock Lots", value: totalLots.toLocaleString(), icon: Package, color: "bg-blue-500" },
    { title: "Low Stock Items", value: lowStockCount.toLocaleString(), icon: Activity, color: "bg-orange-500" },
    // ปรับการแสดงผลราคาให้มีเครื่องหมาย ฿ และลูกเล่นการจัดรูปแบบตัวเลข
    { title: "Inventory Value", value: `฿${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Activity, color: "bg-emerald-500" },
    { title: "Expiring Soon", value: expiringSoonCount.toLocaleString(), icon: Clock, color: "bg-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">ภาพรวมสต๊อกสินค้าที่มีอยู่ในคลังปัจจุบัน</p>
      </div>

      {/* Summary Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
              <div className={`${card.color} w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-lg shadow-${card.color}/30`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.title}</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* กราฟแท่ง Top 7 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-80 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Stock Levels (In Stock)</h3>
          <div className="flex-1 w-full">
            <DashboardChart data={chartData} />
          </div>
        </div>

        {/* กราฟวงกลมแยกหมวดหมู่ */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-80">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Categories Distribution</h3>
          <div className="flex-1 w-full">
            <CategoryPieChart data={categoryData} />
          </div>
        </div>
      </div>
    </div>
  );
}