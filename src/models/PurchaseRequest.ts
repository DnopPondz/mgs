import mongoose from "mongoose";

const PurchaseRequestItemSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true },
    requestedQty: { type: Number, required: true, min: 1 },
    unit: { type: String, default: "pcs" },
    unitCost: { type: Number, default: 0, min: 0 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    medicineType: { type: String, default: "General" },
    reason: { type: String, default: "" },
  },
  { _id: false }
);

const PurchaseRequestSchema = new mongoose.Schema(
  {
    prNumber: { type: String, required: true, unique: true },
    supplierName: { type: String, default: "" },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    status: {
      type: String,
      enum: ["Draft", "Pending Approval", "Approved", "Rejected", "Converted to PO", "Cancelled"],
      default: "Pending Approval",
    },
    items: { type: [PurchaseRequestItemSchema], default: [] },
    totalEstimatedCost: { type: Number, default: 0, min: 0 },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    convertedPoId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

PurchaseRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.PurchaseRequest || mongoose.model("PurchaseRequest", PurchaseRequestSchema);
