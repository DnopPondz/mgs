import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import Category from "@/models/Category";
import Location from "@/models/Location";
import { Package, Calendar, MapPin, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import UseStockForm from "./UseStockForm";

export const dynamic = "force-dynamic";

export default async function StockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  
  const resolvedParams = await params;
  const stockId = resolvedParams.id;
  
  const stock = await StockItem.findById(stockId)
    .populate({ path: 'categoryId', model: Category })
    .populate({ path: 'locationId', model: Location })
    .lean();

  if (!stock) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Stock Item Not Found</h2>
        <Link href="/stock" className="text-indigo-600 hover:underline mt-2">Return to Stock List</Link>
      </div>
    );
  }

  const isLowStock = stock.currentQuantity <= stock.minStockLevel;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/stock" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Stock List
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="w-6 h-6 text-indigo-600" />
                {stock.itemName}
              </h1>
              <p className="text-gray-500 text-sm mt-1">Lot Number: {stock.lotNumber}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                stock.currentQuantity === 0 ? 'bg-red-100 text-red-700' :
                isLowStock ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {stock.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div>
              <p className="text-xs text-gray-500 mb-1">Category</p>
              <p className="font-medium text-gray-900 dark:text-gray-200">{stock.categoryId?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> Location</p>
              <p className="font-medium text-gray-900 dark:text-gray-200">{stock.locationId?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Current Quantity</p>
              <p className={`text-2xl font-bold ${isLowStock ? 'text-red-600' : 'text-indigo-600'}`}>
                {stock.currentQuantity} <span className="text-sm font-normal text-gray-500">{stock.unit}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">Min Level: {stock.minStockLevel}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Initial Quantity</p>
              <p className="font-medium text-gray-900 dark:text-gray-200">{stock.initialQuantity} {stock.unit}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Manufacture Date</p>
              <p className="font-medium text-gray-900 dark:text-gray-200">{new Date(stock.manufactureDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Expiry Date</p>
              <p className="font-medium text-red-600">{new Date(stock.expiryDate).toLocaleDateString()}</p>
              <p className="text-xs text-gray-400 mt-1">Shelf Life: {stock.shelfLifeDays} Days</p>
            </div>
          </div>

          <UseStockForm stockId={stock._id.toString()} currentQuantity={stock.currentQuantity} unit={stock.unit} />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center h-fit text-center">
          <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-gray-200">Item QR Code</h3>
          <div className="bg-white p-4 border-2 border-dashed border-gray-200 rounded-xl mb-4 inline-block">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${stock.qrCodeValue}`} 
              alt="QR Code" 
              className="w-[150px] h-[150px]"
            />
          </div>
          <p className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded text-gray-600 dark:text-gray-300">
            {stock.qrCodeValue}
          </p>
        </div>
      </div>
    </div>
  );
}