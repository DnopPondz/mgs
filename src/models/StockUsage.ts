import mongoose from "mongoose";

const stockUsageSchema = new mongoose.Schema({
  stockId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockItem', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantityUsed: { type: Number, required: true },
  reason: { type: String }, // เหตุผลในการเบิก (เผื่อไว้)
}, { timestamps: true });

export default mongoose.models.StockUsage || mongoose.model("StockUsage", stockUsageSchema);