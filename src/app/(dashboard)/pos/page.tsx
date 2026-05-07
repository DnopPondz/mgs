import { ShoppingCart } from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import Sale from "@/models/Sale";
import StockItem from "@/models/StockItem";
import PosClient from "./PosClient";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  await dbConnect();
  const stockOptions = await StockItem.aggregate([
    { $match: { deletedAt: null, currentQuantity: { $gt: 0 } } },
    { $group: { _id: "$itemName", availableQty: { $sum: "$currentQuantity" }, unit: { $first: "$unit" }, salePrice: { $max: "$salePrice" } } },
    { $sort: { _id: 1 } },
  ]);
  const recentSales = await Sale.find().sort({ soldAt: -1 }).limit(8).lean();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <ShoppingCart className="h-6 w-6 text-gray-700 dark:text-gray-200" />
          POS / Dispense
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create bills with discount, tax, payment method, and FEFO stock deduction.</p>
      </div>

      <PosClient stockOptions={stockOptions.map((item) => ({ itemName: item._id, availableQty: item.availableQty, unit: item.unit, salePrice: item.salePrice }))} />

      <section className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
        <h2 className="mb-3 font-semibold">Recent Bills</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-gray-500"><tr><th className="py-2">Bill</th><th>Payment</th><th>Status</th><th className="text-right">Net</th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentSales.map((sale: any) => (
                <tr key={sale._id.toString()}>
                  <td className="py-3 font-mono text-xs">{sale.saleNumber}</td>
                  <td>{sale.paymentMethod}</td>
                  <td>{sale.status}</td>
                  <td className="text-right font-semibold">฿{Number(sale.netTotal || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
