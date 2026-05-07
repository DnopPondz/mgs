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
  PanelLeftClose,
  PanelLeftOpen,
  ClipboardList,
  Users,
  ArrowRightLeft,
  ShieldAlert,
  Trash2,
  Bell,
  ShoppingCart,
  AlertOctagon,
  BarChart3,
  Building2,
  UploadCloud,
  ShieldCheck
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

export default function Sidebar({ isOpen, isCollapsed, onClose, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  const isAdmin = session?.user?.role === "Admin" || session?.user?.role === "AdminOwner";

  const links = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, show: true },
    { name: "Alert Center", href: "/alerts", icon: Bell, show: true },
    { name: "Medicine Inventory", href: "/stock", icon: Package, show: true },
    { name: "POS / Dispense", href: "/pos", icon: ShoppingCart, show: true },
    { name: "Transfer Medicines", href: "/transfer", icon: ArrowRightLeft, show: true },
    { name: "Scan & Dispense", href: "/scan", icon: QrCode, show: true },
    { name: "Dispense History", href: "/usage", icon: History, show: true },
    { name: "Restock Plan", href: "/purchase", icon: ClipboardList, show: true },
    { name: "Procurement", href: "/procurement", icon: ClipboardList, show: true },
    { name: "Recall & Lot Trace", href: "/recall", icon: AlertOctagon, show: true },
    { name: "Reports", href: "/reports", icon: BarChart3, show: true },
    { name: "Approvals", href: "/approvals", icon: ShieldCheck, show: true },
    { name: "Branches", href: "/branches", icon: Building2, show: isAdmin },
    { name: "Import & Integrations", href: "/integrations", icon: UploadCloud, show: isAdmin },
    { name: "Recycle Bin", href: "/stock/recycle-bin", icon: Trash2, show: isAdmin },
    { name: "Categories", href: "/categories", icon: Tag, show: isAdmin },
    { name: "Locations", href: "/locations", icon: MapPin, show: isAdmin },
    { name: "Users", href: "/users", icon: Users, show: isAdmin },
    { name: "System & Audit", href: "/system", icon: ShieldAlert, show: isAdmin },
  ].filter(link => link.show); 

  const isRouteActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <div 
        className={`fixed inset-0 z-40 bg-gray-900/45 transition-opacity lg:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gray-200 bg-[var(--surface)] transition-[transform,width] duration-200 dark:border-gray-800",
        isCollapsed ? "lg:w-20" : "lg:w-72",
        !isOpen && "-translate-x-full lg:translate-x-0"
      )}>
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-5 z-50 hidden h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-[var(--surface)] text-gray-500 shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-800 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100 lg:inline-flex"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>

        <div className={clsx(
          "flex h-20 items-center border-b border-gray-200 px-5 dark:border-gray-800",
          isCollapsed ? "lg:justify-center lg:px-3" : "justify-between"
        )}>
          <Link
            href="/"
            className={clsx("flex min-w-0 items-center gap-3", isCollapsed && "lg:justify-center")}
            onClick={onClose}
            title="MediFlow"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
              <Package className="h-5 w-5" />
            </span>
            <div className={clsx("min-w-0", isCollapsed && "lg:hidden")}>
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">MediFlow</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">Product Operations</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className={clsx(
              "rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 lg:hidden",
              isCollapsed && "hidden"
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className={clsx(
          "flex-1 space-y-1 overflow-y-auto py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          isCollapsed ? "lg:px-2 px-3" : "px-3"
        )}>
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = isRouteActive(link.href);
            
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={onClose}
                className={clsx(
                  "group/item relative flex items-center text-sm transition-colors",
                  isCollapsed ? "gap-3 rounded-lg px-3 py-2.5 lg:mx-auto lg:h-11 lg:w-11 lg:justify-center lg:px-0 lg:py-0" : "gap-3 rounded-md px-3 py-2.5",
                  isActive
                    ? "border border-gray-300 bg-gray-100 font-medium text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                )}
              >
                <Icon className={clsx("shrink-0", isCollapsed ? "h-5 w-5 lg:h-[18px] lg:w-[18px]" : "h-4 w-4")} />
                <span className={clsx("truncate", isCollapsed && "lg:hidden")}>{link.name}</span>
                {isCollapsed && (
                  <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-900 opacity-0 shadow-lg transition-opacity group-hover/item:opacity-100 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 lg:block">
                    {link.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
