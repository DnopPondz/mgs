import mongoose from "mongoose";

const GoodsReceiptItemSchema = new mongoose.Schema(
  {
    stockId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", default: null },
    itemName: { type: String, required: true },
    lotNumber: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: "pcs" },
    unitCost: { type: Number, default: 0, min: 0 },
    expiryDate: { type: Date, default: null },
  },
  { _id: false }
);

const GoodsReceiptSchema = new mongoose.Schema(
  {
    grnNumber: { type: String, required: true, unique: true },
    poId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", required: true },
    poNumber: { type: String, required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receivedAt: { type: Date, default: Date.now },
    items: { type: [GoodsReceiptItemSchema], default: [] },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

GoodsReceiptSchema.index({ receivedAt: -1 });

export default mongoose.models.GoodsReceipt || mongoose.model("GoodsReceipt", GoodsReceiptSchema);
