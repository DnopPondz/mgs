"use client";

import { useState } from "react";
import { AlertOctagon, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { closeRecallCaseAction, createRecallCaseAction } from "@/app/actions/enterprise";

export default function RecallClient() {
  const [itemName, setItemName] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [reason, setReason] = useState("");
  const [severity, setSeverity] = useState<"Info" | "Warning" | "Critical">("Warning");
  const [isSaving, setIsSaving] = useState(false);

  const createRecall = async () => {
    setIsSaving(true);
    const result = await createRecallCaseAction({ itemName, lotNumber, reason, severity });
    result.success ? toast.success(result.message) : toast.error(result.message);
    if (result.success) {
      setItemName("");
      setLotNumber("");
      setReason("");
    }
    setIsSaving(false);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><AlertOctagon className="h-5 w-5" /> Open Recall Case</h2>
      <div className="grid gap-3 md:grid-cols-5">
        <input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Medicine name" className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900" />
        <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="Lot number (optional)" className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900" />
        <select value={severity} onChange={(e) => setSeverity(e.target.value as any)} className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
          <option value="Info">Info</option>
          <option value="Warning">Warning</option>
          <option value="Critical">Critical</option>
        </select>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Recall reason" className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900" />
        <button onClick={createRecall} disabled={isSaving || !itemName || !reason} className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white disabled:opacity-60">
          {isSaving ? "Opening..." : "Open Case"}
        </button>
      </div>
    </div>
  );
}

export function CloseRecallButton({ recallId }: { recallId: string }) {
  const [isClosing, setIsClosing] = useState(false);

  const closeCase = async () => {
    setIsClosing(true);
    const result = await closeRecallCaseAction({ recallId });
    result.success ? toast.success(result.message) : toast.error(result.message);
    setIsClosing(false);
  };

  return (
    <button onClick={closeCase} disabled={isClosing} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 disabled:opacity-60">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {isClosing ? "Closing..." : "Close"}
    </button>
  );
}
