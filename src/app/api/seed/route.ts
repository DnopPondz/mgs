import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

type SeedRequestBody = {
  key?: string;
};

const seedRoles = ["AdminOwner", "Admin", "Pharmacist", "Staff", "Auditor"] as const;

function methodNotAllowed() {
  return NextResponse.json(
    { success: false, message: "Method not allowed" },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export async function GET() {
  return methodNotAllowed();
}

export async function POST(request: Request) {
  const seedAdminKey = process.env.SEED_ADMIN_KEY;
  if (!seedAdminKey) {
    return NextResponse.json(
      { success: false, message: "Seed endpoint is disabled" },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as SeedRequestBody;
  const providedKey = request.headers.get("x-seed-key") || body.key || "";
  if (providedKey !== seedAdminKey) {
    return NextResponse.json(
      { success: false, message: "Invalid seed key" },
      { status: 401 }
    );
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME || "Super Admin";
  const seedAdminRoleRaw = process.env.SEED_ADMIN_ROLE || "AdminOwner";
  const adminRole = seedRoles.includes(seedAdminRoleRaw as (typeof seedRoles)[number])
    ? seedAdminRoleRaw
    : "AdminOwner";

  if (!adminEmail || !adminPassword) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing required env vars: SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD",
      },
      { status: 500 }
    );
  }

  if (adminPassword.length < 8) {
    return NextResponse.json(
      { success: false, message: "SEED_ADMIN_PASSWORD must be at least 8 characters" },
      { status: 500 }
    );
  }

  try {
    await dbConnect();

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      if (adminRole === "AdminOwner" && existingAdmin.role !== "AdminOwner") {
        existingAdmin.role = "AdminOwner";
        existingAdmin.isActive = true;
        await existingAdmin.save();
        return NextResponse.json({ success: true, message: "Existing admin promoted to AdminOwner" });
      }
      return NextResponse.json({ success: true, message: `${existingAdmin.role} already exists` });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await User.create({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: adminRole,
      isActive: true,
    });

    return NextResponse.json({ success: true, message: `${adminRole} created successfully` });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to seed admin" },
      { status: 500 }
    );
  }
}
