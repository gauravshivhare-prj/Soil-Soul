import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, uppercase: true, minlength: 3, maxlength: 32, match: /^[A-Z0-9_-]+$/ },
  discountType: { type: String, enum: ['PERCENT', 'FIXED'], required: true },
  value: { type: Number, required: true, min: 0.01 },
  minOrderAmount: { type: Number, default: 0, min: 0 },
  maxDiscountAmount: { type: Number, default: null, min: 0.01 },
  startsAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  usageLimit: { type: Number, default: null, min: 1 },
  perCustomerLimit: { type: Number, default: 1, min: 1 },
  eligibleProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  eligibleCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  usageCount: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const couponRedemptionSchema = new mongoose.Schema({
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  discount: { type: Number, required: true, min: 0 },
  redeemedAt: { type: Date, default: Date.now },
}, { versionKey: false });
couponRedemptionSchema.index({ coupon: 1, user: 1, order: 1 }, { unique: true });
couponRedemptionSchema.index({ coupon: 1, user: 1 });

export const Coupon = mongoose.model('Coupon', couponSchema);
export const CouponRedemption = mongoose.model('CouponRedemption', couponRedemptionSchema);
