"use client";

import { useMemo, useState } from "react";
import { FileCheck2, FilePlus2, PackageCheck, ReceiptText } from "lucide-react";
import toast from "react-hot-toast";
import { createPurchaseRequestAction, createSupplierInvoiceAction, receiveGoodsReceiptAction } from "@/app/actions/enterprise";

type Option = { _id: string; name?: string; itemName?: string; poNumber?: string; supplierName?: string; items?: Array<{ itemName: string; requestedQty: number; receivedQty: number; unit?: string; unitCost?: number; categoryId?: string }> };

export default function ProcurementClient({
  lowStockItems,
  purchaseOrders,
  locations,
}: {
  lowStockItems: Option[];
  purchaseOrders: Option[];
  locations: Option[];
}) {
  const [tab, setTab] = useState<"pr" | "grn" | "invoice">("pr");
  const [isSaving, setIsSaving] = useState(false);
  const [prItemName, setPrItemName] = useState(lowStockItems[0]?.itemName || "");
  const [prQty, setPrQty] = useState("1");
  const [supplierName, setSupplierName] = useState("");
  const [poId, setPoId] = useState(purchaseOrders[0]?._id || "");
  const [locationId, setLocationId] = useState(locations[0]?._id || "");
  const [receiveItemName, setReceiveItemName] = useState("");
  const [receiveQty, setReceiveQty] = useState("1");
  const [lotNumber, setLotNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceSubtotal, setInvoiceSubtotal] = useState("0");

  const selectedPo = useMemo(() => purchaseOrders.find((po) => po._id === poId), [poId, purchaseOrders]);
  const poOpenItems = selectedPo?.items?.filter((item) => Number(item.receivedQty || 0) < Number(item.requestedQty || 0)) || [];

  const createPR = async () => {
    setIsSaving(true);
    const selected = lowStockItems.find((item) => item.itemName === prItemName);
    const result = await createPurchaseRequestAction({
      supplierName,
      items: [{
        itemName: prItemName,
        requestedQty: Number(prQty),
        unit: selected?.name || "pcs",
        unitCost: 0,
        reason: "Restock request",
      }],
    });
    result.success ? toast.success(result.message) : toast.error(result.message);
    setIsSaving(false);
  };

  const receiveGRN = async () => {
    setIsSaving(true);
    const item = poOpenItems.find((row) => row.itemName === receiveItemName) || poOpenItems[0];
    const result = await receiveGoodsReceiptAction({
      poId,
      locationId,
      items: [{
        itemName: receiveItemName || item?.itemName,
        quantity: Number(receiveQty),
        lotNumber,
        manufactureDate: new Date().toISOString().slice(0, 10),
        shelfLifeDays: 365,
        unit: item?.unit || "pcs",
        unitCost: item?.unitCost || 0,
        categoryId: item?.categoryId || "",
      }],
    });
    result.success ? toast.success(result.message) : toast.error(result.message);
    setIsSaving(false);
  };

  const createInvoice = async () => {
    setIsSaving(true);
    const result = await createSupplierInvoiceAction({
      invoiceNumber,
      poId,
      supplierName: selectedPo?.supplierName || supplierName,
      subtotal: Number(invoiceSubtotal),
      taxAmount: 0,
      discount: 0,
    });
    result.success ? toast.success(result.message) : toast.error(result.message);
    setIsSaving(false);
  };

  const tabs = [
    { id: "pr", label: "PR", icon: FilePlus2 },
    { id: "grn", label: "GRN", icon: PackageCheck },
    { id: "invoice", label: "Invoice", icon: ReceiptText },
  ] as const;

  return (
    <div className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${tab === item.id ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" : "border border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-300"}`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "pr" && (
        <div className="grid gap-4 md:grid-cols-4">
          <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Supplier" className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900" />
          <select value={prItemName} onChange={(e) => setPrItemName(e.target.value)} className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
            {lowStockItems.map((item) => <option key={item.itemName} value={item.itemName}>{item.itemName}</option>)}
          </select>
          <input type="number" min="1" value={prQty} onChange={(e) => setPrQty(e.target.value)} className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900" />
          <button onClick={createPR} disabled={isSaving || !prItemName} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-60">
            <FileCheck2 className="h-4 w-4" /> Create PR
          </button>
        </div>
      )}

      {tab === "grn" && (
        <div className="grid gap-4 md:grid-cols-5">
          <select value={poId} onChange={(e) => setPoId(e.target.value)} className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
            {purchaseOrders.map((po) => <option key={po._id} value={po._id}>{po.poNumber}</option>)}
          </select>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
            {locations.map((location) => <option key={location._id} value={location._id}>{location.name}</option>)}
          </select>
          <select value={receiveItemName} onChange={(e) => setReceiveItemName(e.target.value)} className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
            <option value="">Select PO item</option>
            {poOpenItems.map((item) => <option key={item.itemName} value={item.itemName}>{item.itemName}</option>)}
          </select>
          <input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="Lot number" className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900" />
          <div className="flex gap-2">
            <input type="number" min="1" value={receiveQty} onChange={(e) => setReceiveQty(e.target.value)} className="min-w-0 rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900" />
            <button onClick={receiveGRN} disabled={isSaving || !poId || !locationId || !lotNumber} className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white disabled:opacity-60">Receive</button>
          </div>
        </div>
      )}

      {tab === "invoice" && (
        <div className="grid gap-4 md:grid-cols-4">
          <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Invoice number" className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900" />
          <select value={poId} onChange={(e) => setPoId(e.target.value)} className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
            {purchaseOrders.map((po) => <option key={po._id} value={po._id}>{po.poNumber}</option>)}
          </select>
          <input type="number" min="0" value={invoiceSubtotal} onChange={(e) => setInvoiceSubtotal(e.target.value)} className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900" />
          <button onClick={createInvoice} disabled={isSaving || !invoiceNumber} className="rounded-lg bg-gray-900 px-4 py-2 font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900">Save Invoice</button>
        </div>
      )}
    </div>
  );
}
