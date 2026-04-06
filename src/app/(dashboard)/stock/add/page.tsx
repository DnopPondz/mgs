"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { createStockAction, getDropdownData } from "@/app/actions/stock";
import { QRCodeCanvas } from "qrcode.react";
import { PackagePlus, Save, Printer } from "lucide-react";

export default function AddStockPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedQr, setGeneratedQr] = useState<string | null>(null);
  
  // State สำหรับเก็บข้อมูล Dropdown
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();

  // ดึงข้อมูล Dropdown ตอนเปิดหน้าเว็บ
  useEffect(() => {
    async function fetchData() {
      const data = await getDropdownData();
      if (data.success) {
        setCategories(data.categories);
        setLocations(data.locations);
      }
    }
    fetchData();
  }, []);

  // เมื่อเปลี่ยน Category ให้ดึง Default Shelf Life มาใส่ฟอร์มอัตโนมัติ (UX ที่ดี)
  const selectedCategoryId = watch("categoryId");
  useEffect(() => {
    if (selectedCategoryId) {
      const selectedCat = categories.find(c => c._id === selectedCategoryId);
      if (selectedCat && selectedCat.defaultShelfLifeDays) {
        setValue("shelfLifeDays", selectedCat.defaultShelfLifeDays);
      }
    }
  }, [selectedCategoryId, categories, setValue]);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    const payload = {
      ...data,
      initialQuantity: Number(data.initialQuantity),
      shelfLifeDays: Number(data.shelfLifeDays),
      minStockLevel: Number(data.minStockLevel),
    };

    const res = await createStockAction(payload);
    
    if (res.success) {
      toast.success(res.message);
      setGeneratedQr(res.qrCodeValue);
      reset();
    } else {
      toast.error(res.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <PackagePlus className="w-6 h-6 text-indigo-600" />
        Add New Stock
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Item Name</label>
              <input {...register("itemName", { required: true })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            
            {/* Dropdown สำหรับ Category และ Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select {...register("categoryId", { required: true })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select Category...</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Storage Location</label>
                <select {...register("locationId", { required: true })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select Location...</option>
                  {locations.map(loc => (
                    <option key={loc._id} value={loc._id}>{loc.name}</option>
                  ))}
                </select>
              </div>
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
                <input type="number" {...register("initialQuantity", { required: true, min: 1 })} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" />
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

        {/* แสดง QR Code */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center text-center h-fit sticky top-24">
          <h3 className="font-semibold text-lg mb-4">Generated QR Code</h3>
          {generatedQr ? (
            <div className="space-y-4 flex flex-col items-center">
              <div className="p-4 bg-white border-2 border-dashed border-gray-200 rounded-xl">
                <QRCodeCanvas value={generatedQr} size={150} level={"H"} />
              </div>
              <p className="text-xs text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{generatedQr}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Add an item to generate its unique QR Code.</p>
          )}
        </div>
      </div>
    </div>
  );
}