import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import Link from "next/link";
import { Package, Activity, Clock, DollarSign, AlertTriangle, Bell, ArrowRight } from "lucide-react";
import DashboardChart from "./DashboardChart";
import CategoryPieChart from "./CategoryPieChart";
import TransferRequest from "@/models/TransferRequest";
import { unstable_cache } from "next/cache";

// ตั้งค่าให้หน้า Dashboard อัปเดตข้อมูลใหม่เสมอ
export const dynamic = "force-dynamic";

const getCachedDashboardData = unstable_cache(
  async () => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const [
      totalLots,
      expiringSoonCount,
      inventoryStatus,
      medicineTypes,
      outOfStockRows,
      pendingTransferCount,
      categoryData,
    ] = await Promise.all([
      StockItem.countDocuments({ currentQuantity: { $gt: 0 }, deletedAt: null }),
      StockItem.countDocuments({
        expiryDate: { $lte: thirtyDaysFromNow },
        currentQuantity: { $gt: 0 },
        deletedAt: null,
      }),
      StockItem.aggregate([
        {
          $match: { currentQuantity: { $gt: 0 }, deletedAt: null },
        },
        {
          $group: {
            _id: "$itemName",
            totalQty: { $sum: "$currentQuantity" },
            minLevel: { $max: "$minStockLevel" },
            unitCost: { $first: "$unitCost" },
            salePrice: { $first: "$salePrice" },
          },
        },
      ]),
      StockItem.distinct("medicineType", { currentQuantity: { $gt: 0 }, deletedAt: null }),
      StockItem.aggregate([
        { $match: { deletedAt: null } },
        { $group: { _id: "$itemName", totalQty: { $sum: "$currentQuantity" } } },
        { $match: { $expr: { $lte: ["$totalQty", 0] } } },
      ]),
      TransferRequest.countDocuments({ status: "Pending" }),
      StockItem.aggregate([
        {
          $match: { currentQuantity: { $gt: 0 }, deletedAt: null },
        },
        { $group: { _id: "$categoryId", value: { $sum: 1 } } },
        { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "cat" } },
        { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
        { $project: { name: { $ifNull: ["$cat.name", "Uncategorized"] }, value: 1, _id: 0 } },
      ]),
    ]);

    return {
      totalLots,
      expiringSoonCount,
      inventoryStatus,
      medicineTypesCount: medicineTypes.length,
      outOfStockCount: outOfStockRows.length,
      pendingTransferCount,
      categoryData,
    };
  },
  ["dashboard-home-data"],
  { revalidate: 30 }
);

export default async function DashboardPage() {
  try {
    await dbConnect();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const lower = message.toLowerCase();
    const isDbConnectionIssue =
      lower.includes("mongodb atlas") ||
      lower.includes("mongodb_uri") ||
      lower.includes("server selection timed out") ||
      lower.includes("authentication failed") ||
      lower.includes("bad auth");

    if (!isDbConnectionIssue) {
      throw error;
    }

    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-[var(--surface)] p-6 dark:border-gray-800 md:p-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Database Connection Required</h2>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            The app cannot reach MongoDB Atlas right now. Check your IP allowlist and
            `MONGODB_URI` in `.env.local`, then restart the app.
          </p>
          <div className="mt-5">
            <Link
              href="https://cloud.mongodb.com/v2#/security/network/accessList"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Open Atlas Network Access
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const {
    totalLots,
    expiringSoonCount,
    inventoryStatus,
    medicineTypesCount,
    outOfStockCount,
    pendingTransferCount,
    categoryData,
  } = await getCachedDashboardData();

  // คำนวณมูลค่ารวมของสินค้าที่มีอยู่ในคลังจริง (รองรับการแปลงค่าเป็นตัวเลขเพื่อให้แน่ใจว่าคำนวณได้)
  const totalValuation = inventoryStatus.reduce((acc, item) => {
    const cost = Number(item.unitCost) || 0;
    const qty = Number(item.totalQty) || 0;
    return acc + (qty * cost);
  }, 0);

  const totalRetailValuation = inventoryStatus.reduce((acc, item) => {
    const salePrice = Number(item.salePrice) || 0;
    const qty = Number(item.totalQty) || 0;
    return acc + (qty * salePrice);
  }, 0);
  
  // นับรายการสินค้าที่จำนวนเหลือน้อยกว่าหรือเท่ากับจุดสั่งซื้อ (Min Level)
  const lowStockCount = inventoryStatus.filter(item => item.totalQty > 0 && item.totalQty <= item.minLevel).length;

  // ข้อมูลสำหรับกราฟแท่ง (Top 7 สินค้าที่มีจำนวนเยอะที่สุด)
  const chartData = inventoryStatus
    .map(item => ({ name: item._id, quantity: item.totalQty }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 7);

  // รายการ Card สรุปข้อมูลด้านบน
  const summaryCards = [
    { title: "Active Medicine Lots", value: totalLots.toLocaleString(), icon: Package },
    { title: "Low Stock Medicines", value: lowStockCount.toLocaleString(), icon: Activity },
    // ปรับการแสดงผลราคาให้มีเครื่องหมาย ฿ และลูกเล่นการจัดรูปแบบตัวเลข
    { title: "Stock Cost Value", value: `฿${totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Activity },
    { title: "Stock Retail Value", value: `฿${totalRetailValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign },
    { title: "Medicine Types", value: medicineTypesCount.toLocaleString(), icon: Package },
    { title: "Expiring Soon", value: expiringSoonCount.toLocaleString(), icon: Clock },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard Overview</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Stock status, quantity trends, and current valuation at a glance.</p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-amber-950 dark:text-amber-100">Action Alerts</h2>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {expiringSoonCount} expiring soon, {lowStockCount} low stock, {outOfStockCount} out of stock, {pendingTransferCount} pending transfers.
              </p>
            </div>
          </div>
          <Link href="/alerts" className="inline-flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">
            Open Alerts <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Summary Cards Section */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{card.title}</p>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{card.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* กราฟแท่ง Top 7 */}
        <div className="flex h-80 flex-col rounded-xl border border-gray-200 bg-[var(--surface)] p-6 dark:border-gray-800 lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Top Medicines by Quantity</h3>
          <div className="flex-1 w-full">
            <DashboardChart data={chartData} />
          </div>
        </div>

        {/* กราฟวงกลมแยกหมวดหมู่ */}
        <div className="flex h-80 flex-col rounded-xl border border-gray-200 bg-[var(--surface)] p-6 dark:border-gray-800">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Categories Distribution</h3>
          <div className="flex-1 w-full">
            <CategoryPieChart data={categoryData} />
          </div>
        </div>
      </div>
    </div>
  );
}
