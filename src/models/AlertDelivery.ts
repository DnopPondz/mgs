import mongoose from "mongoose";

const AlertDeliverySchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ["dashboard", "webhook", "email-webhook", "line-webhook"], required: true },
    status: { type: String, enum: ["Sent", "Skipped", "Failed"], required: true },
    summary: { type: String, default: "" },
    responseCode: { type: Number, default: null },
    errorMessage: { type: String, default: "" },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

AlertDeliverySchema.index({ createdAt: -1 });

export default mongoose.models.AlertDelivery || mongoose.model("AlertDelivery", AlertDeliverySchema);
