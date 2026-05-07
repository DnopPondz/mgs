import { AlertOctagon } from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import RecallCase from "@/models/RecallCase";
import RecallClient, { CloseRecallButton } from "./RecallClient";

export const dynamic = "force-dynamic";

export default async function RecallPage() {
  await dbConnect();
  const recalls = await RecallCase.find().sort({ createdAt: -1 }).limit(30).lean();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <AlertOctagon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
          Recall & Lot Trace
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track affected lots, on-hand quantity, and sold/used quantity when a recall happens.</p>
      </div>

      <RecallClient />

      <section className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
        <h2 className="mb-4 text-lg font-semibold">Recall Cases</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-gray-500"><tr><th className="py-2">Case</th><th>Medicine / Lot</th><th>Severity</th><th>On Hand</th><th>Sold/Used</th><th>Status</th><th></th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {recalls.length === 0 ? <tr><td className="py-6 text-center text-gray-500" colSpan={7}>No recall cases.</td></tr> : recalls.map((recall: any) => (
                <tr key={recall._id.toString()}>
                  <td className="py-3 font-mono text-xs">{recall.recallNumber}</td>
                  <td><span className="font-medium">{recall.itemName}</span><span className="ml-2 text-gray-500">{recall.lotNumber || "All lots"}</span></td>
                  <td>{recall.severity}</td>
                  <td>{recall.totalOnHand}</td>
                  <td>{recall.soldOrUsedQty}</td>
                  <td>{recall.status}</td>
                  <td className="text-right">{recall.status !== "Completed" && <CloseRecallButton recallId={recall._id.toString()} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
