import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import { Package, AlertTriangle, Clock, Activity } from "lucide-react";
import DashboardChart from "./DashboardChart";
import CategoryPieChart from "./CategoryPieChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await dbConnect();

  const totalLots = await StockItem.countDocuments();
  
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const expiringSoonCount = await StockItem.countDocuments({
    expiryDate: { $lte: thirtyDaysFromNow },
    currentQuantity: { $gt: 0 }
  });

  const inventoryStatus = await StockItem.aggregate([
    {
      $group: {
        _id: "$itemName",
        totalQty: { $sum: "$currentQuantity" },
        minLevel: { $max: "$minStockLevel" }
      }
    }
  ]);

  const outOfStock = inventoryStatus.filter(item => item.totalQty === 0).length;
  const lowStockCount = inventoryStatus.filter(item => item.totalQty > 0 && item.totalQty <= item.minLevel).length;

  const chartData = inventoryStatus
    .map(item => ({ name: item._id, quantity: item.totalQty }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 7);

  // ดึงข้อมูล Category มาทำกราฟวงกลม
  const categoryData = await StockItem.aggregate([
    { $match: { currentQuantity: { $gt: 0 } } },
    { $group: { _id: "$categoryId", value: { $sum: 1 } } },
    { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "cat" } },
    { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
    { $project: { name: { $ifNull: ["$cat.name", "Uncategorized"] }, value: 1, _id: 0 } }
  ]);

  const summaryCards = [
    { title: "Total Stock Lots", value: totalLots, icon: Package, color: "bg-blue-500" },
    { title: "Low Stock Items", value: lowStockCount, icon: Activity, color: "bg-orange-500" },
    { title: "Out of Stock", value: outOfStock, icon: AlertTriangle, color: "bg-red-500" },
    { title: "Expiring Soon", value: expiringSoonCount, icon: Clock, color: "bg-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back! Here is what's happening with your inventory today.</p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-80 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Stock Levels</h3>
          <div className="flex-1 w-full"><DashboardChart data={chartData} /></div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-80">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Categories</h3>
          <div className="flex-1 w-full"><CategoryPieChart data={categoryData} /></div>
        </div>
      </div>
    </div>
  );
}