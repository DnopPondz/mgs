import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "MediFlow - Medicine Management System",
  description: "Medicine inventory, dispensing, and stock management with QR tracking",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
