import clsx from "clsx";
import { ClipboardList, Crown, ShieldAlert, ShieldCheck, Users } from "lucide-react";

type RoleBadgeProps = {
  role?: string | null;
  compact?: boolean;
  className?: string;
};

const roleBadges = {
  AdminOwner: {
    label: "AdminOwner",
    Icon: Crown,
    color:
      "border-amber-300/70 bg-amber-100 text-amber-800 shadow-amber-500/10 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200",
  },
  Admin: {
    label: "Admin",
    Icon: ShieldCheck,
    color:
      "border-fuchsia-300/70 bg-fuchsia-100 text-fuchsia-800 shadow-fuchsia-500/10 dark:border-fuchsia-500/40 dark:bg-fuchsia-500/15 dark:text-fuchsia-200",
  },
  Staff: {
    label: "Staff",
    Icon: Users,
    color:
      "border-emerald-300/70 bg-emerald-100 text-emerald-800 shadow-emerald-500/10 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
  },
  Pharmacist: {
    label: "Pharmacist",
    Icon: ClipboardList,
    color:
      "border-sky-300/70 bg-sky-100 text-sky-800 shadow-sky-500/10 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-200",
  },
  Auditor: {
    label: "Auditor",
    Icon: ShieldAlert,
    color:
      "border-slate-300/70 bg-slate-100 text-slate-700 shadow-slate-500/10 dark:border-slate-500/40 dark:bg-slate-500/15 dark:text-slate-200",
  },
} as const;

type KnownRole = keyof typeof roleBadges;

function getRoleBadge(role?: string | null) {
  if (role && role in roleBadges) {
    return roleBadges[role as KnownRole];
  }

  return {
    label: role || "User",
    Icon: Users,
    color:
      "border-gray-300/70 bg-gray-100 text-gray-700 shadow-gray-500/10 dark:border-gray-600/50 dark:bg-gray-800 dark:text-gray-200",
  };
}

export default function RoleBadge({ role, compact = false, className }: RoleBadgeProps) {
  const { label, Icon, color } = getRoleBadge(role);

  return (
    <span
      className={clsx(
        "inline-flex w-fit items-center rounded-full border font-semibold leading-none shadow-sm",
        compact ? "gap-1 px-2 py-1 text-[11px]" : "gap-1.5 px-2.5 py-1 text-xs",
        color,
        className
      )}
    >
      <Icon aria-hidden="true" className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      <span>{label}</span>
    </span>
  );
}
