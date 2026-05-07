"use client";

import { useState } from "react";
import { Download, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { importInventoryRowsAction } from "@/app/actions/enterprise";

const templateRows = [
  {
    "Item Name": "Paracetamol",
    "Generic Name": "Paracetamol",
    Strength: "500 mg",
    Type: "Tablet",
    Usage: "Fever",
    "Lot Number": "LOT-001",
    Quantity: 100,
    Unit: "tablet",
    "Unit Cost": 1.5,
    "Sale Price": 3,
    "Min Level": 20,
    "Shelf Life Days": 730,
  },
];

export default function ImportClient() {
  const [isImporting, setIsImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Import");
    XLSX.writeFile(workbook, "mediflow-inventory-template.xlsx");
  };

  const importFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      setIsImporting(true);
      setErrors([]);
      const workbook = XLSX.read(loadEvent.target?.result, { type: "binary" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet) as Record<string, unknown>[];
      const result = await importInventoryRowsAction(rows);
      if (result.success) {
        toast.success(result.message);
        setErrors(result.errors || []);
      } else {
        toast.error(result.message);
      }
      setIsImporting(false);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
      <div className="mb-5 flex flex-wrap gap-3">
        <button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium dark:border-gray-800">
          <Download className="h-4 w-4" /> Download Template
        </button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
          <UploadCloud className="h-4 w-4" /> {isImporting ? "Importing..." : "Import Excel/CSV"}
          <input type="file" accept=".xlsx,.xls,.csv" onChange={importFile} className="hidden" disabled={isImporting} />
        </label>
      </div>
      <p className="text-sm text-gray-500">Supports Excel/CSV columns such as Item Name, Lot Number, Quantity, Unit Cost, Sale Price, Min Level, Images.</p>
      {errors.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {errors.slice(0, 8).map((error) => <p key={error}>{error}</p>)}
        </div>
      )}
    </div>
  );
}
