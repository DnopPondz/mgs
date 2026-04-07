"use client";

import { Printer } from "lucide-react";

export default function PrintLabelButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="w-full bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 text-white py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
    >
      <Printer className="w-4 h-4" /> Print QR Label
    </button>
  );
}