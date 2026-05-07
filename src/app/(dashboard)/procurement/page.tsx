import { ClipboardList } from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import GoodsReceipt from "@/models/GoodsReceipt";
import Location from "@/models/Location";
import PurchaseOrder from "@/models/PurchaseOrder";
import PurchaseRequest from "@/models/PurchaseRequest";
import StockItem from "@/models/StockItem";
import SupplierInvoice from "@/models/SupplierInvoice";
import ProcurementClient from "./ProcurementClient";

export const dynamic = "force-dynamic";

export default async function ProcurementPage() {
  await dbConnect();
  const lowStockItemsRaw = await StockItem.aggregate([
    { $match: { deletedAt: null } },
    { $group: { _id: "$itemName", totalQty: { $sum: "$currentQuantity" }, minStockLevel: { $max: "$minStockLevel" }, unit: { $first: "$unit" } } },
    { $match: { $expr: { $lte: ["$totalQty", "$minStockLevel"] } } },
    { $sort: { totalQty: 1 } },
  ]);
  const purchaseOrders = await PurchaseOrder.find({ status: { $in: ["Ordered", "Partially Received"] } }).sort({ createdAt: -1 }).limit(30).lean();
  const purchaseRequests = await PurchaseRequest.find().sort({ createdAt: -1 }).limit(10).lean();
  const goodsReceipts = await GoodsReceipt.find().sort({ createdAt: -1 }).limit(10).lean();
  const invoices = await SupplierInvoice.find().sort({ createdAt: -1 }).limit(10).lean();
  const locations = await Location.find({ isActive: true }).sort({ name: 1 }).lean();
  const lowStockItems = lowStockItemsRaw.map((item) => ({ _id: item._id, itemName: item._id, name: item.unit }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <ClipboardList className="h-6 w-6 text-gray-700 dark:text-gray-200" />
          Procurement
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">PR, PO approval flow, goods receipt, invoice tracking, and automatic stock lot creation.</p>
      </div>

      <ProcurementClient
        lowStockItems={JSON.parse(JSON.stringify(lowStockItems))}
        purchaseOrders={JSON.parse(JSON.stringify(purchaseOrders))}
        locations={JSON.parse(JSON.stringify(locations))}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
          <h2 className="mb-3 font-semibold">Recent PR</h2>
          <div className="space-y-2 text-sm">
            {purchaseRequests.map((pr: any) => <div key={pr._id.toString()} className="flex justify-between"><span>{pr.prNumber}</span><span>{pr.status}</span></div>)}
          </div>
        </section>
        <section className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
          <h2 className="mb-3 font-semibold">Recent GRN</h2>
          <div className="space-y-2 text-sm">
            {goodsReceipts.map((grn: any) => <div key={grn._id.toString()} className="flex justify-between"><span>{grn.grnNumber}</span><span>{grn.poNumber}</span></div>)}
          </div>
        </section>
        <section className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
          <h2 className="mb-3 font-semibold">Invoices</h2>
          <div className="space-y-2 text-sm">
            {invoices.map((invoice: any) => <div key={invoice._id.toString()} className="flex justify-between"><span>{invoice.invoiceNumber}</span><span>{invoice.status}</span></div>)}
          </div>
        </section>
      </div>
    </div>
  );
}
