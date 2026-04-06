import dbConnect from "@/lib/dbConnect";
import Category from "@/models/Category";
import { revalidatePath } from "next/cache";
import { Plus, Tag, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

// Server Action สำหรับเพิ่มหมวดหมู่
async function addCategory(formData: FormData) {
  "use server";
  const name = formData.get("name") as string;
  const defaultShelfLifeDays = formData.get("defaultShelfLifeDays") as string;

  if (!name) return;

  await dbConnect();
  await Category.create({ 
    name, 
    defaultShelfLifeDays: Number(defaultShelfLifeDays) || 0 
  });
  
  // สั่งให้ Next.js รีเฟรชข้อมูลหน้านี้ใหม่ทันที
  revalidatePath("/categories");
}

// Server Action สำหรับลบหมวดหมู่
async function deleteCategory(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  
  await dbConnect();
  await Category.findByIdAndDelete(id);
  revalidatePath("/categories");
}

export default async function CategoriesPage() {
  await dbConnect();
  const categories = await Category.find({}).sort({ createdAt: -1 }).lean();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Tag className="w-6 h-6 text-indigo-600" />
          Category Management
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage item categories and default shelf life.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ฟอร์มเพิ่มหมวดหมู่ (ใช้พื้นที่ 1 ส่วน) */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm h-fit">
          <h2 className="text-lg font-semibold mb-4">Add New Category</h2>
          <form action={addCategory} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category Name</label>
              <input 
                type="text" 
                name="name" 
                required 
                placeholder="e.g., Medicine, Equipment"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Default Shelf Life (Days)</label>
              <input 
                type="number" 
                name="defaultShelfLifeDays" 
                defaultValue={0}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500" 
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg flex justify-center items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </form>
        </div>

        {/* ตารางแสดงหมวดหมู่ (ใช้พื้นที่ 2 ส่วน) */}
        <div className="md:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Name</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">Shelf Life (Days)</th>
                <th className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No categories found.</td>
                </tr>
              ) : (
                categories.map((cat: any) => (
                  <tr key={cat._id.toString()} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-medium">{cat.name}</td>
                    <td className="px-6 py-4">{cat.defaultShelfLifeDays}</td>
                    <td className="px-6 py-4 text-right">
                      <form action={deleteCategory}>
                        <input type="hidden" name="id" value={cat._id.toString()} />
                        <button type="submit" className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}