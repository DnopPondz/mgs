import mongoose from "mongoose";

const ApprovalRequestSchema = new mongoose.Schema(
  {
    requestNumber: { type: String, required: true, unique: true },
    actionType: {
      type: String,
      enum: ["DELETE_STOCK", "TRANSFER_STOCK", "ADJUST_STOCK", "PURCHASE_REQUEST", "WRITE_OFF"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
    },
    summary: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    reviewerNote: { type: String, default: "" },
  },
  { timestamps: true }
);

ApprovalRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.ApprovalRequest || mongoose.model("ApprovalRequest", ApprovalRequestSchema);
