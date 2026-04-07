import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // เช่น "ADD_STOCK", "ADJUST_STOCK", "IMPORT"
  details: { type: String, required: true }, // รายละเอียด เช่น "นาย A ปรับสต๊อกพาราจาก 10 เป็น 5"
  user: { type: String, required: true }, // ชื่อคนทำ
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);