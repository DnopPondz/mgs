"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useStockAction } from "@/app/actions/usage";

interface Props {
  stockId: string;
  currentQuantity: number;
  unit: string;
}

export default function UseStockForm({ stockId, currentQuantity, unit }: Props) {
  const { data: session } = useSession();
  const [useQuantity, setUseQuantity] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUseStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return toast.error("User not authenticated");
    if (useQuantity > currentQuantity) return toast.error("Cannot use more than current stock!");

    setIsProcessing(true);
    const res = await useStockAction({
      stockId,
      userId: session.user.id,
      quantityToUse: useQuantity,
      reason: reason || "Manual web usage",
    });

    if (res.success) {
      toast.success(res.message);
      setUseQuantity(1);
      setReason("");
    } else {
      toast.error(res.message);
    }
    setIsProcessing(false);
  };

  if (currentQuantity <= 0) {
    return (
      <div className="mt-6 bg-red-50 text-red-600 p-4 rounded-xl text-center font-medium border border-red-100 dark:bg-red-900/20 dark:border-red-900/30">
        This item is currently out of stock.
      </div>
    );
  }

  return (
    <form onSubmit={handleUseStock} className="mt-6 bg-indigo-50 dark:bg-indigo-900/10 p-5 rounded-xl border border-indigo-100 dark:border-indigo-900/30 space-y-4">
      <h3 className="font-semibold text-indigo-900 dark:text-indigo-300">Manual Stock Usage</h3>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-1/3">
          <label className="text-xs text-gray-500 mb-1 block">Quantity ({unit})</label>
          <input type="number" min="1" max={currentQuantity} value={useQuantity} onChange={(e) => setUseQuantity(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500" required />
        </div>
        <div className="w-full sm:w-2/3">
          <label className="text-xs text-gray-500 mb-1 block">Reason (Optional)</label>
          <input type="text" placeholder="e.g., Patient ward A" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>
      <button type="submit" disabled={isProcessing} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50 font-medium">
        <CheckCircle2 className="w-5 h-5" /> {isProcessing ? "Processing..." : "Confirm Usage"}
      </button>
    </form>
  );
}