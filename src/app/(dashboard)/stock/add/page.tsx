"use client";

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { createStockAction, getDropdownData } from "@/app/actions/stock";
import { QRCodeCanvas } from "qrcode.react";
import { PackagePlus, Save, CopyCheck, Camera } from "lucide-react";
import { useSearchParams } from "next/navigation";

type SelectOption = {
  _id: string;
  name: string;
};

type ItemTemplate = {
  _id: string;
  genericName?: string;
  strength?: string;
  medicineType?: string;
  usageInstructions?: string;
  categoryId: string;
  locationId: string;
  unit: string;
  minStockLevel: number;
  shelfLifeDays: number;
  unitCost?: number;
  salePrice?: number;
  imageUrl?: string;
};

type StockFormData = {
  itemName: string;
  genericName?: string;
  strength?: string;
  medicineType?: string;
  usageInstructions?: string;
  categoryId: string;
  locationId: string;
  lotNumber: string;
  initialQuantity: number | string;
  unit: string;
  unitCost?: number | string;
  salePrice?: number | string;
  minStockLevel: number | string;
  shelfLifeDays: number | string;
  manufactureDate: string;
};

const MEDICINE_TYPES = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Cream/Ointment",
  "Drops",
  "Inhaler",
  "General",
];

function AddStockForm() {
  const searchParams = useSearchParams();
  const initialItem = searchParams.get("item");

  const [isLoading, setIsLoading] = useState(false);
  const [generatedQr, setGeneratedQr] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [locations, setLocations] = useState<SelectOption[]>([]);
  const [itemTemplates, setItemTemplates] = useState<ItemTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { register, handleSubmit, reset, setValue } = useForm<StockFormData>({
    defaultValues: {
      medicineType: "General",
      unitCost: 0,
      salePrice: 0,
    },
  });

  const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-colors";

  const applyTemplate = useCallback((template: ItemTemplate) => {
    setValue("itemName", template._id);
    setValue("genericName", template.genericName || "");
    setValue("strength", template.strength || "");
    setValue("medicineType", template.medicineType || "General");
    setValue("usageInstructions", template.usageInstructions || "");
    setValue("categoryId", template.categoryId);
    setValue("locationId", template.locationId);
    setValue("unit", template.unit);
    setValue("minStockLevel", template.minStockLevel);
    setValue("shelfLifeDays", template.shelfLifeDays);
    setValue("unitCost", template.unitCost || 0);
    setValue("salePrice", template.salePrice || 0);
    setImagePreview(template.imageUrl || null);
  }, [setValue]);

  useEffect(() => {
    async function fetchData() {
      const data = await getDropdownData();
      if (data.success) {
        const fetchedCategories = data.categories as SelectOption[];
        const fetchedLocations = data.locations as SelectOption[];
        const fetchedTemplates = data.itemTemplates as ItemTemplate[];

        setCategories(fetchedCategories);
        setLocations(fetchedLocations);
        setItemTemplates(fetchedTemplates);

        if (initialItem) {
          const decodedInitialItem = decodeURIComponent(initialItem);
          const template = fetchedTemplates.find((item) => item._id === decodedInitialItem);
          if (template) {
            setSelectedTemplate(decodedInitialItem);
            applyTemplate(template);
          } else {
            setValue("itemName", decodedInitialItem);
          }
        }
      }
    }
    fetchData();
  }, [applyTemplate, initialItem, setValue]);

  const handleSelectTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedItemName = e.target.value;
    setSelectedTemplate(selectedItemName);

    if (!selectedItemName) {
      reset({ medicineType: "General", unitCost: 0, salePrice: 0 });
      setImagePreview(null);
      return;
    }
    
    const template = itemTemplates.find((item) => item._id === selectedItemName);
    if (template) {
      applyTemplate(template);
      toast.success("Auto-filled existing medicine details!");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setImagePreview(canvas.toDataURL('image/jpeg', 0.7)); 
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: StockFormData) => {
    setIsLoading(true);
    const payload = {
      ...data,
      initialQuantity: Number(data.initialQuantity),
      shelfLifeDays: Number(data.shelfLifeDays),
      minStockLevel: Number(data.minStockLevel),
      unitCost: Number(data.unitCost) || 0, // แปลงค่าเป็นตัวเลข
      salePrice: Number(data.salePrice) || 0,
      imageUrl: imagePreview 
    };

    const res = await createStockAction(payload);
    
    if (res.success) {
      toast.success(res.message);
      setGeneratedQr(res.qrCodeValue);
      reset({ medicineType: "General", unitCost: 0, salePrice: 0 });
      setSelectedTemplate(""); 
      setImagePreview(null);
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
            <CopyCheck className="w-4 h-4" /> Quick Fill (Select Existing Medicine)
          </label>
          <select value={selectedTemplate} onChange={handleSelectTemplate} className={inputClass}>
            <option value="">-- Or type manually below for a new medicine --</option>
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
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Medicine Image / Photo</label>
              <div className="flex items-center gap-4">
                <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 cursor-pointer overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="w-8 h-8 mb-1 text-gray-400" />
                      <span className="text-xs font-medium px-2 text-center">Tap to photo</span>
                    </>
                  )}
                </div>
                {imagePreview && <button type="button" onClick={() => setImagePreview(null)} className="text-sm text-red-500">Remove</button>}
              </div>
              <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Medicine Name (Brand)</label>
              <input {...register("itemName", { required: true })} className={inputClass} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Generic Name</label>
                <input {...register("genericName")} className={inputClass} placeholder="e.g., Paracetamol" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Strength</label>
                <input {...register("strength")} className={inputClass} placeholder="e.g., 500 mg" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Medicine Type</label>
                <select {...register("medicineType", { required: true })} className={inputClass}>
                  {MEDICINE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Usage / Indication</label>
                <input {...register("usageInstructions")} className={inputClass} placeholder="e.g., Fever, mild pain" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Category</label>
                <select {...register("categoryId", { required: true })} className={inputClass}>
                  <option value="">Select...</option>
                  {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Location</label>
                <select {...register("locationId", { required: true })} className={inputClass}>
                  <option value="">Select...</option>
                  {locations.map(loc => <option key={loc._id} value={loc._id}>{loc.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Lot Number</label>
                <input {...register("lotNumber", { required: true })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input type="number" {...register("initialQuantity", { required: true })} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Unit</label>
                <input {...register("unit", { required: true })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit Cost (฿)</label>
                <input type="number" step="0.01" {...register("unitCost")} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sale Price (฿)</label>
                <input type="number" step="0.01" {...register("salePrice")} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Min Level</label>
                <input type="number" {...register("minStockLevel", { required: true })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Shelf Life (Days)</label>
                <input type="number" {...register("shelfLifeDays", { required: true })} className={inputClass} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Manufacture Date</label>
              <input type="date" {...register("manufactureDate", { required: true })} className={inputClass} />
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2">
              <Save className="w-5 h-5" />
              {isLoading ? "Saving..." : "Save Medicine Item"}
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
            <p className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{generatedQr}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Add a medicine to generate QR Code.</p>
        )}
      </div>
    </div>
  );
}

export default function AddStockPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
        <PackagePlus className="w-6 h-6 text-indigo-600" /> Add / Restock Medicine
      </h1>
      <Suspense fallback={<div>Loading...</div>}>
        <AddStockForm />
      </Suspense>
    </div>
  );
}
