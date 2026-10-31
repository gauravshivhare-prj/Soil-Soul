import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
  fromStatus: { type: String, default: null },
  toStatus: { type: String, required: true, enum: ['REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED'] },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  actorRole: { type: String, required: true, enum: ['customer', 'admin', 'system'] },
  reason: { type: String, default: null, maxlength: 500 },
  changedAt: { type: Date, default: Date.now },
}, { _id: false });

const returnRequestSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  itemIndex: { type: Number, required: true, min: 0 },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  productName: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1, max: 10 },
  amount: { type: Number, required: true, min: 0 },
  amountBasis: { type: String, enum: ['GROSS_PRE_DISCOUNT'], default: 'GROSS_PRE_DISCOUNT', required: true },
  reason: { type: String, required: true, trim: true, minlength: 5, maxlength: 500 },
  status: { type: String, required: true, enum: ['REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED'], default: 'REQUESTED', index: true },
  statusHistory: { type: [historySchema], default: [] },
  refundStatus: { type: String, enum: ['NOT_APPLICABLE', 'PENDING', 'RECORDED'], default: 'PENDING' },
  refundRecordedAt: { type: Date, default: null },
  refundRecordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  refundNote: { type: String, default: null, trim: true, maxlength: 500 },
}, { timestamps: true });

returnRequestSchema.index({ order: 1, itemIndex: 1, createdAt: -1 });
export const ReturnRequest = mongoose.model('ReturnRequest', returnRequestSchema);
