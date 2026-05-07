"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Archive, AlertTriangle } from "lucide-react";
import { deleteStockAction } from "@/app/actions/stock";

type Props = {
  stockId: string;
  itemName: string;
  lotNumber: string;
};

export default function DeleteStockButton({ stockId, itemName, lotNumber }: Props) {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmationText, setConfirmationText] = useState("");

  const handleDelete = async (event: FormEvent) => {
    event.preventDefault();

    if (!reason.trim()) {
      return toast.error("กรุณาระบุเหตุผลการลบ");
    }
    if (!confirmationText.trim()) {
      return toast.error(`กรุณาพิมพ์ "${lotNumber}" หรือ "${itemName}" เพื่อยืนยัน`);
    }

    setIsArchiving(true);
    const res = await deleteStockAction({ stockId, reason, confirmationText });

    if (res.success) {
      toast.success(res.message);
      router.push("/stock");
      router.refresh();
    } else {
      toast.error(res.message);
    }

    setIsArchiving(false);
  };

  return (
    <form onSubmit={handleDelete} className="space-y-3">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300 text-sm flex gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          รายการนี้จะถูกย้ายไป <strong>Recycle Bin</strong> (ไม่ลบทันที) และต้องมีเหตุผลประกอบ
        </p>
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Reason for deletion</label>
        <input
          type="text"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g., Wrong lot added by mistake"
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none"
          required
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">
          Type <span className="font-mono">{lotNumber}</span> or <span className="font-mono">{itemName}</span> to confirm
        </label>
        <input
          type="text"
          value={confirmationText}
          onChange={(event) => setConfirmationText(event.target.value)}
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none"
          required
        />
      </div>
      <button
        type="submit"
        disabled={isArchiving}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 disabled:opacity-50 transition-colors font-medium"
      >
        <Archive className="w-4 h-4" />
        {isArchiving ? "Archiving..." : "Move To Recycle Bin"}
      </button>
    </form>
  );
}
