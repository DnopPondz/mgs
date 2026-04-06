import Link from "next/link";
import { Plus, Search, AlertCircle } from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";

// บังคับให้หน้านี้ดึงข้อมูลใหม่ทุกครั้งที่เปิด (ไม่แคช)
export const dynamic = "force-dynamic";

export default async function StockListPage() {
  await dbConnect();
  
  // ดึงข้อมูลสินค้าทั้งหมด เรียงจากใหม่ไปเก่า
  const stocks = await StockItem.find({}).sort({ createdAt: -1 }).lean();

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Inventory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your items, view details, and check statuses.</p>
        </div>
        <Link 
          href="/stock/add" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Stock
        </Link>
      </div>

      {/* Search Bar (UI Mockup สำหรับตอนนี้) */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input 
          type="text" 
          placeholder="Search by item name, lot number..." 
          className="bg-transparent border-none outline-none w-full text-gray-700 dark:text-gray-200"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="px-6 py-4 font-medium">Item Name</th>
                <th className="px-6 py-4 font-medium">Lot Number</th>
                <th className="px-6 py-4 font-medium">Quantity</th>
                <th className="px-6 py-4 font-medium">Expiry Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {stocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No stock items found. Click "Add New Stock" to get started.
                  </td>
                </tr>
              ) : (
                stocks.map((item: any) => {
                  const isLowStock = item.currentQuantity <= item.minStockLevel;
                  
                  return (
                    <tr key={item._id.toString()} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {item.itemName}
                      </td>
                      <td className="px-6 py-4">{item.lotNumber}</td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${isLowStock ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-200'}`}>
                          {item.currentQuantity}
                        </span> {item.unit}
                      </td>
                      <td className="px-6 py-4">
                        {new Date(item.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          item.currentQuantity === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          isLowStock ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                          {item.currentQuantity === 0 ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/stock/${item._id}`} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium">
                          View
                        </Link>
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