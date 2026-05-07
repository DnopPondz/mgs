import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Users, UserPlus, ShieldAlert, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { createUserAction, deleteUserAction } from "@/app/actions/user";
import RoleBadge from "@/app/components/ui/RoleBadge";

export const dynamic = "force-dynamic";

export default async function UserManagementPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "Admin" || session?.user?.role === "AdminOwner";
  const isAdminOwner = session?.user?.role === "AdminOwner";

  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-4 opacity-80" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          You do not have permission to view this page. Only Administrators can manage users.
        </p>
      </div>
    );
  }

  await dbConnect();
  const usersList = await User.find({}).select("-password").sort({ createdAt: -1 }).lean();

  async function createUserFormAction(formData: FormData) {
    "use server";
    await createUserAction(formData);
  }

  async function deleteUserFormAction(formData: FormData) {
    "use server";
    await deleteUserAction(formData);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-600" />
          User Management
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add new staff or administrators to the system.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ฟอร์มสร้างผู้ใช้ใหม่ */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm h-fit">
          <h2 className="text-lg font-semibold mb-4">Add New User</h2>
          <form action={createUserFormAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input type="text" name="name" required className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <input type="email" name="email" required className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input type="password" name="password" required minLength={8} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select name="role" required className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="Staff">Staff (Limited Access)</option>
                <option value="Pharmacist">Pharmacist (Stock + Dispense)</option>
                <option value="Auditor">Auditor (Reports + Audit)</option>
                <option value="Admin">Admin (Full Access)</option>
                {isAdminOwner && <option value="AdminOwner">Admin Owner (System Owner)</option>}
              </select>
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg flex justify-center items-center gap-2 transition-colors mt-2">
              <UserPlus className="w-4 h-4" /> Create User
            </button>
          </form>
        </div>

        {/* ตารางรายชื่อผู้ใช้งาน */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">User Details</th>
                  <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Role</th>
                  <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Joined Date</th>
                  {isAdminOwner && <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {usersList.map((user: any) => (
                  <tr key={user._id.toString()} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900 dark:text-white">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-6 py-4">
                      {user.isActive ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium"><CheckCircle2 className="w-4 h-4"/> Active</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 text-xs font-medium"><XCircle className="w-4 h-4"/> Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    {isAdminOwner && (
                      <td className="px-6 py-4 text-right">
                        <form action={deleteUserFormAction}>
                          <input type="hidden" name="userId" value={user._id.toString()} />
                          <button
                            type="submit"
                            disabled={user._id.toString() === session?.user?.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
