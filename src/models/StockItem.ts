import mongoose from "mongoose";

const StockItemSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
    lotNumber: { type: String, required: true },
    initialQuantity: { type: Number, required: true },
    currentQuantity: { type: Number, required: true },
    unit: { type: String, required: true },
    minStockLevel: { type: Number, required: true },
    manufactureDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    shelfLifeDays: { type: Number, required: true },
    qrCodeValue: { type: String, required: true, unique: true },
    status: { type: String, default: "Healthy" },
    imageUrl: { type: String, default: "" },
    unitCost: { type: Number, default: 0 }, // 💰 เพิ่มฟิลด์ราคาทุนต่อชิ้น
  },
  { timestamps: true }
);

export default mongoose.models.StockItem || mongoose.model("StockItem", StockItemSchema);