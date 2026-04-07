import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import Category from "@/models/Category"; // ต้อง import เพื่อให้ Mongoose รู้จัก Model ตอน Lookup
import { ClipboardList, AlertCircle, ShoppingCart } from "lucide-react";
import ActionButtons from "./ActionButtons";

export const dynamic = "force-dynamic";

export default async function PurchaseListPage() {
  await dbConnect();

  const aggregatedItemsRaw = await StockItem.aggregate([
    {
      $group: {
        _id: "$itemName",
        totalQuantity: { $sum: "$currentQuantity" },
        minStockLevel: { $max: "$minStockLevel" },
        unit: { $first: "$unit" },
        categoryId: { $first: "$categoryId" }
      }
    },
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "categoryDetails"
      }
    },
    { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },
    { $match: { $expr: { $lte: ["$totalQuantity", "$minStockLevel"] } } },
    { $sort: { totalQuantity: 1 } }
  ]);

  // แก้ไข Error: แปลงข้อมูลจาก Mongoose Aggregate (ที่มี ObjectId/Buffers) ให้เป็น Plain Object
  const aggregatedItems = JSON.parse(JSON.stringify(aggregatedItemsRaw));

  return (
    <div className="max-w-5xl mx-auto space-y-6 print:m-0 print:space-y-0 print:max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            Purchase & Restock List
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Aggregated items that have fallen below their minimum stock level.</p>
        </div>
        
        {/* ส่งข้อมูลที่ผ่านการ Serialize แล้วไปที่ ActionButtons */}
        <ActionButtons data={aggregatedItems} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
        <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-2xl border border-orange-100 dark:border-orange-800/30 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/50 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Item Types Needing Restock</p>
            <h3 className="text-2xl font-bold text-orange-900 dark:text-orange-100">{aggregatedItems.length}</h3>
          </div>
        </div>
        
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">Total Recommended Order</p>
            <h3 className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
              {aggregatedItems.reduce((acc: number, item: any) => acc + (item.minStockLevel * 2 - item.totalQuantity), 0)} <span className="text-sm font-normal">units</span>
            </h3>
            <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-1">*Based on restoring to 2x Min Level</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <h2 className="hidden print:block text-xl font-bold mb-4 text-black">Purchase List Report</h2>
          <table className="w-full text-left text-sm print:text-black print:border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-800/50 print:bg-transparent">
              <tr className="print:border-b-2 print:border-black">
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 print:text-black">Item Name</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 print:text-black">Category</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-center print:text-black">Total Current Qty</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-center print:text-black">Min Level</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-right print:text-black">Suggested Restock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 print:divide-black">
              {aggregatedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">All stocks are healthy!</td>
                </tr>
              ) : (
                aggregatedItems.map((item: any) => {
                  const suggestedOrder = (item.minStockLevel * 2) - item.totalQuantity;
                  const isOutOfStock = item.totalQuantity === 0;

                  return (
                    <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 print:border-b print:border-gray-300">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900 dark:text-white print:text-black">{item._id}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 print:text-black">{item.categoryDetails?.name || "-"}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold print:bg-transparent print:text-black ${
                          isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {item.totalQuantity} {item.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-500 print:text-black">{item.minStockLevel} {item.unit}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg print:text-black">+{suggestedOrder}</span>
                        <span className="text-sm text-gray-500 ml-1 print:text-black">{item.unit}</span>
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