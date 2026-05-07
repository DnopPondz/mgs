"use client";

import { useState } from "react";
import { CreditCard, Plus, Receipt, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { sellMedicineAction } from "@/app/actions/pharmacy";

type StockOption = { itemName: string; availableQty: number; unit: string; salePrice: number };
type CartItem = { itemName: string; quantity: number };

export default function PosClient({ stockOptions }: { stockOptions: StockOption[] }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [itemName, setItemName] = useState(stockOptions[0]?.itemName || "");
  const [quantity, setQuantity] = useState("1");
  const [discount, setDiscount] = useState("0");
  const [taxRate, setTaxRate] = useState("7");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer" | "e-wallet">("cash");
  const [customerName, setCustomerName] = useState("");
  const [lastBill, setLastBill] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const addItem = () => {
    if (!itemName) return;
    const qty = Math.max(Number(quantity) || 1, 1);
    setCart((prev) => {
      const existing = prev.find((item) => item.itemName === itemName);
      if (existing) return prev.map((item) => item.itemName === itemName ? { ...item, quantity: item.quantity + qty } : item);
      return [...prev, { itemName, quantity: qty }];
    });
    setQuantity("1");
  };

  const submitSale = async () => {
    if (cart.length === 0) return toast.error("กรุณาเพิ่มรายการขายก่อน");
    setIsSaving(true);
    const result = await sellMedicineAction({
      items: cart,
      paymentMethod,
      discount: Number(discount),
      taxRate: Number(taxRate),
      customerName,
    });
    if (result.success) {
      toast.success(result.message);
      setLastBill(result.data);
      setCart([]);
      setDiscount("0");
      setCustomerName("");
    } else {
      toast.error(result.message);
    }
    setIsSaving(false);
  };

  const subtotalEstimate = cart.reduce((acc, row) => {
    const stock = stockOptions.find((option) => option.itemName === row.itemName);
    return acc + row.quantity * (stock?.salePrice || 0);
  }, 0);
  const taxable = Math.max(subtotalEstimate - Number(discount || 0), 0);
  const tax = taxable * (Number(taxRate || 0) / 100);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <section className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800 xl:col-span-2">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Receipt className="h-5 w-5" /> Bill</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_120px_auto]">
          <select value={itemName} onChange={(e) => setItemName(e.target.value)} className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
            {stockOptions.map((option) => <option key={option.itemName} value={option.itemName}>{option.itemName} ({option.availableQty} {option.unit})</option>)}
          </select>
          <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900" />
          <button onClick={addItem} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-white dark:bg-gray-100 dark:text-gray-900"><Plus className="h-4 w-4" /> Add</button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-gray-500"><tr><th className="py-2">Medicine</th><th>Qty</th><th className="text-right">Action</th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {cart.length === 0 ? <tr><td className="py-6 text-center text-gray-500" colSpan={3}>No items in bill.</td></tr> : cart.map((item) => (
                <tr key={item.itemName}>
                  <td className="py-3 font-medium">{item.itemName}</td>
                  <td>{item.quantity}</td>
                  <td className="text-right">
                    <button onClick={() => setCart((prev) => prev.filter((row) => row.itemName !== item.itemName))} className="text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><CreditCard className="h-5 w-5" /> Payment</h2>
        <div className="space-y-3">
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" className="w-full rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900" />
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)} className="w-full rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="transfer">Transfer</option>
            <option value="e-wallet">E-wallet</option>
          </select>
          <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Discount" className="w-full rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900" />
          <input type="number" min="0" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="Tax %" className="w-full rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900" />
          <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-900">
            <div className="flex justify-between"><span>Subtotal</span><strong>฿{subtotalEstimate.toLocaleString()}</strong></div>
            <div className="flex justify-between"><span>Tax</span><strong>฿{tax.toLocaleString()}</strong></div>
            <div className="mt-2 flex justify-between text-base"><span>Net</span><strong>฿{(taxable + tax).toLocaleString()}</strong></div>
          </div>
          <button onClick={submitSale} disabled={isSaving || cart.length === 0} className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white disabled:opacity-60">
            {isSaving ? "Saving..." : "Complete Sale"}
          </button>
          {lastBill && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Last bill: {lastBill.saleNumber} net ฿{Number(lastBill.netTotal || 0).toLocaleString()}</p>}
        </div>
      </section>
    </div>
  );
}
