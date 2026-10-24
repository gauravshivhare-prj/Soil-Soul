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
    // __v changes on every cart.save() that modifies the cart. Idempotent checkout replays rely on it
    // to detect changes since an order, so add/modify items only via cart.save() (never positional updates).
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

// The unique { user: 1 } index is declared on the `user` field above.

// Export
export const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
