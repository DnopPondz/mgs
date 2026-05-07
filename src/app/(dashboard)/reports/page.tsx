import { BarChart3, Boxes, DollarSign, RotateCw } from "lucide-react";
import { getReportsAction } from "@/app/actions/enterprise";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await getReportsAction({ days: 30 });
  const cards = [
    { label: "Net sales", value: `฿${reports.summary.netSales.toLocaleString()}`, icon: DollarSign },
    { label: "Gross profit", value: `฿${reports.summary.grossProfit.toLocaleString()}`, icon: BarChart3 },
    { label: "Inventory value", value: `฿${reports.summary.inventoryValue.toLocaleString()}`, icon: Boxes },
    { label: "Turnover", value: reports.summary.turnover.toFixed(2), icon: RotateCw },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <BarChart3 className="h-6 w-6 text-gray-700 dark:text-gray-200" />
          Reports
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Usage, category, branch, user, ABC analysis, dead stock, slow moving, and turnover.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
              <Icon className="mb-3 h-5 w-5 text-gray-500" />
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ReportList title="Usage By User" rows={reports.usageByUser.map((row: any) => ({ label: row.name, value: `${row.quantity} units` }))} />
        <ReportList title="Usage By Category" rows={reports.usageByCategory.map((row: any) => ({ label: row._id, value: `${row.quantity} units` }))} />
        <ReportList title="Usage By Branch" rows={reports.usageByBranch.map((row: any) => ({ label: row._id, value: `${row.quantity} units` }))} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
          <h2 className="mb-4 text-lg font-semibold">ABC Analysis</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500"><tr><th className="py-2">Item</th><th>Qty</th><th>Sales</th><th>Class</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {reports.abcAnalysis.slice(0, 15).map((row: any) => (
                  <tr key={row._id}><td className="py-3 font-medium">{row._id}</td><td>{row.quantity}</td><td>฿{Number(row.salesAmount || 0).toLocaleString()}</td><td>{row.class}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
          <h2 className="mb-4 text-lg font-semibold">Dead / Slow Moving Stock</h2>
          <div className="space-y-2 text-sm">
            {reports.deadStock.slice(0, 15).map((row: any) => (
              <div key={row._id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800">
                <span>{row.itemName} <span className="text-xs text-gray-500">Lot {row.lotNumber}</span></span>
                <span>{row.currentQuantity} {row.unit}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ReportList({ title, rows }: { title: string; rows: Array<{ label: string; value: string }> }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-sm">
        {rows.length === 0 ? <p className="text-gray-500">No data.</p> : rows.slice(0, 10).map((row) => (
          <div key={row.label} className="flex justify-between"><span>{row.label}</span><strong>{row.value}</strong></div>
        ))}
      </div>
    </section>
  );
}
