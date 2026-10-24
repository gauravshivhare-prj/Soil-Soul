import mongoose from 'mongoose';

export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters.'],
      maxlength: [60, 'Name cannot exceed 60 characters.'],
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email cannot exceed 254 characters.'],
      validate: {
        validator: (value) => EMAIL_REGEX.test(value),
        message: 'Invalid email address format.',
      },
    },
    // Optional; Indian mobile in E.164 (+91XXXXXXXXXX). Unique when present.
    phone: {
      type: String,
      trim: true,
      match: [/^\+91[6-9]\d{9}$/, 'Phone must be an Indian mobile number in +91 format.'],
    },
    // false only for accounts registered since email verification existed and not yet verified.
    // Absent (older accounts) counts as verified, so no migration is needed.
    emailVerified: {
      type: Boolean,
    },
    emailVerifiedAt: {
      type: Date,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required.'],
      select: false, // Prevents accidental exposure in queries
    },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    // Disabled accounts are refused on every authenticated request and at login.
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
    },
    // Incremented to revoke every access token issued before (logout ends all sessions).
    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Accounts without a phone are excluded, so any number of them can coexist.
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });

export const User = mongoose.model('User', userSchema);
export default User;
