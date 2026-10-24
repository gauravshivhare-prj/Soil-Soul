/**
 * Shared API client for the Soil & Soul backend.
 *
 * - Base URL from NEXT_PUBLIC_API_URL (public, inlined at build time — never put secrets in it).
 * - Sends the bearer token when given; never logs tokens, bodies or responses.
 * - Every failure becomes an ApiError with { status, code, message, retryAfterSeconds }.
 *   The backend stays authoritative for prices, stock, roles and ownership.
 */

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1").replace(/\/+$/, "");
const DEFAULT_TIMEOUT_MS = 15000;

const FRIENDLY = {
  NETWORK_ERROR: "We couldn't reach the store. Check your connection and try again.",
  TIMEOUT: "The store is taking too long to respond. Please try again.",
  RATE_LIMITED: "Too many requests. Please wait a moment and try again.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
};

export class ApiError extends Error {
  constructor({ status, code, message, retryAfterSeconds }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds ?? null;
  }
}

/**
 * @param {string} path - e.g. "/products?limit=12"
 * @param {{ method?: string, body?: unknown, token?: string|null, headers?: Record<string,string>, timeoutMs?: number, signal?: AbortSignal }} [options]
 * @returns {Promise<any>} the `data` field of a successful response
 */
export async function apiRequest(path, { method = "GET", body, token, headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);
  const onAbort = () => controller.abort(signal.reason);
  signal?.addEventListener("abort", onAbort, { once: true });

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    const code = controller.signal.aborted ? "TIMEOUT" : "NETWORK_ERROR";
    throw new ApiError({ status: 0, code, message: FRIENDLY[code] });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok || payload?.success === false) {
    const error = payload?.error ?? {};
    const code = error.code || (res.status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR");
    const retryHeader = Number(res.headers.get("retry-after"));
    throw new ApiError({
      status: res.status,
      code,
      message: res.status >= 500 ? FRIENDLY.INTERNAL_ERROR : error.message || FRIENDLY[code] || "The request could not be completed.",
      retryAfterSeconds: error.retryAfterSeconds ?? (Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : null),
    });
  }
  return payload?.data ?? null;
}

/** A new random Idempotency-Key for one checkout attempt (reused on retries of that attempt). */
export function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `chk-${crypto.randomUUID()}`;
  return `chk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Human-readable wait for 429 responses. */
export function retryAfterText(error) {
  const seconds = error?.retryAfterSeconds;
  if (!seconds) return "";
  const minutes = Math.ceil(seconds / 60);
  return minutes > 1 ? ` Try again in about ${minutes} minutes.` : " Try again in a minute.";
}
