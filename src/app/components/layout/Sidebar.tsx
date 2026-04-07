"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import { 
  LayoutDashboard, 
  Package, 
  QrCode, 
  History, 
  Tag, 
  MapPin, 
  X,
  ClipboardList,
  Users,
  ArrowRightLeft
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  const isAdmin = session?.user?.role === "Admin";

  const links = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, show: true },
    { name: "Stock Management", href: "/stock", icon: Package, show: true },
    { name: "Stock Transfer", href: "/transfer", icon: ArrowRightLeft, show: true },
    { name: "Scan QR", href: "/scan", icon: QrCode, show: true },
    { name: "Usage History", href: "/usage", icon: History, show: true },
    { name: "Purchase List", href: "/purchase", icon: ClipboardList, show: true },
    { name: "Categories", href: "/categories", icon: Tag, show: isAdmin },
    { name: "Locations", href: "/locations", icon: MapPin, show: isAdmin },
    { name: "Users", href: "/users", icon: Users, show: isAdmin },
  ].filter(link => link.show); 

  return (
    <>
      <div 
        className={`fixed inset-0 bg-gray-900/50 z-40 lg:hidden transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 flex flex-col",
        !isOpen && "-translate-x-full lg:translate-x-0"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800">
          <Link href="/" className="flex items-center gap-2" onClick={onClose}>
            <Package className="w-6 h-6 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">StockFlow</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium" 
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.name}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}