import mongoose from "mongoose";

const SaleLotAllocationSchema = new mongoose.Schema(
  {
    stockId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
    lotNumber: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    returnedQty: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, default: 0, min: 0 },
    salePrice: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const SaleItemSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    returnedQty: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: "pcs" },
    unitCost: { type: Number, default: 0, min: 0 },
    salePrice: { type: Number, default: 0, min: 0 },
    costAmount: { type: Number, default: 0, min: 0 },
    saleAmount: { type: Number, default: 0, min: 0 },
    lotAllocations: { type: [SaleLotAllocationSchema], default: [] },
  },
  { _id: false }
);

const SaleReturnHistorySchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    reason: { type: String, default: "" },
    returnedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    returnedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const SaleSchema = new mongoose.Schema(
  {
    saleNumber: { type: String, required: true, unique: true },
    soldBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    soldAt: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "transfer", "e-wallet"],
      default: "cash",
    },
    customerName: { type: String, default: "" },
    items: { type: [SaleItemSchema], default: [] },
    subtotal: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    netTotal: { type: Number, default: 0, min: 0 },
    grossProfit: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Completed", "Partially Returned", "Refunded"],
      default: "Completed",
    },
    returnHistory: { type: [SaleReturnHistorySchema], default: [] },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

SaleSchema.index({ soldAt: -1 });
SaleSchema.index({ saleNumber: 1 }, { unique: true });

export default mongoose.models.Sale || mongoose.model("Sale", SaleSchema);
