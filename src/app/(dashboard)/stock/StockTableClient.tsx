"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, PlusCircle, ArrowRight, CornerDownRight } from "lucide-react";

export default function StockTableClient({ groupedStocks }: { groupedStocks: any[] }) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (itemName: string) => {
    setExpandedRows(prev => ({ ...prev, [itemName]: !prev[itemName] }));
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-6 py-4 w-14 text-center"></th>
              <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Item Name</th>
              <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Category</th>
              <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-center">Total Qty</th>
              <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-center">Status</th>
              <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {groupedStocks.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No stock items found.</td></tr>
            ) : (
              groupedStocks.map((group: any) => {
                const isExpanded = expandedRows[group.itemName];
                const isLowStock = group.totalQuantity <= group.minStockLevel;

                return (
                  <React.Fragment key={group.itemName}>
                    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${isExpanded ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                      <td className="px-6 py-4 text-center cursor-pointer" onClick={() => toggleRow(group.itemName)}>
                        <button className="p-1 rounded-md text-gray-400 hover:bg-gray-200 hover:text-indigo-600 dark:hover:bg-gray-700 dark:hover:text-indigo-400 transition-colors">
                          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                      </td>
                      <td className="px-6 py-4 cursor-pointer" onClick={() => toggleRow(group.itemName)}>
                        <p className="font-bold text-gray-900 dark:text-white text-base">{group.itemName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{group.lots.length} active lots</p>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{group.category}</td>
                      <td className="px-6 py-4 text-center cursor-pointer" onClick={() => toggleRow(group.itemName)}>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">{group.totalQuantity}</span> 
                        <span className="text-xs text-gray-500 ml-1">{group.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isLowStock ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                          {isLowStock ? 'Low Stock' : 'Healthy'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/stock/add?item=${encodeURIComponent(group.itemName)}`} className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm">
                          <PlusCircle className="w-4 h-4" /> Restock
                        </Link>
                      </td>
                    </tr>

                    {isExpanded && group.lots.map((lot: any) => {
                      const isExpiringSoon = (new Date(lot.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24) <= 30;

                      return (
                        <tr key={lot._id} className="bg-gray-50/50 dark:bg-gray-800/20 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="px-6 py-3 text-center">
                            <CornerDownRight className="w-4 h-4 mx-auto text-gray-400 dark:text-gray-500" />
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">Lot</span>
                              <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{lot.lotNumber}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Exp:</span>
                              <span className={`text-sm ${isExpiringSoon ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                                {new Date(lot.expiryDate).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{lot.currentQuantity}</span>
                            <span className="text-xs text-gray-500 ml-1">{lot.unit}</span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            {isExpiringSoon && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Expiring</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <Link href={`/stock/${lot._id}`} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-xs font-semibold transition-colors">
                              Use / View <ArrowRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
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