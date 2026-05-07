"use client";

import { useState } from "react";
import { Check, ClipboardCheck, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { createApprovalRequestAction, reviewApprovalRequestAction } from "@/app/actions/enterprise";

type StockOption = { _id: string; itemName: string; lotNumber: string; currentQuantity: number };
type LocationOption = { _id: string; name: string };

export function ApprovalRequestForm({ stocks, locations }: { stocks: StockOption[]; locations: LocationOption[] }) {
  const [actionType, setActionType] = useState<"DELETE_STOCK" | "TRANSFER_STOCK" | "ADJUST_STOCK">("TRANSFER_STOCK");
  const [stockId, setStockId] = useState(stocks[0]?._id || "");
  const [targetLocationId, setTargetLocationId] = useState(locations[0]?._id || "");
  const [quantity, setQuantity] = useState("1");
  const [newQty, setNewQty] = useState("0");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    setIsSaving(true);
    const stock = stocks.find((item) => item._id === stockId);
    const payload =
      actionType === "TRANSFER_STOCK"
        ? { sourceId: stockId, targetLocationId, transferQty: Number(quantity), reason }
        : actionType === "ADJUST_STOCK"
          ? { stockId, newQty: Number(newQty), reason }
          : { stockId, reason };
    const result = await createApprovalRequestAction({
      actionType,
      summary: `${actionType.replace("_", " ")} ${stock?.itemName || ""} ${stock?.lotNumber || ""}`,
      payload,
    });
    result.success ? toast.success(result.message) : toast.error(result.message);
    setIsSaving(false);
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><ClipboardCheck className="h-5 w-5" /> Request Approval</h2>
      <div className="grid gap-3 md:grid-cols-5">
        <select value={actionType} onChange={(e) => setActionType(e.target.value as any)} className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
          <option value="TRANSFER_STOCK">Transfer</option>
          <option value="ADJUST_STOCK">Adjust</option>
          <option value="DELETE_STOCK">Delete</option>
        </select>
        <select value={stockId} onChange={(e) => setStockId(e.target.value)} className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
          {stocks.map((stock) => <option key={stock._id} value={stock._id}>{stock.itemName} Lot {stock.lotNumber}</option>)}
        </select>
        {actionType === "TRANSFER_STOCK" && (
          <select value={targetLocationId} onChange={(e) => setTargetLocationId(e.target.value)} className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
            {locations.map((location) => <option key={location._id} value={location._id}>{location.name}</option>)}
          </select>
        )}
        {actionType === "TRANSFER_STOCK" && <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900" />}
        {actionType === "ADJUST_STOCK" && <input type="number" min="0" value={newQty} onChange={(e) => setNewQty(e.target.value)} className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900" />}
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900" />
        <button onClick={submit} disabled={isSaving || !stockId} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-60">
          <Send className="h-4 w-4" /> Submit
        </button>
      </div>
    </section>
  );
}

export function ReviewButtons({ requestId }: { requestId: string }) {
  const [isSaving, setIsSaving] = useState(false);

  const review = async (decision: "Approved" | "Rejected") => {
    setIsSaving(true);
    const result = await reviewApprovalRequestAction({ requestId, decision });
    result.success ? toast.success(result.message) : toast.error(result.message);
    setIsSaving(false);
  };

  return (
    <div className="inline-flex gap-2">
      <button onClick={() => review("Approved")} disabled={isSaving} className="rounded-lg bg-emerald-600 p-2 text-white disabled:opacity-60" title="Approve"><Check className="h-4 w-4" /></button>
      <button onClick={() => review("Rejected")} disabled={isSaving} className="rounded-lg bg-red-600 p-2 text-white disabled:opacity-60" title="Reject"><X className="h-4 w-4" /></button>
    </div>
  );
}
