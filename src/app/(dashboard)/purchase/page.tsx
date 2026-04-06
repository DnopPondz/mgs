import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import Category from "@/models/Category";
import { ClipboardList, Printer, AlertCircle, ShoppingCart } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PurchaseListPage() {
  await dbConnect();

  // ดึงข้อมูลสินค้าที่ จำนวนปัจจุบัน <= จำนวนขั้นต่ำ (Min Stock Level)
  // ใช้ $expr เพื่อเปรียบเทียบ 2 ฟิลด์ใน Document เดียวกัน
  const lowStockItems = await StockItem.find({
    $expr: { $lte: ["$currentQuantity", "$minStockLevel"] }
  })
  .populate({ path: 'categoryId', select: 'name', model: Category })
  .sort({ currentQuantity: 1 }) // เรียงจากของที่เหลือน้อยที่สุดไปหามาก
  .lean();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            Purchase & Restock List
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Items that have fallen below their minimum stock level and need to be reordered.
          </p>
        </div>
        
        {/* หมายเหตุ: ปุ่ม Print ปกติต้องใช้ Client Component แต่เพื่อให้โค้ดคลีน เราทำโครง UI ไว้ให้ก่อน */}
        <button className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm">
          <Printer className="w-4 h-4" />
          Print Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-2xl border border-orange-100 dark:border-orange-800/30 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/50 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Items Needing Restock</p>
            <h3 className="text-2xl font-bold text-orange-900 dark:text-orange-100">{lowStockItems.length}</h3>
          </div>
        </div>
        
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800/30 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">Total Recommended Order</p>
            <h3 className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
              {lowStockItems.reduce((acc: number, item: any) => acc + (item.minStockLevel * 2 - item.currentQuantity), 0)} <span className="text-sm font-normal">units</span>
            </h3>
            <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-1">*Based on restoring to 2x Min Level</p>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Item Name</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Category</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-center">Current Qty</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-center">Min Level</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-right">Suggested Restock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {lowStockItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <ClipboardList className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" />
                      <p className="font-medium text-gray-900 dark:text-gray-300">All stocks are healthy!</p>
                      <p className="text-sm">No items currently need restocking.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                lowStockItems.map((item: any) => {
                  // สูตรแนะนำการสั่งซื้อ: สั่งเพิ่มให้ยอดกลับไปเป็น 2 เท่าของ Min Level (ปรับเปลี่ยนได้ตามธุรกิจ)
                  const suggestedOrder = (item.minStockLevel * 2) - item.currentQuantity;
                  const isOutOfStock = item.currentQuantity === 0;

                  return (
                    <tr key={item._id.toString()} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900 dark:text-white">{item.itemName}</p>
                        <p className="text-xs text-gray-500">Lot: {item.lotNumber}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {item.categoryId?.name || "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          isOutOfStock 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        }`}>
                          {item.currentQuantity} {item.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-gray-500">
                        {item.minStockLevel} {item.unit}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">
                          +{suggestedOrder}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">{item.unit}</span>
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