import Link from "next/link";
import { Plus, Package, Trash2 } from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import Category from "@/models/Category";
import StockTableClient from "./StockTableClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

type StockLot = {
  _id: string;
  lotNumber: string;
  expiryDate: string;
  currentQuantity: number;
  unit: string;
  medicineType?: string;
  salePrice?: number;
};

type GroupedStock = {
  itemName: string;
  genericName?: string;
  medicineType?: string;
  category: string;
  unit: string;
  salePrice: number;
  totalQuantity: number;
  minStockLevel: number;
  lots: StockLot[];
};

type RawStockItem = {
  _id: string;
  itemName: string;
  genericName?: string;
  medicineType?: string;
  unit: string;
  salePrice?: number;
  minStockLevel: number;
  currentQuantity: number;
  lotNumber: string;
  expiryDate: string;
  categoryId?: { name?: string };
};

export const dynamic = "force-dynamic";

export default async function StockListPage() {
  await dbConnect();
  const session = await getServerSession(authOptions);
  const canManageStock = session?.user?.role === "Admin" || session?.user?.role === "AdminOwner";
  
  const rawStocks = (await StockItem.find({ currentQuantity: { $gt: 0 }, deletedAt: null })
    .populate({ path: 'categoryId', select: 'name', model: Category })
    .sort({ expiryDate: 1 })
    .lean()) as RawStockItem[];

  const groupedData = rawStocks.reduce<Record<string, GroupedStock>>((acc, item) => {
    const itemName = item.itemName;
    if (!acc[itemName]) {
      acc[itemName] = {
        itemName: itemName,
        genericName: item.genericName || "",
        medicineType: item.medicineType || "General",
        category: item.categoryId?.name || "-",
        unit: item.unit,
        salePrice: Number(item.salePrice) || 0,
        totalQuantity: 0,
        minStockLevel: item.minStockLevel,
        lots: []
      };
    }
    acc[itemName].totalQuantity += item.currentQuantity;
    acc[itemName].lots.push({
      _id: item._id.toString(),
      lotNumber: item.lotNumber,
      expiryDate: item.expiryDate,
      currentQuantity: item.currentQuantity,
      unit: item.unit,
      medicineType: item.medicineType || "General",
      salePrice: Number(item.salePrice) || 0,
    });
    return acc;
  }, {});

  const groupedArray: GroupedStock[] = Object.values(groupedData);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="h-6 w-6 text-gray-700 dark:text-gray-200" />
            Medicine Inventory
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage medicines, monitor stock totals, and track each lot.</p>
        </div>
        <div className="flex items-center gap-2">
          {canManageStock && (
            <Link href="/stock/recycle-bin" className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800">
              <Trash2 className="w-5 h-5" /> Recycle Bin
            </Link>
          )}
          <Link href="/stock/add" className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200">
            <Plus className="w-5 h-5" /> Add New Medicine
          </Link>
        </div>
      </div>

      <StockTableClient groupedStocks={groupedArray} canManageStock={canManageStock} />
    </div>
  );
}
