import dbConnect from "@/lib/dbConnect";
import StockUsage from "@/models/StockUsage";
import StockItem from "@/models/StockItem"; // ต้อง import ไว้ให้ populate รู้จัก
import User from "@/models/User";           // ต้อง import ไว้ให้ populate รู้จัก
import { History, Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UsageHistoryPage() {
  await dbConnect();
  
  // ดึงข้อมูลประวัติการเบิก พร้อมดึงชื่อสินค้าและชื่อผู้เบิกมาด้วย (populate)
  const usages = await StockUsage.find({})
    .populate({ path: 'stockId', select: 'itemName lotNumber unit', model: StockItem })
    .populate({ path: 'userId', select: 'name email', model: User })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <History className="w-6 h-6 text-indigo-600" />
          Usage History
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track all stock item usage and withdrawals.</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Date & Time</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Item Name</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Used By</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Quantity</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {usages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No usage history found.
                  </td>
                </tr>
              ) : (
                usages.map((record: any) => {
                  const stock = record.stockId || {};
                  const user = record.userId || {};
                  
                  return (
                    <tr key={record._id.toString()} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(record.createdAt).toLocaleString('en-GB')}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          {stock.itemName || "Deleted Item"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">Lot: {stock.lotNumber || "N/A"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium">{user.name || "Unknown User"}</p>
                        <p className="text-xs text-gray-500">{user.email || ""}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">
                        - {record.quantityUsed} <span className="text-sm font-normal text-gray-500">{stock.unit || ""}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {record.reason || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}