import mongoose from 'mongoose';

const orderItemSnapshotSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required.'],
    },
    name: {
      type: String,
      required: [true, 'Product name snapshot is required.'],
      trim: true,
    },
    slug: {
      type: String,
      default: null,
      trim: true,
    },
    image: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    option: {
      id: { type: String, default: null, trim: true },
      name: { type: String, default: null, trim: true },
      detail: { type: String, default: null, trim: true },
      priceDelta: { type: Number, default: 0 },
      sku: { type: String, default: null, trim: true },
      price: { type: Number, default: null, min: 0 },
      mrp: { type: Number, default: null, min: 0 },
      stock: { type: Number, default: null, min: 0 },
      weight: { type: String, default: null, trim: true },
      volume: { type: String, default: null, trim: true },
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price snapshot is required.'],
      min: [0, 'Unit price cannot be negative.'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required.'],
      min: [1, 'Quantity must be at least 1.'],
      max: [10, 'Quantity cannot exceed 10.'],
    },
    lineTotal: {
      type: Number,
      required: [true, 'Line total snapshot is required.'],
      min: [0, 'Line total cannot be negative.'],
    },
    stockRestored: {
      type: Boolean,
      default: false,
    },
    // true when placing the order incremented the product's soldCount for this line (absent on older orders)
    soldCounted: {
      type: Boolean,
    },
    restoredAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const deliveryAddressSchema = new mongoose.Schema(
  {
    recipientName: {
      type: String,
      required: [true, 'Recipient name is required.'],
      trim: true,
      maxlength: [100, 'Recipient name cannot exceed 100 characters.'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required.'],
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters.'],
    },
    addressLine1: {
      type: String,
      required: [true, 'Address line 1 is required.'],
      trim: true,
      maxlength: [200, 'Address line 1 cannot exceed 200 characters.'],
    },
    addressLine2: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Address line 2 cannot exceed 200 characters.'],
    },
    city: {
      type: String,
      required: [true, 'City is required.'],
      trim: true,
      maxlength: [100, 'City cannot exceed 100 characters.'],
    },
    state: {
      type: String,
      required: [true, 'State is required.'],
      trim: true,
      maxlength: [100, 'State cannot exceed 100 characters.'],
    },
    postalCode: {
      type: String,
      required: [true, 'Postal code is required.'],
      trim: true,
      maxlength: [20, 'Postal code cannot exceed 20 characters.'],
    },
    country: {
      type: String,
      default: 'India',
      trim: true,
      maxlength: [50, 'Country cannot exceed 50 characters.'],
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required.'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required.'],
      index: true,
    },
    items: {
      type: [orderItemSnapshotSchema],
      required: [true, 'Order items are required.'],
      validate: [
        (val) => Array.isArray(val) && val.length > 0,
        'Order must contain at least one item.',
      ],
    },
    deliveryAddress: {
      type: deliveryAddressSchema,
      required: [true, 'Delivery address is required.'],
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required.'],
      min: [0, 'Subtotal cannot be negative.'],
    },
    shippingFee: {
      type: Number,
      default: 0,
      min: [0, 'Shipping fee cannot be negative.'],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative.'],
    },
    total: {
      type: Number,
      required: [true, 'Total amount is required.'],
      min: [0, 'Total amount cannot be negative.'],
    },
    paymentMethod: {
      type: String,
      enum: ['COD'],
      default: 'COD',
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED'],
      default: 'PENDING',
      required: true,
    },
    orderStatus: {
      type: String,
      enum: ['PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
      default: 'PLACED',
      required: true,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      default: null,
    },
    // SHA-256 of the checkout input bound to idempotencyKey (null without a key or for orders created before fingerprints)
    requestFingerprint: {
      type: String,
      default: null,
    },
    // Cart version (__v) the order was built from; an idempotent replay clears the cart only if unchanged since
    cartVersion: {
      type: Number,
      default: null,
    },
    cancellation: {
      type: new mongoose.Schema(
        {
          reason: {
            type: String,
            default: null,
            trim: true,
            maxlength: [500, 'Cancellation reason cannot exceed 500 characters.'],
          },
          cancelledAt: {
            type: Date,
            default: null,
          },
          cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
          },
          actorRole: {
            type: String,
            enum: ['customer', 'admin'],
            default: 'customer',
          },
          stockRestorationStatus: {
            type: String,
            enum: ['NOT_APPLICABLE', 'PENDING', 'PARTIAL', 'FAILED', 'COMPLETED'],
            default: 'NOT_APPLICABLE',
          },
          restorationErrors: {
            type: [
              new mongoose.Schema(
                {
                  productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                  },
                  name: {
                    type: String,
                    default: null,
                  },
                  quantity: {
                    type: Number,
                    default: 0,
                  },
                  error: {
                    type: String,
                    default: null,
                  },
                  failedAt: {
                    type: Date,
                    default: Date.now,
                  },
                },
                { _id: false }
              ),
            ],
            default: [],
          },
          isReconciling: {
            type: Boolean,
            default: false,
          },
          reconciliationToken: {
            type: String,
            default: null,
          },
          reconciliationLeaseExpiresAt: {
            type: Date,
            default: null,
          },
          reconciliationFencingToken: {
            type: Number,
            default: 0,
          },
        },
        { _id: false }
      ),
      default: null,
    },
    paymentDetails: {
      type: new mongoose.Schema(
        {
          collectedAt: {
            type: Date,
            default: null,
          },
          collectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
          },
          note: {
            type: String,
            default: null,
            trim: true,
            maxlength: [500, 'Payment note cannot exceed 500 characters.'],
          },
        },
        { _id: false }
      ),
      default: null,
    },
    refundDetails: {
      type: new mongoose.Schema(
        {
          refundedAt: {
            type: Date,
            default: null,
          },
          refundedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
          },
          amount: {
            type: Number,
            default: null,
            min: [0, 'Refund amount cannot be negative.'],
          },
          reason: {
            type: String,
            default: null,
            trim: true,
            maxlength: [500, 'Refund reason cannot exceed 500 characters.'],
          },
          note: {
            type: String,
            default: null,
            trim: true,
            maxlength: [500, 'Refund note cannot exceed 500 characters.'],
          },
        },
        { _id: false }
      ),
      default: null,
    },
    totalRefunded: {
      type: Number,
      default: 0,
      min: [0, 'Total refunded amount cannot be negative.'],
    },
    refunds: {
      type: [
        new mongoose.Schema(
          {
            refundedAt: {
              type: Date,
              default: Date.now,
              required: true,
            },
            refundedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User',
              required: true,
            },
            amount: {
              type: Number,
              required: true,
              min: [0.01, 'Refund amount must be greater than zero.'],
            },
            reason: {
              type: String,
              required: true,
              trim: true,
              maxlength: [500, 'Refund reason cannot exceed 500 characters.'],
            },
            note: {
              type: String,
              default: null,
              trim: true,
              maxlength: [500, 'Refund note cannot exceed 500 characters.'],
            },
          },
          { _id: true }
        ),
      ],
      default: [],
    },
  },
  {
    timestamps: true,
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

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index(
  { user: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

export const Order = mongoose.model('Order', orderSchema);
export default Order;
