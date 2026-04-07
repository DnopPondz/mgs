"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { transferStockAction } from "@/app/actions/transfer";

export default function TransferFormClient({ stocks, locations }: { stocks: any[], locations: any[] }) {
  const [selectedStockId, setSelectedStockId] = useState("");
  const [targetLocationId, setTargetLocationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const selectedStock = stocks.find(s => s._id === selectedStockId);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockId || !targetLocationId) return toast.error("Please select all fields.");
    if (selectedStock?.locationId?._id === targetLocationId) return toast.error("Cannot transfer to the same location!");

    setIsLoading(true);
    const res = await transferStockAction({ sourceId: selectedStockId, targetLocationId, transferQty: quantity });
    
    if (res.success) {
      toast.success(res.message);
      setTimeout(() => window.location.reload(), 1000);
    } else {
      toast.error(res.message);
    }
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleTransfer} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2 dark:text-gray-200">Select Item to Transfer</label>
        <select value={selectedStockId} onChange={(e) => setSelectedStockId(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 dark:bg-gray-800 dark:text-white dark:border-gray-700 outline-none" required>
          <option value="">-- Select Item & Lot --</option>
          {stocks.map(stock => (
            <option key={stock._id} value={stock._id}>
              {stock.itemName} (Lot: {stock.lotNumber}) - Current Loc: {stock.locationId?.name || "Unknown"} - Qty: {stock.currentQuantity}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-200">Transfer To Location</label>
          <select value={targetLocationId} onChange={(e) => setTargetLocationId(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 dark:bg-gray-800 dark:text-white dark:border-gray-700 outline-none" required>
            <option value="">-- Select Destination --</option>
            {locations.map(loc => (
              <option key={loc._id} value={loc._id}>{loc.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 dark:text-gray-200">Quantity to Move</label>
          <input type="number" min="1" max={selectedStock?.currentQuantity || 1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 dark:bg-gray-800 dark:text-white dark:border-gray-700 outline-none" required />
        </div>
      </div>

      <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-md disabled:opacity-50 transition-colors">
        {isLoading ? "Processing..." : "Confirm Transfer"}
      </button>
    </form>
  );
}