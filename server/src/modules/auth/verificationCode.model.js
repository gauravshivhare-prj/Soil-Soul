import mongoose from 'mongoose';

/**
 * One live one-time code per (user, purpose). Only an HMAC of the code is stored.
 * Records disappear via the TTL index on `purgeAt` (kept past expiry so send throttling
 * still applies to recently used codes).
 */
const verificationCodeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    purpose: { type: String, enum: ['verify_email', 'password_reset'], required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
    lastSentAt: { type: Date, required: true },
    sentCount: { type: Number, default: 1 },
    windowStart: { type: Date, required: true },
    purgeAt: { type: Date, required: true },
  },
  { versionKey: false }
);

verificationCodeSchema.index({ user: 1, purpose: 1 }, { unique: true });
verificationCodeSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export const VerificationCode = mongoose.model('VerificationCode', verificationCodeSchema);
export default VerificationCode;
