"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Package, 
  MapPin, 
  QrCode, 
  ClipboardList, 
  Users, 
  Settings,
  Tag,        // <-- ต้อง Import ตัวนี้สำหรับ Categories
  History     // <-- ต้อง Import ตัวนี้สำหรับ Usage History
} from "lucide-react";
import { useSession } from "next-auth/react";
import clsx from "clsx";

export default function Sidebar({ isOpen }: { isOpen: boolean }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "Admin";

  // เมนูทั้งหมดที่เราสร้างไว้
  const links = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Stock Management", href: "/stock", icon: Package },
    { name: "Scan QR", href: "/scan", icon: QrCode },
    { name: "Usage History", href: "/usage", icon: History },
    { name: "Categories", href: "/categories", icon: Tag },
    { name: "Locations", href: "/locations", icon: MapPin },
    { name: "Purchase List", href: "/purchase", icon: ClipboardList },
  ];

  // ถ้าเป็น Admin ถึงจะเห็นเมนูจัดการผู้ใช้
  if (isAdmin) {
    links.push({ name: "User Management", href: "/users", icon: Users });
  }
  
  links.push({ name: "Settings", href: "/settings", icon: Settings });

  return (
    <aside className={clsx(
      "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 flex flex-col",
      !isOpen && "-translate-x-full lg:translate-x-0"
    )}>
      <div className="h-16 flex items-center px-6 font-bold text-xl text-indigo-600 dark:text-indigo-400 shrink-0">
        StockFlow
      </div>
      
      {/* ใช้ overflow-y-auto เพื่อให้เมนูเลื่อนขึ้นลงได้ถ้าหน้าจอมันเล็ก */}
      <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          
          // ตรวจสอบว่าหน้าปัจจุบันตรงกับเมนูไหม (เพื่อทำไฮไลท์สี)
          // ใช้ startsWith เพื่อให้ตอนอยู่หน้า /stock/add ก็ยังไฮไลท์เมนู /stock
          const isActive = link.href === "/" 
            ? pathname === "/" 
            : pathname.startsWith(link.href);

          return (
            <Link key={link.href} href={link.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive 
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" 
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              )}>
              <Icon className="w-5 h-5" />
              <span className="font-medium">{link.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}