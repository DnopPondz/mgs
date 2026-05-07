"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { RotateCcw, Trash2, Lock } from "lucide-react";
import { permanentlyDeleteStockAction, restoreStockAction } from "@/app/actions/stock";

type DeletedStock = {
  _id: string;
  itemName: string;
  lotNumber: string;
  currentQuantity: number;
  unit: string;
  deleteReason: string;
  deletedAt: string;
  deletedByName: string;
  usageCount: number;
};

export default function RecycleBinTableClient({ stocks }: { stocks: DeletedStock[] }) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleRestore = async (stockId: string) => {
    setProcessingId(stockId);
    const res = await restoreStockAction({ stockId });
    if (res.success) {
      toast.success(res.message);
      router.refresh();
    } else {
      toast.error(res.message);
    }
    setProcessingId(null);
  };

  const handlePermanentDelete = async (stockId: string, itemName: string, lotNumber: string) => {
    const confirmationText = window.prompt(
      `Type "${lotNumber}" or "${itemName}" to permanently delete this archived item:`
    );
    if (!confirmationText?.trim()) {
      toast.error("กรุณายืนยันข้อมูลก่อนลบถาวร");
      return;
    }

    setProcessingId(stockId);
    const res = await permanentlyDeleteStockAction({ stockId, confirmationText: confirmationText.trim() });
    if (res.success) {
      toast.success(res.message);
      router.refresh();
    } else {
      toast.error(res.message);
    }
    setProcessingId(null);
  };

  if (stocks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center text-gray-500">
        Recycle Bin is empty.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Item</th>
              <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Deleted At</th>
              <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Reason</th>
              <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-center">Usage Records</th>
              <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {stocks.map((stock) => {
              const isProcessing = processingId === stock._id;
              const isPermanentLocked = stock.usageCount > 0;

              return (
                <tr key={stock._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900 dark:text-white">{stock.itemName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Lot: {stock.lotNumber} | Qty: {stock.currentQuantity} {stock.unit}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Deleted by: {stock.deletedByName}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                    {new Date(stock.deletedAt).toLocaleString("en-GB")}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{stock.deleteReason || "-"}</td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${isPermanentLocked ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"}`}
                    >
                      {stock.usageCount}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRestore(stock._id)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium disabled:opacity-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {isProcessing ? "Processing..." : "Restore"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePermanentDelete(stock._id, stock.itemName, stock.lotNumber)}
                        disabled={isProcessing || isPermanentLocked}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium disabled:opacity-50"
                        title={isPermanentLocked ? "This item has usage history and cannot be permanently deleted." : "Permanent delete"}
                      >
                        {isPermanentLocked ? <Lock className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Permanent Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
