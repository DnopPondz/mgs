"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { createStockAction } from "@/app/actions/stock";
import { QRCodeCanvas } from "qrcode.react"; // ไลบรารีสำหรับวาด QR Code
import { PackagePlus, Save, Printer } from "lucide-react";

export default function AddStockPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedQr, setGeneratedQr] = useState<string | null>(null);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    
    // สมมติค่า ObjectId ของ Category/Location ไปก่อน (จริงๆ ต้อง Fetch มาทำ Dropdown)
    // ตรงนี้ผม hardcode ไว้ให้ระบบรันผ่านก่อนนะ คุณต้องแก้ให้เลือกจาก Dropdown ทีหลัง
    const payload = {
      ...data,
      categoryId: "650000000000000000000000", 
      locationId: "650000000000000000000001",
      initialQuantity: Number(data.initialQuantity),
      shelfLifeDays: Number(data.shelfLifeDays),
      minStockLevel: Number(data.minStockLevel),
    };

    const res = await createStockAction(payload);
    
    if (res.success) {
      toast.success(res.message);
      setGeneratedQr(res.qrCodeValue); // เซ็ตค่า QR Code เพื่อแสดงบนหน้าจอ
      reset(); // ล้างฟอร์ม
    } else {
      toast.error(res.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
        <PackagePlus className="w-6 h-6 text-indigo-600" />
        Add New Stock
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ฟอร์มกรอกข้อมูล (ใช้พื้นที่ 2 ส่วน) */}
        <div className="md:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Item Name</label>
              <input {...register("itemName", { required: true })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Lot Number</label>
                <input {...register("lotNumber", { required: true })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit (e.g., pcs, box)</label>
                <input {...register("unit", { required: true })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Initial Qty</label>
                <input type="number" {...register("initialQuantity", { required: true })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Min Stock Level</label>
                <input type="number" {...register("minStockLevel", { required: true })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Shelf Life (Days)</label>
                <input type="number" {...register("shelfLifeDays", { required: true })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Manufacture Date</label>
              <input type="date" {...register("manufactureDate", { required: true })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg flex justify-center items-center gap-2">
              <Save className="w-4 h-4" />
              {isLoading ? "Saving..." : "Save Stock Item"}
            </button>
          </form>
        </div>

        {/* ส่วนแสดง QR Code เมื่อเพิ่มเสร็จ (ใช้พื้นที่ 1 ส่วน) */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center h-fit sticky top-24">
          <h3 className="font-semibold text-lg mb-4">Generated QR Code</h3>
          {generatedQr ? (
            <div className="space-y-4 flex flex-col items-center">
              <div className="p-4 bg-white border-2 border-dashed border-gray-200 rounded-xl">
                {/* นี่คือพระเอกของเรา ตัววาดรูป QR Code */}
                <QRCodeCanvas value={generatedQr} size={150} level={"H"} />
              </div>
              <p className="text-xs text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{generatedQr}</p>
              <button className="text-sm text-indigo-600 flex items-center gap-1 hover:underline">
                <Printer className="w-4 h-4" /> Print Label
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Add an item to generate its unique QR Code.</p>
          )}
        </div>
      </div>
    </div>
  );
}