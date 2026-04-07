import dbConnect from "@/lib/dbConnect";
import StockItem from "@/models/StockItem";
import Location from "@/models/Location";
import { ArrowRightLeft } from "lucide-react";
import TransferFormClient from "./TransferFormClient";

export const dynamic = "force-dynamic";

export default async function TransferPage() {
  await dbConnect();
  
  const stocks = await StockItem.find({ currentQuantity: { $gt: 0 } })
    .populate('locationId')
    .lean();
    
  const locations = await Location.find({}).lean();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ArrowRightLeft className="w-6 h-6 text-indigo-600" />
          Stock Transfer
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Move stock items between different storage locations.</p>
      </div>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
        <TransferFormClient 
          stocks={JSON.parse(JSON.stringify(stocks))} 
          locations={JSON.parse(JSON.stringify(locations))} 
        />
      </div>
    </div>
  );
}