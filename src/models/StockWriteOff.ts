import mongoose from "mongoose";

const StockWriteOffSchema = new mongoose.Schema(
  {
    stockId: { type: mongoose.Schema.Types.ObjectId, ref: "StockItem", required: true },
    itemName: { type: String, required: true },
    lotNumber: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    reason: {
      type: String,
      enum: ["Expired", "Damaged", "Lost", "Regulatory", "Other"],
      required: true,
    },
    note: { type: String, default: "" },
    unit: { type: String, default: "pcs" },
    unitCost: { type: Number, default: 0, min: 0 },
    totalCost: { type: Number, default: 0, min: 0 },
    writtenOffBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    writtenOffAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

StockWriteOffSchema.index({ writtenOffAt: -1 });

export default mongoose.models.StockWriteOff || mongoose.model("StockWriteOff", StockWriteOffSchema);
