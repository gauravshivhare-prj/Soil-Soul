import mongoose from 'mongoose';
import env from './env.js';

mongoose.set('strictQuery', true);

// Mongoose emits 'error' for failures after the initial connection; without a
// listener that would crash the process. Log the error type only (no URI/hosts).
mongoose.connection.on('error', (err) => console.error(`[db] MongoDB error: ${err.name}`));

export async function connectDatabase() {
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10000,
    autoIndex: !env.isProduction, // create indexes explicitly in production
  });
  console.log(`[db] MongoDB connected (database: ${mongoose.connection.name})`);
}

export function disconnectDatabase() {
  return mongoose.disconnect();
}

/* 'disconnected' | 'connected' | 'connecting' | 'disconnecting' */
export function databaseStatus() {
  return mongoose.STATES[mongoose.connection.readyState] ?? 'disconnected';
}
