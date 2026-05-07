import mongoose from "mongoose";

const SupplierInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    poId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", default: null },
    grnId: { type: mongoose.Schema.Types.ObjectId, ref: "GoodsReceipt", default: null },
    supplierName: { type: String, default: "" },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    invoiceDate: { type: Date, default: Date.now },
    dueDate: { type: Date, default: null },
    subtotal: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["Unpaid", "Partially Paid", "Paid", "Void"],
      default: "Unpaid",
    },
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

SupplierInvoiceSchema.index({ status: 1, dueDate: 1 });

export default mongoose.models.SupplierInvoice || mongoose.model("SupplierInvoice", SupplierInvoiceSchema);
