"use client";

import * as XLSX from "xlsx";
import { Download, Printer } from "lucide-react";

export default function ActionButtons({ data }: { data: any[] }) {
  const handleExport = () => {
    const formattedData = data.map(item => ({
      "Item Name": item._id,
      "Category": item.categoryDetails?.name || "-",
      "Current Total Qty": item.totalQuantity,
      "Minimum Level": item.minStockLevel,
      "Suggested Restock": (item.minStockLevel * 2) - item.totalQuantity,
      "Unit": item.unit
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase List");
    XLSX.writeFile(workbook, `Purchase_List_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex items-center gap-3">
      <button 
        onClick={() => window.print()}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
      >
        <Printer className="w-4 h-4" /> Print Report
      </button>
      
      <button 
        onClick={handleExport}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
      >
        <Download className="w-4 h-4" /> Export to Excel
      </button>
    </div>
  );
}