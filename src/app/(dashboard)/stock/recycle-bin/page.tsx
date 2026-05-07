import Link from "next/link";
import { Trash2, ShieldAlert, ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth/next";
import dbConnect from "@/lib/dbConnect";
import { authOptions } from "@/lib/auth";
import StockItem from "@/models/StockItem";
import StockUsage from "@/models/StockUsage";
import User from "@/models/User";
import RecycleBinTableClient from "./RecycleBinTableClient";

export const dynamic = "force-dynamic";

type DeletedStockRow = {
  _id: string;
  itemName: string;
  lotNumber: string;
  currentQuantity: number;
  unit: string;
  deleteReason: string;
  deletedAt: string;
  deletedByName: string;
  usageCount: number;
};

type DeletedStockRaw = {
  _id: { toString(): string };
  itemName: string;
  lotNumber: string;
  currentQuantity: number;
  unit: string;
  deleteReason?: string;
  deletedAt: Date | string;
  deletedBy?: { name?: string } | null;
};

type UsageCountRaw = {
  _id: { toString(): string };
  count: number;
};

export default async function RecycleBinPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "Admin") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-4 opacity-80" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          You do not have permission to access Recycle Bin. Only Administrators can access this page.
        </p>
      </div>
    );
  }

  await dbConnect();

  const deletedStocksRaw = (await StockItem.find({ deletedAt: { $ne: null } })
    .populate({ path: "deletedBy", select: "name", model: User })
    .sort({ deletedAt: -1 })
    .lean()) as DeletedStockRaw[];

  const stockIds = deletedStocksRaw.map((stock) => stock._id).filter(Boolean);
  const usageCountsRaw = stockIds.length
    ? await StockUsage.aggregate([
        { $match: { stockId: { $in: stockIds } } },
        { $group: { _id: "$stockId", count: { $sum: 1 } } },
      ])
    : [];

  const usageCountMap = new Map<string, number>(
    (usageCountsRaw as UsageCountRaw[]).map((item) => [item._id.toString(), Number(item.count) || 0])
  );

  const deletedStocks: DeletedStockRow[] = deletedStocksRaw.map((stock) => ({
    _id: stock._id.toString(),
    itemName: stock.itemName,
    lotNumber: stock.lotNumber,
    currentQuantity: stock.currentQuantity,
    unit: stock.unit,
    deleteReason: stock.deleteReason || "",
    deletedAt: new Date(stock.deletedAt).toISOString(),
    deletedByName: stock.deletedBy?.name || "Unknown",
    usageCount: usageCountMap.get(stock._id.toString()) || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/stock"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Stock
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Trash2 className="w-6 h-6 text-red-600" />
          Recycle Bin
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Archived stock items can be restored. Permanent delete is blocked when usage history exists.
        </p>
      </div>

      <RecycleBinTableClient stocks={deletedStocks} />
    </div>
  );
}
