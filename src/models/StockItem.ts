import mongoose from "mongoose";

const StockItemSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true },
    genericName: { type: String, default: "" },
    strength: { type: String, default: "" },
    medicineType: { type: String, default: "General" },
    usageInstructions: { type: String, default: "" },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
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
    imageUrl: { type: String, default: "" }, // สำหรับเก็บรูปภาพ
    unitCost: { type: Number, default: 0 },  // สำหรับเก็บราคาทุน
    salePrice: { type: Number, default: 0 }, // ราคาขายต่อหน่วย
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    deleteReason: { type: String, default: "" },
    serialNumbers: { type: [String], default: [] },
    lotLocked: { type: Boolean, default: false },
    regulatoryNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

StockItemSchema.index({ deletedAt: 1 });
StockItemSchema.index({ branchId: 1, locationId: 1 });
StockItemSchema.index({ itemName: 1, lotNumber: 1, branchId: 1 });

export default mongoose.models.StockItem || mongoose.model("StockItem", StockItemSchema);
