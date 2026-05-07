"use client";
import { useState, useEffect } from "react";
import { Menu, Moon, Sun, User as UserIcon } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import RoleBadge from "@/app/components/ui/RoleBadge";

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { data: session } = useSession();
  const { setTheme, resolvedTheme } = useTheme();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const getPageTitle = () => {
    if (pathname === "/") return "Dashboard";
    if (pathname.startsWith("/alerts")) return "Alert Center";
    if (pathname.startsWith("/approvals")) return "Approvals";
    if (pathname.startsWith("/branches")) return "Branches";
    if (pathname.startsWith("/integrations")) return "Import & Integrations";
    if (pathname.startsWith("/pos")) return "POS / Dispense";
    if (pathname.startsWith("/procurement")) return "Procurement";
    if (pathname.startsWith("/recall")) return "Recall & Lot Trace";
    if (pathname.startsWith("/reports")) return "Reports";
    if (pathname.startsWith("/stock/recycle-bin")) return "Recycle Bin";
    if (pathname.startsWith("/stock/add")) return "Add Medicine";
    if (pathname.startsWith("/stock/")) return "Medicine Detail";
    if (pathname.startsWith("/stock")) return "Medicine Inventory";
    if (pathname.startsWith("/scan")) return "Scan & Dispense";
    if (pathname.startsWith("/usage")) return "Dispense History";
    if (pathname.startsWith("/purchase")) return "Restock Plan";
    if (pathname.startsWith("/categories")) return "Categories";
    if (pathname.startsWith("/locations")) return "Locations";
    if (pathname.startsWith("/users")) return "Users";
    if (pathname.startsWith("/transfer")) return "Transfer Medicines";
    if (pathname.startsWith("/system")) return "System & Audit";
    return "MediFlow";
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-[var(--surface)]/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/90 dark:border-gray-800 lg:px-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="hidden text-xl font-semibold text-gray-800 dark:text-white sm:block">{getPageTitle()}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="rounded-md border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          aria-label="Toggle color mode"
        >
          {mounted ? (
            resolvedTheme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />
          ) : (
            <div className="w-5 h-5 opacity-0"></div>
          )}
        </button>

        {session?.user ? (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end gap-1 text-right">
              <span className="text-sm font-medium text-gray-900 dark:text-white">{session.user.name}</span>
              <RoleBadge role={session.user.role} compact />
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              <UserIcon className="w-5 h-5" />
            </div>
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="rounded-md border border-gray-300 px-2.5 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Logout
            </button>
          </div>
        ) : (
          <a href="/login" className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">Login</a>
        )}
      </div>
    </header>
  );
}
