import { Building2, ShieldAlert } from "lucide-react";
import dbConnect from "@/lib/dbConnect";
import Branch from "@/models/Branch";
import Location from "@/models/Location";
import User from "@/models/User";
import BranchesClient from "./BranchesClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "Admin" && session?.user?.role !== "AdminOwner") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <ShieldAlert className="mb-4 h-16 w-16 text-red-500" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="mt-2 text-gray-500">Only Administrators can manage branches.</p>
      </div>
    );
  }

  await dbConnect();
  const branches = await Branch.find().sort({ name: 1 }).lean();
  const locations = await Location.find().select("name branchId").sort({ name: 1 }).lean();
  const users = await User.find().select("name email branchId").sort({ name: 1 }).lean();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <Building2 className="h-6 w-6 text-gray-700 dark:text-gray-200" />
          Multi-Branch
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Separate stock by branch, assign locations and users, and enable branch-level reports.</p>
      </div>

      <BranchesClient
        branches={JSON.parse(JSON.stringify(branches))}
        locations={JSON.parse(JSON.stringify(locations))}
        users={JSON.parse(JSON.stringify(users))}
      />
    </div>
  );
}
