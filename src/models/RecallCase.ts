import mongoose from "mongoose";

const RecallAffectedStockSchema = new mongoose.Schema(
  {
    stockId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
    itemName: { type: String, required: true },
    lotNumber: { type: String, required: true },
    currentQuantity: { type: Number, default: 0 },
    locationName: { type: String, default: "" },
    branchName: { type: String, default: "" },
  },
  { _id: false }
);

const RecallCaseSchema = new mongoose.Schema(
  {
    recallNumber: { type: String, required: true, unique: true },
    itemName: { type: String, required: true },
    lotNumber: { type: String, default: "" },
    reason: { type: String, required: true },
    severity: { type: String, enum: ["Info", "Warning", "Critical"], default: "Warning" },
    status: { type: String, enum: ["Open", "Investigating", "Completed", "Cancelled"], default: "Open" },
    affectedStocks: { type: [RecallAffectedStockSchema], default: [] },
    totalOnHand: { type: Number, default: 0 },
    soldOrUsedQty: { type: Number, default: 0 },
    openedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    closedAt: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

RecallCaseSchema.index({ status: 1, createdAt: -1 });
RecallCaseSchema.index({ itemName: 1, lotNumber: 1 });

export default mongoose.models.RecallCase || mongoose.model("RecallCase", RecallCaseSchema);
