import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Users, UserPlus, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { createUserAction } from "@/app/actions/user";

export const dynamic = "force-dynamic";

export default async function UserManagementPage() {
  // 1. ดึงข้อมูล Session ปัจจุบัน
  const session = await getServerSession(authOptions);

  // 2. ป้องกันไม่ให้ Staff เข้าหน้านี้
  if (session?.user?.role !== "Admin") {
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

  // 3. ถ้าเป็น Admin ให้ดึงข้อมูล User ทั้งหมด (ไม่ดึงรหัสผ่านออกมา)
  await dbConnect();
  const usersList = await User.find({}).select("-password").sort({ createdAt: -1 }).lean();

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
          <form action={createUserAction} className="space-y-4">
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
              <input type="password" name="password" required minLength={6} className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select name="role" required className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="Staff">Staff (Limited Access)</option>
                <option value="Admin">Admin (Full Access)</option>
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
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role === 'Admin' 
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {user.role}
                      </span>
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