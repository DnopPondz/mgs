"use client";
import { useState, useEffect } from "react";
import { Menu, Moon, Sun, User as UserIcon } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { data: session } = useSession();
  const { theme, setTheme, resolvedTheme } = useTheme(); 
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 lg:px-6 z-40 sticky top-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white hidden sm:block">Dashboard</h1>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-full dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          {mounted ? (
            resolvedTheme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />
          ) : (
            <div className="w-5 h-5 opacity-0"></div>
          )}
        </button>

        {session?.user ? (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-medium text-gray-900 dark:text-white">{session.user.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{session.user.role}</span>
            </div>
            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <UserIcon className="w-5 h-5" />
            </div>
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-red-600 hover:text-red-700 font-medium ml-2"
            >
              Logout
            </button>
          </div>
        ) : (
          <a href="/login" className="text-sm font-medium text-indigo-600">Login</a>
        )}
      </div>
    </header>
  );
}