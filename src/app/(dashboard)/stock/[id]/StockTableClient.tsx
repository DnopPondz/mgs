"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, AlertCircle } from "lucide-react";

export default function StockTableClient({ groupedStocks }: { groupedStocks: any[] }) {
  // สร้าง State เก็บว่าแถวไหนโดนกดกางออกบ้าง (เก็บเป็นชื่อสินค้า)
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
        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300">
            <tr>
              <th className="px-6 py-4 font-medium w-10"></th>
              <th className="px-6 py-4 font-medium">Item Name</th>
              <th className="px-6 py-4 font-medium">Category</th>
              <th className="px-6 py-4 font-medium text-center">Total Quantity</th>
              <th className="px-6 py-4 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {groupedStocks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No stock items found.</td>
              </tr>
            ) : (
              groupedStocks.map((group: any) => {
                const isExpanded = expandedRows[group.itemName];
                const isLowStock = group.totalQuantity <= group.minStockLevel;

                return (
                  <React.Fragment key={group.itemName}>
                    {/* แถวหลัก (แถวรวมยอด) */}
                    <tr 
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                      onClick={() => toggleRow(group.itemName)}
                    >
                      <td className="px-6 py-4">
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-indigo-600" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                        {group.itemName}
                      </td>
                      <td className="px-6 py-4">{group.category}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">
                          {group.totalQuantity}
                        </span> <span className="text-xs">{group.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          isLowStock ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isLowStock ? 'Low Stock' : 'Healthy'}
                        </span>
                      </td>
                    </tr>

                    {/* แถวย่อย (กางออกมาโชว์รายล็อต) */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="bg-indigo-50/50 dark:bg-indigo-900/10 p-0">
                          <div className="px-16 py-4 border-l-4 border-indigo-500">
                            <table className="w-full text-sm">
                              <thead className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                  <th className="pb-2 font-medium">Lot Number</th>
                                  <th className="pb-2 font-medium">Qty in Lot</th>
                                  <th className="pb-2 font-medium">Expiry Date</th>
                                  <th className="pb-2 font-medium text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                                {group.lots.map((lot: any) => (
                                  <tr key={lot._id} className="text-gray-700 dark:text-gray-300">
                                    <td className="py-2.5 font-medium">{lot.lotNumber}</td>
                                    <td className="py-2.5">{lot.currentQuantity} {lot.unit}</td>
                                    <td className="py-2.5 text-red-600">
                                      {new Date(lot.expiryDate).toLocaleDateString()}
                                    </td>
                                    <td className="py-2.5 text-right">
                                      <Link href={`/stock/${lot._id}`} className="text-indigo-600 hover:underline font-medium text-xs">
                                        View Detail
                                      </Link>
                                    </td>
                                  </tr>
                                ))}
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

// โค้ดนี้ต้อง import React มาใช้สำหรับ React.Fragment
import React from 'react';