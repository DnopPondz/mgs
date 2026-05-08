"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import PinIdleLock from "./components/security/PinIdleLock";

export function Providers({ children, session }: { children: React.ReactNode; session: Session | null }) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
        <PinIdleLock />
        <Toaster position="top-right" />
      </ThemeProvider>
    </SessionProvider>
  );
}
