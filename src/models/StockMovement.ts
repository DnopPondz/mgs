import mongoose from "mongoose";

const StockMovementSchema = new mongoose.Schema(
  {
    stockId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
    itemName: { type: String, required: true },
    lotNumber: { type: String, required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", default: null },
    movementType: {
      type: String,
      enum: ["IN", "OUT", "TRANSFER_IN", "TRANSFER_OUT", "ADJUST", "SALE", "RETURN", "WRITE_OFF", "RECALL"],
      required: true,
    },
    quantity: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    referenceType: { type: String, default: "" },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    note: { type: String, default: "" },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

StockMovementSchema.index({ stockId: 1, createdAt: -1 });
StockMovementSchema.index({ movementType: 1, createdAt: -1 });

export default mongoose.models.StockMovement || mongoose.model("StockMovement", StockMovementSchema);
