import Link from "next/link";
import { Plus, Package } from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import Category from "@/models/Category";
import StockTableClient from "./StockTableClient";

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
  
  const rawStocks = (await StockItem.find({ currentQuantity: { $gt: 0 } })
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
            <Package className="w-6 h-6 text-indigo-600" />
            Medicine Inventory
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage medicines, monitor stock totals, and track each lot.</p>
        </div>
        <Link href="/stock/add" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors">
          <Plus className="w-5 h-5" /> Add New Medicine
        </Link>
      </div>

      <StockTableClient groupedStocks={groupedArray} />
    </div>
  );
}
