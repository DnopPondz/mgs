import mongoose from "mongoose";

const stockItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  lotNumber: { type: String, required: true },
  initialQuantity: { type: Number, required: true },
  currentQuantity: { type: Number, required: true },
  unit: { type: String, required: true }, // e.g., 'pcs', 'kg', 'boxes'
  manufactureDate: { type: Date, required: true },
  receivedDate: { type: Date, default: Date.now },
  shelfLifeDays: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  minStockLevel: { type: Number, required: true },
  qrCodeValue: { type: String, unique: true, required: true },
  status: { type: String, enum: ['In Stock', 'Low Stock', 'Out of Stock', 'Expired'], default: 'In Stock' }
}, { timestamps: true });

export default mongoose.models.StockItem || mongoose.model("StockItem", stockItemSchema);