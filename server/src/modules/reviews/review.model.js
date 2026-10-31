import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
  title: { type: String, trim: true, maxlength: 100, default: '' },
  body: { type: String, trim: true, required: true, minlength: 10, maxlength: 2000 },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'], default: 'PENDING', index: true },
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  moderatedAt: { type: Date, default: null },
}, { timestamps: true });

reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, status: 1, createdAt: -1 });

export const Review = mongoose.model('Review', reviewSchema);
export default Review;
