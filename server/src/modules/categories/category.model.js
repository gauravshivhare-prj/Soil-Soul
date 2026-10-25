import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required.'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters.'],
      maxlength: [60, 'Category name cannot exceed 60 characters.'],
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required.'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens.'],
      maxlength: [80, 'Category slug cannot exceed 80 characters.'],
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    shortName: {
      type: String,
      trim: true,
      maxlength: [40, 'Short name cannot exceed 40 characters.'],
    },
    tagline: {
      type: String,
      trim: true,
      maxlength: [120, 'Tagline cannot exceed 120 characters.'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters.'],
    },
    image: {
      src: { type: String, trim: true },
      alt: { type: String, trim: true },
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Set when archived by an admin (archived categories are also inactive); null otherwise.
    archivedAt: {
      type: Date,
      default: null,
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

// Indexes
categorySchema.index({ isActive: 1, displayOrder: 1 });
categorySchema.index({ parent: 1, isActive: 1, displayOrder: 1 });

export const Category = mongoose.model('Category', categorySchema);
export default Category;
