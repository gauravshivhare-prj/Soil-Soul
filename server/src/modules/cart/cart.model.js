import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Cart item key is required.'],
      trim: true,
      lowercase: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required.'],
    },
    optionId: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required.'],
      min: [1, 'Quantity must be at least 1.'],
      max: [10, 'Quantity cannot exceed 10 per item.'],
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required.'],
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

cartSchema.index({ user: 1 }, { unique: true });

// Export
export const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
