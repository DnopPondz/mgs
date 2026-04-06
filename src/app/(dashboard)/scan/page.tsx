"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { QrCode, ArrowRight, Package } from "lucide-react";
import toast from "react-hot-toast";

export default function ScanPage() {
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [stockDetail, setStockDetail] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // การตั้งค่ากล้องแสกน
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    // ฟังก์ชันเมื่อแสกนเจอ QR Code สำเร็จ
    function onScanSuccess(decodedText: string) {
      scanner.pause(true); // หยุดกล้องชั่วคราว
      setScannedData(decodedText);
      fetchStockDetail(decodedText);
    }

    function onScanFailure(error: any) {
      // ไม่ต้องทำอะไร ปล่อยให้มันพยายามสแกนต่อไป
    }

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
  }, []);

  // ยิง API ไปถามข้อมูลสินค้าหลังจากสแกนติด
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
        // ถ้าไม่เจอ ให้รีเซ็ตเพื่อให้สแกนใหม่ได้
        setTimeout(() => window.location.reload(), 2000); 
      }
    } catch (error) {
      toast.error("Error fetching data");
    }
    setIsSearching(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
        <QrCode className="w-6 h-6 text-indigo-600" />
        Scan QR Code
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ส่วนกล้องสแกน */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div id="reader" className="w-full overflow-hidden rounded-xl border-none"></div>
          {isSearching && <p className="text-center mt-4 text-indigo-600 animate-pulse">Searching database...</p>}
        </div>

        {/* ส่วนแสดงผลข้อมูลสินค้าที่สแกนเจอ */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          {stockDetail ? (
            <div className="space-y-4">
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
                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Current Qty</p>
                  <p className="text-lg font-semibold text-indigo-600">{stockDetail.currentQuantity} {stockDetail.unit}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm font-semibold">{stockDetail.status}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg col-span-2">
                  <p className="text-xs text-gray-500">Expiry Date</p>
                  <p className="text-sm font-semibold text-red-600">
                    {new Date(stockDetail.expiryDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button 
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg flex justify-center items-center gap-2 transition-colors"
                onClick={() => {/* ตรงนี้เดี๋ยวเรามาต่อยอดเป็นการเบิกของ (Use Stock) */}}
              >
                Use / Update Stock <ArrowRight className="w-4 h-4" />
              </button>
              
              <button 
                onClick={() => window.location.reload()} 
                className="w-full text-gray-500 text-sm hover:underline mt-2"
              >
                Scan Another Item
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <QrCode className="w-16 h-16 mb-4 opacity-20" />
              <p>Scan a QR code to view item details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}