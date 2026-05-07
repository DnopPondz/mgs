import mongoose from "mongoose";

const TransferRequestSchema = new mongoose.Schema(
  {
    requestNumber: { type: String, required: true, unique: true },
    sourceStockId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
    itemName: { type: String, required: true },
    lotNumber: { type: String, required: true },
    sourceLocationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
    targetLocationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
    sourceBranchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    targetBranchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    quantity: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Completed", "Cancelled"],
      default: "Pending",
    },
    reason: { type: String, default: "" },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

TransferRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.TransferRequest || mongoose.model("TransferRequest", TransferRequestSchema);
