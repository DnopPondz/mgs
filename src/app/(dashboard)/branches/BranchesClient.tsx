"use client";

import { useState } from "react";
import { Building2, Link2 } from "lucide-react";
import toast from "react-hot-toast";
import { assignLocationBranchAction, assignUserBranchAction, createBranchAction } from "@/app/actions/enterprise";

type Branch = { _id: string; name: string; code: string };
type Location = { _id: string; name: string; branchId?: string | null };
type User = { _id: string; name: string; email: string; branchId?: string | null };

export default function BranchesClient({ branches, locations, users }: { branches: Branch[]; locations: Location[]; users: User[] }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const createBranch = async () => {
    setIsSaving(true);
    const result = await createBranchAction({ name, code });
    result.success ? toast.success(result.message) : toast.error(result.message);
    if (result.success) {
      setName("");
      setCode("");
    }
    setIsSaving(false);
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <section className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Building2 className="h-5 w-5" /> Create Branch</h2>
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Branch name" className="w-full rounded-lg border px-3 py-2 dark:border-gray-800 dark:bg-gray-900" />
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" className="w-full rounded-lg border px-3 py-2 uppercase dark:border-gray-800 dark:bg-gray-900" />
          <button onClick={createBranch} disabled={isSaving || !name || !code} className="w-full rounded-lg bg-gray-900 px-4 py-2 font-medium text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900">Create</button>
        </div>
      </section>

      <AssignPanel title="Locations" rows={locations} branches={branches} action="location" />
      <AssignPanel title="Users" rows={users} branches={branches} action="user" />
    </div>
  );
}

function AssignPanel({
  title,
  rows,
  branches,
  action,
}: {
  title: string;
  rows: Array<{ _id: string; name: string; email?: string; branchId?: string | null }>;
  branches: Branch[];
  action: "location" | "user";
}) {
  const [savingId, setSavingId] = useState("");

  const assign = async (id: string, branchId: string) => {
    setSavingId(id);
    const result = action === "location"
      ? await assignLocationBranchAction({ locationId: id, branchId })
      : await assignUserBranchAction({ userId: id, branchId });
    result.success ? toast.success(result.message) : toast.error(result.message);
    setSavingId("");
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-[var(--surface)] p-5 dark:border-gray-800">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Link2 className="h-5 w-5" /> {title}</h2>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row._id} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
            <p className="text-sm font-medium">{row.name}</p>
            {row.email && <p className="text-xs text-gray-500">{row.email}</p>}
            <select
              defaultValue={row.branchId || ""}
              onChange={(e) => assign(row._id, e.target.value)}
              disabled={savingId === row._id}
              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <option value="">No branch</option>
              {branches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}
