import { AlertTriangle, Bell, Clock, PackageX, RefreshCw } from "lucide-react";
import { getAlertsDashboardAction } from "@/app/actions/enterprise";
import AlertDigestButton from "./AlertDigestButton";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const alerts = await getAlertsDashboardAction();
  const cards = [
    { label: "Expiring in 30 days", value: alerts.summary.expiringSoonCount, icon: Clock, tone: "text-amber-700 bg-amber-50 border-amber-100" },
    { label: "Low stock", value: alerts.summary.lowStockCount, icon: AlertTriangle, tone: "text-orange-700 bg-orange-50 border-orange-100" },
    { label: "Out of stock", value: alerts.summary.outOfStockCount, icon: PackageX, tone: "text-red-700 bg-red-50 border-red-100" },
    { label: "Pending transfers", value: alerts.summary.pendingTransferCount, icon: RefreshCw, tone: "text-sky-700 bg-sky-50 border-sky-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <Bell className="h-6 w-6 text-gray-700 dark:text-gray-200" />
            Alert Center
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Expiry, low stock, out of stock, and pending transfer signals.</p>
        </div>
        <AlertDigestButton />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-xl border p-5 ${card.tone} dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100`}>
              <Icon className="mb-3 h-5 w-5" />
              <p className="text-sm font-medium">{card.label}</p>
              <p className="mt-1 text-3xl font-semibold">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
          <h2 className="mb-4 text-lg font-semibold">Expiring Soon</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2">Medicine</th>
                  <th className="py-2">Lot</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {alerts.expiringSoon.length === 0 ? (
                  <tr><td className="py-4 text-gray-500" colSpan={4}>No expiring stock found.</td></tr>
                ) : alerts.expiringSoon.map((item: any) => (
                  <tr key={item._id}>
                    <td className="py-3 font-medium">{item.itemName}</td>
                    <td className="py-3 font-mono text-xs">{item.lotNumber}</td>
                    <td className="py-3">{item.currentQuantity} {item.unit}</td>
                    <td className="py-3 text-amber-700">{new Date(item.expiryDate).toLocaleDateString("en-GB")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
          <h2 className="mb-4 text-lg font-semibold">Low / Out Of Stock</h2>
          <div className="space-y-3">
            {[...alerts.outOfStock, ...alerts.lowStock].slice(0, 12).map((item: any) => (
              <div key={`${item._id}-${item.totalQty}`} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
                <span className="font-medium">{item._id}</span>
                <span className={Number(item.totalQty) <= 0 ? "text-red-600" : "text-orange-600"}>
                  {item.totalQty} {item.unit}
                </span>
              </div>
            ))}
            {alerts.outOfStock.length + alerts.lowStock.length === 0 && <p className="text-sm text-gray-500">Stock levels are healthy.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
