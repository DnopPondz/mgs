import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["AdminOwner", "Admin", "Pharmacist", "Staff", "Auditor"], default: "Staff" },
  permissions: { type: [String], default: [] },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
  pinHash: { type: String, default: "" },
  pinUpdatedAt: { type: Date, default: null },
  failedPinAttempts: { type: Number, default: 0 },
  pinLockedUntil: { type: Date, default: null },
  rememberLogin: { type: Boolean, default: true },
  lastLoginAt: { type: Date, default: null },
  lastTokenRefreshAt: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model("User", userSchema);
