import mongoose from 'mongoose';

/**
 * Per-account login attempt counter used for lockout.
 * Keyed by an HMAC of the normalized email (the email itself is never stored); records exist
 * for unknown emails too, so lockouts reveal nothing about which accounts exist.
 */
const loginAttemptSchema = new mongoose.Schema(
  {
    keyHash: { type: String, required: true, unique: true },
    failures: { type: Number, default: 0 },
    windowStart: { type: Date, default: null },
    lockUntil: { type: Date, default: null },
    // Outcome of the most recent reservation (false = refused because the key was locked).
    allowed: { type: Boolean, default: true },
    // Lets MongoDB delete stale records; the lockout logic itself relies on the timestamps above.
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false }
);

loginAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const LoginAttempt = mongoose.model('LoginAttempt', loginAttemptSchema);
export default LoginAttempt;
