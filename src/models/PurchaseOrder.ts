import mongoose from "mongoose";

const PurchaseOrderItemSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true },
    requestedQty: { type: Number, required: true, min: 1 },
    receivedQty: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: "pcs" },
    unitCost: { type: Number, default: 0, min: 0 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    medicineType: { type: String, default: "General" },
    minStockLevel: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const PurchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    supplierName: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Draft", "Ordered", "Partially Received", "Received", "Cancelled"],
      default: "Ordered",
    },
    items: { type: [PurchaseOrderItemSchema], default: [] },
    totalEstimatedCost: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: "" },
    orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    orderedAt: { type: Date, default: Date.now },
    receivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PurchaseOrderSchema.index({ status: 1, orderedAt: -1 });

export default mongoose.models.PurchaseOrder || mongoose.model("PurchaseOrder", PurchaseOrderSchema);
