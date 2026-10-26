import mongoose from 'mongoose';

/**
 * Append-only stock history. Every stock change made by admins (adjustments, initial stock)
 * and by orders (sale, cancellation/reconciliation restore) writes one record.
 * `opKey` makes order-related records exactly-once: the same operation can never be recorded twice.
 */
export const MOVEMENT_REASONS = Object.freeze([
  'initial',
  'restock',
  'correction',
  'damaged',
  'returned_to_stock',
  'other',
  'sale',
  'order_restore',
]);

export const ADMIN_ADJUSTMENT_REASONS = Object.freeze(['restock', 'correction', 'damaged', 'returned_to_stock', 'other']);

const stockMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    // Variant (options.choices[].id) whose own stock moved; null when the product-level stock moved.
    optionId: { type: String, trim: true, default: null },
    delta: { type: Number, required: true },
    stockAfter: { type: Number, default: null },
    reason: { type: String, enum: MOVEMENT_REASONS, required: true },
    note: { type: String, trim: true, maxlength: 300, default: null },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    opKey: { type: String, default: undefined },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.opKey;
        return ret;
      },
    },
  }
);

stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ opKey: 1 }, { unique: true, partialFilterExpression: { opKey: { $type: 'string' } } });

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
export default StockMovement;
