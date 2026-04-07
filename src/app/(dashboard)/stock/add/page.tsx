"use client";

import { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { createStockAction, getDropdownData } from "@/app/actions/stock";
import { QRCodeCanvas } from "qrcode.react";
import { PackagePlus, Save, CopyCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";

function AddStockForm() {
  const searchParams = useSearchParams();
  const initialItem = searchParams.get("item");

  const [isLoading, setIsLoading] = useState(false);
  const [generatedQr, setGeneratedQr] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [itemTemplates, setItemTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  
  const { register, handleSubmit, reset, setValue } = useForm();

  // คลาสมาตรฐานสำหรับ Input ไม่ให้แสบตาในโหมดมืด
  const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-colors";

  useEffect(() => {
    async function fetchData() {
      const data = await getDropdownData();
      if (data.success) {
        setCategories(data.categories);
        setLocations(data.locations);
        setItemTemplates(data.itemTemplates);

        if (initialItem) {
          const template = data.itemTemplates.find((t: any) => t._id === initialItem);
          if (template) {
            setSelectedTemplate(template._id);
            setValue("itemName", template._id);
            setValue("categoryId", template.categoryId);
            setValue("locationId", template.locationId);
            setValue("unit", template.unit);
            setValue("minStockLevel", template.minStockLevel);
            setValue("shelfLifeDays", template.shelfLifeDays);
            toast.success(`Ready to restock: ${template._id}`);
          }
        }
      }
    }
    fetchData();
  }, [initialItem, setValue]);

  const handleSelectTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedItemName = e.target.value;
    setSelectedTemplate(selectedItemName);

    if (!selectedItemName) {
      reset();
      return;
    }
    
    const template = itemTemplates.find(t => t._id === selectedItemName);
    if (template) {
      setValue("itemName", template._id);
      setValue("categoryId", template.categoryId);
      setValue("locationId", template.locationId);
      setValue("unit", template.unit);
      setValue("minStockLevel", template.minStockLevel);
      setValue("shelfLifeDays", template.shelfLifeDays);
      toast.success("Auto-filled existing item details!");
    }
  };

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
      setSelectedTemplate(""); 
    } else {
      toast.error(res.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
          <label className="block text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2">
            <CopyCheck className="w-4 h-4" /> Quick Fill (Select Existing Item)
          </label>
          <select value={selectedTemplate} onChange={handleSelectTemplate} className={inputClass}>
            <option value="">-- Or type manually below for a new item --</option>
            {itemTemplates.map(template => (
              <option key={template._id} value={template._id}>
                {template._id} (Unit: {template.unit})
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Item Name</label>
              <input {...register("itemName", { required: true })} placeholder="e.g., Paracetamol 500mg" className={inputClass} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Category</label>
                <select {...register("categoryId", { required: true })} className={inputClass}>
                  <option value="">Select Category...</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Storage Location</label>
                <select {...register("locationId", { required: true })} className={inputClass}>
                  <option value="">Select Location...</option>
                  {locations.map(loc => (
                    <option key={loc._id} value={loc._id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-1">Lot Number (New)</label>
                <input {...register("lotNumber", { required: true })} placeholder="e.g., LOT-2024-001" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-1">Quantity Added</label>
                <input type="number" {...register("initialQuantity", { required: true, min: 1 })} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Unit</label>
                <input {...register("unit", { required: true })} placeholder="e.g., box, pcs" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Min Level</label>
                <input type="number" {...register("minStockLevel", { required: true })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Shelf Life (Days)</label>
                <input type="number" {...register("shelfLifeDays", { required: true })} className={inputClass} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-1">Manufacture Date</label>
              <input type="date" {...register("manufactureDate", { required: true })} className={inputClass} />
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 shadow-md transition-colors">
              <Save className="w-5 h-5" />
              {isLoading ? "Saving..." : "Save Stock Item"}
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center h-fit sticky top-24">
        <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">Generated QR Code</h3>
        {generatedQr ? (
          <div className="space-y-4 flex flex-col items-center">
            <div className="p-4 bg-white border-2 border-dashed border-gray-200 rounded-xl">
              <QRCodeCanvas value={generatedQr} size={150} level={"H"} />
            </div>
            <p className="text-xs text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{generatedQr}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">Add an item to generate its unique QR Code.</p>
        )}
      </div>
    </div>
  );
}

export default function AddStockPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
        <PackagePlus className="w-6 h-6 text-indigo-600" /> Add / Restock Item
      </h1>
      <Suspense fallback={<div className="p-12 text-center text-gray-500 animate-pulse">Loading setup...</div>}>
        <AddStockForm />
      </Suspense>
    </div>
  );
}