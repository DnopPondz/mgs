import "server-only";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  AdminOwner: ["*"],
  Admin: ["*"],
  Pharmacist: [
    "stock:read",
    "stock:write",
    "dispense:write",
    "transfer:request",
    "purchase:request",
    "reports:read",
    "recall:read",
  ],
  Staff: ["stock:read", "dispense:write", "transfer:request", "purchase:request"],
  Auditor: ["stock:read", "reports:read", "audit:read", "recall:read"],
};

export function isAdminRole(role?: string | null) {
  return role === "AdminOwner" || role === "Admin";
}

export function isAdminOwnerRole(role?: string | null) {
  return role === "AdminOwner";
}

export type AppSession = Awaited<ReturnType<typeof getServerSession>>;

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requirePermission(permission: string) {
  const session = await requireSession();
  const rolePermissions = ROLE_PERMISSIONS[session.user.role] || [];
  const explicitPermissions = session.user.permissions || [];
  if (!rolePermissions.includes("*") && !rolePermissions.includes(permission) && !explicitPermissions.includes(permission)) {
    throw new Error("Forbidden");
  }
  return session;
}

export function canUsePermission(role: string, explicitPermissions: string[] | undefined, permission: string) {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return rolePermissions.includes("*") || rolePermissions.includes(permission) || Boolean(explicitPermissions?.includes(permission));
}

export async function requireAdmin() {
  const session = await requireSession();
  if (!isAdminRole(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireAdminOwner() {
  const session = await requireSession();
  if (!isAdminOwnerRole(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}
