import { ShieldAlert, UploadCloud } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import ImportClient from "./ImportClient";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "Admin") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <ShieldAlert className="mb-4 h-16 w-16 text-red-500" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="mt-2 text-gray-500">Only Administrators can import and manage integrations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <UploadCloud className="h-6 w-6 text-gray-700 dark:text-gray-200" />
          Import & Integrations
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Import inventory from Excel/CSV templates and prepare clean data for scanners, ERP, or accounting tools.</p>
      </div>
      <ImportClient />
    </div>
  );
}
