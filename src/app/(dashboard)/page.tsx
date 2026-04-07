import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import { Package, AlertTriangle, Clock, Activity } from "lucide-react";
import Link from "next/link";
import DashboardChart from "./DashboardChart";

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Actions Need Attention</h3>
          <div className="space-y-4">
            {lowStockCount > 0 && (
              <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800/30">
                <div className="flex items-center gap-3 text-orange-700 dark:text-orange-400">
                  <Activity className="w-5 h-5" />
                  <span className="font-medium">{lowStockCount} aggregated items are running low</span>
                </div>
                <Link href="/purchase" className="text-sm font-semibold text-orange-700 hover:underline dark:text-orange-400">Restock List &rarr;</Link>
              </div>
            )}
            
            {expiringSoonCount > 0 && (
              <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800/30">
                <div className="flex items-center gap-3 text-purple-700 dark:text-purple-400">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">{expiringSoonCount} stock lots expiring within 30 days</span>
                </div>
                <Link href="/stock" className="text-sm font-semibold text-purple-700 hover:underline dark:text-purple-400">View Items &rarr;</Link>
              </div>
            )}

            {lowStockCount === 0 && expiringSoonCount === 0 && (
              <p className="text-gray-500 py-4 text-center">Everything looks good! No urgent actions needed.</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col h-80">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Stock Levels</h3>
          <div className="flex-1 w-full">
            <DashboardChart data={chartData} />
          </div>
        </div>
      </div>
    </div>
  );
}