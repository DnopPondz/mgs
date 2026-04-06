"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, PlusCircle, ArrowRight } from "lucide-react";

export default function StockTableClient({ groupedStocks }: { groupedStocks: any[] }) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (itemName: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          {/* หัวตารางหลัก */}
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-6 py-4 font-medium w-12 text-center text-gray-700 dark:text-gray-300"></th>
              <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Item Name</th>
              <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Category</th>
              <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-center">Total Qty</th>
              <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-center">Status</th>
              <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {groupedStocks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No stock items found.</td>
              </tr>
            ) : (
              groupedStocks.map((group: any) => {
                const isExpanded = expandedRows[group.itemName];
                const isLowStock = group.totalQuantity <= group.minStockLevel;

                return (
                  <React.Fragment key={group.itemName}>
                    {/* แถวหลัก */}
                    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${isExpanded ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                      <td className="px-6 py-4 text-center cursor-pointer" onClick={() => toggleRow(group.itemName)}>
                        <button className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                      </td>
                      <td className="px-6 py-4 cursor-pointer" onClick={() => toggleRow(group.itemName)}>
                        <p className="font-bold text-gray-900 dark:text-white text-base">{group.itemName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{group.lots.length} active lots</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{group.category}</td>
                      <td className="px-6 py-4 text-center cursor-pointer" onClick={() => toggleRow(group.itemName)}>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">
                          {group.totalQuantity}
                        </span> <span className="text-xs text-gray-500">{group.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isLowStock ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isLowStock ? 'Low Stock' : 'Healthy'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href="/stock/add" 
                          className="inline-flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm"
                        >
                          <PlusCircle className="w-4 h-4" /> Restock
                        </Link>
                      </td>
                    </tr>

                    {/* แถวย่อย */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="p-0 bg-white dark:bg-gray-900">
                          {/* เว้นแค่ด้านซ้ายให้ตรงกับ Item Name ไม่เว้นขอบบนล่าง/ขวา เพื่อให้ติดเป็นตารางเนื้อเดียวกัน */}
                          <div className="pl-14 border-l-2 border-indigo-100 dark:border-indigo-900/30 ml-4">
                            <table className="w-full text-left text-sm">
                              {/* 🟢 คลาสเหมือน Header ตารางหลักเป๊ะๆ */}
                              <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                  <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Lot Number</th>
                                  <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-center">Qty Available</th>
                                  <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Expiry Date</th>
                                  <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-right">Action</th>
                                </tr>
                              </thead>
                              {/* 🟢 คลาสเหมือน Body ตารางหลักเป๊ะๆ */}
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                {group.lots.map((lot: any) => {
                                  const isExpiringSoon = (new Date(lot.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24) <= 30;

                                  return (
                                    <tr key={lot._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                      <td className="px-6 py-4 font-mono text-gray-900 dark:text-white">
                                        {lot.lotNumber}
                                      </td>
                                      <td className="px-6 py-4 text-center font-medium text-gray-900 dark:text-white">
                                        {lot.currentQuantity} <span className="text-xs font-normal text-gray-500">{lot.unit}</span>
                                      </td>
                                      <td className={`px-6 py-4 font-medium ${isExpiringSoon ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                                        {new Date(lot.expiryDate).toLocaleDateString()}
                                        {isExpiringSoon && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Expiring</span>}
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <Link 
                                          href={`/stock/${lot._id}`} 
                                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-sm transition-colors"
                                        >
                                          Use / View <ArrowRight className="w-4 h-4" />
                                        </Link>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}