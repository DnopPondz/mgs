"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { QrCode, Package, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useStockAction } from "@/app/actions/usage"; // ดึง Action ที่เราเพิ่งสร้างมาใช้

export default function ScanPage() {
  const { data: session } = useSession();
  const [stockDetail, setStockDetail] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [useQuantity, setUseQuantity] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // โค้ดกล้องสแกน
    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);

    function onScanSuccess(decodedText: string) {
      scanner.pause(true);
      fetchStockDetail(decodedText);
    }

    scanner.render(onScanSuccess, () => {});

    return () => {
      scanner.clear().catch(e => console.error("Scanner clear error", e));
    };
  }, []);

  const fetchStockDetail = async (qrValue: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/stock/scan?qr=${qrValue}`);
      const result = await res.json();
      if (result.success) {
        setStockDetail(result.data);
        toast.success("Item found!");
      } else {
        toast.error(result.message);
        setTimeout(() => window.location.reload(), 2000); 
      }
    } catch (error) {
      toast.error("Error fetching data");
    }
    setIsSearching(false);
  };

  // ฟังก์ชันกดปุ่ม "เบิกสินค้า"
  const handleUseStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return toast.error("User not authenticated");
    
    if (useQuantity > stockDetail.currentQuantity) {
      return toast.error("Cannot use more than current stock!");
    }

    setIsProcessing(true);
    const res = await useStockAction({
      stockId: stockDetail._id,
      userId: session.user.id,
      quantityToUse: useQuantity,
      reason: reason || "Regular usage",
    });

    if (res.success) {
      toast.success(res.message);
      // อัปเดตยอดคงเหลือในหน้าจอให้เห็นทันที
      setStockDetail({ ...stockDetail, currentQuantity: stockDetail.currentQuantity - useQuantity });
      setUseQuantity(1);
      setReason("");
    } else {
      toast.error(res.message);
    }
    setIsProcessing(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <QrCode className="w-6 h-6 text-indigo-600" />
        Scan QR Code & Use Stock
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* กล้อง */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 h-fit">
          <div id="reader" className="w-full overflow-hidden rounded-xl border-none"></div>
          {isSearching && <p className="text-center mt-4 text-indigo-600 animate-pulse">Searching database...</p>}
        </div>

        {/* ข้อมูลและการเบิก */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          {stockDetail ? (
            <div className="space-y-6">
              {/* ข้อมูลสินค้า */}
              <div className="flex items-center gap-3 border-b dark:border-gray-800 pb-4">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{stockDetail.itemName}</h2>
                  <p className="text-sm text-gray-500">Lot: {stockDetail.lotNumber}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-500">Current Qty</p>
                  <p className="text-xl font-bold text-indigo-600">{stockDetail.currentQuantity} <span className="text-sm font-normal text-gray-500">{stockDetail.unit}</span></p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm font-semibold mt-1">{stockDetail.status}</p>
                </div>
              </div>

              {/* ฟอร์มตัดสต๊อก */}
              {stockDetail.currentQuantity > 0 ? (
                <form onSubmit={handleUseStock} className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 space-y-3">
                  <h3 className="font-semibold text-indigo-900 dark:text-indigo-300">Use Stock Item</h3>
                  <div className="flex gap-3">
                    <div className="w-1/3">
                      <label className="text-xs text-gray-500">Quantity</label>
                      <input 
                        type="number" 
                        min="1" 
                        max={stockDetail.currentQuantity}
                        value={useQuantity}
                        onChange={(e) => setUseQuantity(Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none" 
                        required 
                      />
                    </div>
                    <div className="w-2/3">
                      <label className="text-xs text-gray-500">Reason (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="e.g., patient ward A"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none" 
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isProcessing}
                    className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isProcessing ? "Processing..." : "Confirm Usage"}
                  </button>
                </form>
              ) : (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-medium border border-red-100 dark:bg-red-900/20 dark:border-red-900/30">
                  This item is currently out of stock.
                </div>
              )}
              
              <button onClick={() => window.location.reload()} className="w-full text-gray-500 text-sm hover:underline mt-2">
                Scan Another Item
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
              <QrCode className="w-16 h-16 mb-4 opacity-20" />
              <p>Scan a QR code to view item details and use stock</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}