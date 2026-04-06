import dbConnect from "@/lib/dbConnect";
import Location from "@/models/Location";
import { revalidatePath } from "next/cache";
import { MapPin, Plus, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

// Server Actions สำหรับเพิ่มและลบ
async function addLocation(formData: FormData) {
  "use server";
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;

  if (!name) return;
  await dbConnect();
  await Location.create({ name, description });
  revalidatePath("/locations");
}

async function deleteLocation(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  await dbConnect();
  await Location.findByIdAndDelete(id);
  revalidatePath("/locations");
}

export default async function LocationsPage() {
  await dbConnect();
  const locations = await Location.find({}).sort({ createdAt: -1 }).lean();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-6 h-6 text-indigo-600" />
          Location Management
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage warehouse locations and storage areas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ฟอร์มเพิ่ม */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm h-fit">
          <h2 className="text-lg font-semibold mb-4">Add Location</h2>
          <form action={addLocation} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name (e.g., Shelf A1)</label>
              <input type="text" name="name" required className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input type="text" name="description" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg flex justify-center items-center gap-2 transition-colors">
              <Plus className="w-4 h-4" /> Add Location
            </button>
          </form>
        </div>

        {/* ตาราง */}
        <div className="md:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 font-medium">Location Name</th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {locations.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500">No locations found.</td></tr>
              ) : (
                locations.map((loc: any) => (
                  <tr key={loc._id.toString()} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-medium">{loc.name}</td>
                    <td className="px-6 py-4">{loc.description || "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <form action={deleteLocation}>
                        <input type="hidden" name="id" value={loc._id.toString()} />
                        <button type="submit" className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></button>
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