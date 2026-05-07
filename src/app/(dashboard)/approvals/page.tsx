import { ShieldCheck } from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import ApprovalRequest from "@/models/ApprovalRequest";
import Location from "@/models/Location";
import StockItem from "@/models/StockItem";
import { ApprovalRequestForm, ReviewButtons } from "./ApprovalsClient";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  await dbConnect();
  const approvals = await ApprovalRequest.find().populate("requestedBy", "name email").sort({ createdAt: -1 }).limit(40).lean();
  const stocks = await StockItem.find({ deletedAt: null, currentQuantity: { $gt: 0 } }).select("itemName lotNumber currentQuantity").sort({ itemName: 1 }).limit(200).lean();
  const locations = await Location.find({ isActive: true }).select("name").sort({ name: 1 }).lean();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <ShieldCheck className="h-6 w-6 text-gray-700 dark:text-gray-200" />
          RBAC & Approvals
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Approval workflow for delete, transfer, stock adjust, write-off, and purchase requests.</p>
      </div>

      <ApprovalRequestForm
        stocks={JSON.parse(JSON.stringify(stocks))}
        locations={JSON.parse(JSON.stringify(locations))}
      />

      <section className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
        <h2 className="mb-4 text-lg font-semibold">Requests</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-gray-500"><tr><th className="py-2">No.</th><th>Type</th><th>Summary</th><th>Requester</th><th>Status</th><th className="text-right">Review</th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {approvals.map((request: any) => (
                <tr key={request._id.toString()}>
                  <td className="py-3 font-mono text-xs">{request.requestNumber}</td>
                  <td>{request.actionType}</td>
                  <td>{request.summary}</td>
                  <td>{request.requestedBy?.name || "Unknown"}</td>
                  <td>{request.status}</td>
                  <td className="text-right">{request.status === "Pending" && <ReviewButtons requestId={request._id.toString()} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
