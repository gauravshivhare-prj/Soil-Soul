import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required.'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters.'],
      maxlength: [120, 'Product name cannot exceed 120 characters.'],
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required.'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens.'],
      maxlength: [140, 'Product slug cannot exceed 140 characters.'],
    },
    summary: {
      type: String,
      trim: true,
      maxlength: [300, 'Summary cannot exceed 300 characters.'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters.'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category is required.'],
    },
    categorySlug: {
      type: String,
      required: [true, 'Category slug is required.'],
      trim: true,
      lowercase: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required.'],
      min: [0, 'Price cannot be negative.'],
    },
    mrp: {
      type: Number,
      default: null,
      min: [0, 'MRP cannot be negative.'],
    },
    stock: {
      type: Number,
      required: [true, 'Stock count is required.'],
      default: 0,
      min: [0, 'Stock cannot be negative.'],
    },
    images: [
      {
        src: { type: String, trim: true },
        alt: { type: String, trim: true },
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0.'],
      max: [5, 'Rating cannot exceed 5.'],
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    soldCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    light: {
      type: String,
      enum: ['low', 'bright-indirect', 'full-sun', null],
      default: null,
    },
    size: {
      type: String,
      enum: ['small', 'medium', 'large', null],
      default: null,
    },
    highlights: [{ type: String, trim: true }],
    care: [
      {
        title: { type: String, trim: true },
        text: { type: String, trim: true },
      },
    ],
    specs: [
      {
        label: { type: String, trim: true },
        value: { type: String, trim: true },
      },
    ],
    options: {
      label: { type: String, trim: true },
      choices: [
        {
          id: { type: String, trim: true },
          name: { type: String, trim: true },
          detail: { type: String, trim: true },
          priceDelta: { type: Number, default: 0 },
        },
      ],
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

// Query indexes
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ categorySlug: 1, isActive: 1 });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ isActive: 1, price: 1 });
productSchema.index({ name: 'text', summary: 'text' });

export const Product = mongoose.model('Product', productSchema);
export default Product;
