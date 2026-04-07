"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Upload, PenTool, Search } from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { getAuditLogsAction, adjustStockAction, bulkImportAction } from "@/app/actions/system";

export default function SystemAuditPage() {
  const [activeTab, setActiveTab] = useState("audit");
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // For Adjust Stock
  const [stockId, setStockId] = useState("");
  const [newQty, setNewQty] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (activeTab === "audit") fetchLogs();
  }, [activeTab]);

  const fetchLogs = async () => {
    const data = await getAuditLogsAction();
    setLogs(data);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await adjustStockAction({ stockId, newQty: Number(newQty), reason });
    res.success ? toast.success(res.message) : toast.error(res.message);
    setStockId(""); setNewQty(""); setReason("");
    setIsLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      setIsLoading(true);
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);

      if (data.length > 0) {
        const res = await bulkImportAction(data);
        res.success ? toast.success(res.message) : toast.error(res.message);
      } else {
        toast.error("Excel file is empty or invalid format.");
      }
      setIsLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-indigo-600" /> System & Audit
        </h1>
        <p className="text-sm text-gray-500 mt-1">Advanced tools for cycle count, auditing, and bulk operations.</p>
      </div>

      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button onClick={() => setActiveTab("audit")} className={`px-4 py-2 font-medium text-sm rounded-lg ${activeTab === "audit" ? "bg-indigo-50 text-indigo-700" : "text-gray-500"}`}>Audit Logs</button>
        <button onClick={() => setActiveTab("adjust")} className={`px-4 py-2 font-medium text-sm rounded-lg ${activeTab === "adjust" ? "bg-indigo-50 text-indigo-700" : "text-gray-500"}`}>Cycle Count (Adjust)</button>
        <button onClick={() => setActiveTab("import")} className={`px-4 py-2 font-medium text-sm rounded-lg ${activeTab === "import" ? "bg-indigo-50 text-indigo-700" : "text-gray-500"}`}>Bulk Import (Excel)</button>
      </div>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        
        {/* TAB 1: Audit Logs */}
        {activeTab === "audit" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {logs.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{new Date(log.timestamp).toLocaleString('en-GB')}</td>
                    <td className="px-4 py-3 font-medium">{log.user}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">{log.action}</span></td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Adjust Stock */}
        {activeTab === "adjust" && (
          <form onSubmit={handleAdjustSubmit} className="max-w-xl space-y-4">
            <div className="bg-orange-50 text-orange-800 p-4 rounded-xl border border-orange-100 text-sm mb-6 flex gap-3">
              <PenTool className="w-5 h-5 shrink-0" />
              <p><strong>Warning:</strong> Use this form only for physical cycle counts (ยอดของจริงไม่ตรงกับในระบบ) This will override the current quantity.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stock Item Object ID</label>
              <input value={stockId} onChange={(e) => setStockId(e.target.value)} placeholder="Paste the item _id here" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Actual Physical Quantity (New Qty)</label>
              <input type="number" min="0" value={newQty} onChange={(e) => setNewQty(e.target.value)} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reason for Adjustment</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Found 2 missing items during monthly audit" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 outline-none" required />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded-lg transition-colors">{isLoading ? "Processing..." : "Force Adjust Quantity"}</button>
          </form>
        )}

        {/* TAB 3: Bulk Import */}
        {activeTab === "import" && (
          <div className="max-w-xl text-center space-y-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Upload an Excel (.xlsx) file with columns: <b>Item Name, Lot Number, Quantity, Unit Cost, Unit, Min Level</b></p>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-12 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-4" />
              <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer mx-auto" />
            </div>
            {isLoading && <p className="text-indigo-600 animate-pulse font-medium">Importing items... Please wait.</p>}
          </div>
        )}
      </div>
    </div>
  );
}