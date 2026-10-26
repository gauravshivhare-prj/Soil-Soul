"use client";

/**
 * Session state for the storefront and admin.
 *
 * The backend issues short-lived (15 min) bearer access tokens with server-side revocation
 * (logout ends every session), plus a long-lived refresh session in an httpOnly cookie that
 * JavaScript cannot read. The access token is kept in sessionStorage (survives a reload, cleared
 * when the tab closes). When it is missing (new tab) or rejected (expired), the refresh cookie is
 * used once to get a new one; only if that fails is the user signed out.
 * UI checks here are conveniences only — the backend enforces every permission.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { apiRequest, ApiError } from "@/lib/api";

const STORAGE_KEY = "soilsoul.session.v1";
const AuthContext = createContext(null);

// sessionStorage-backed store (same shape as lib/persistedStore, different storage).
const listeners = new Set();
let cache = null;
let cacheRaw;

function readSession() {
  let raw = null;
  try {
    raw = window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return cache;
  }
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    cache = parsed && typeof parsed.token === "string" && parsed.user ? parsed : null;
  } catch {
    cache = null;
  }
  return cache;
}

function writeSession(next) {
  cache = next;
  try {
    if (next) {
      cacheRaw = JSON.stringify(next);
      window.sessionStorage.setItem(STORAGE_KEY, cacheRaw);
    } else {
      cacheRaw = null;
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage blocked: keep the in-memory session for this page only.
  }
  listeners.forEach((l) => l());
}

const sessionStore = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: readSession,
  getServerSnapshot: () => null,
};

const noop = () => () => {};

// One renewal at a time per tab: concurrent 401s all wait for the same refresh request.
let renewal = null;
// Tokens just issued by the server through a renewal: valid without re-checking via /auth/me.
const renewedTokens = new Set();
function renewSession() {
  if (!renewal) {
    renewal = apiRequest("/auth/refresh", { method: "POST" })
      .then((data) => {
        renewedTokens.add(data.accessToken);
        writeSession({ token: data.accessToken, user: data.user });
        return data;
      })
      .finally(() => {
        renewal = null;
      });
  }
  return renewal;
}
const SESSION_ENDED_CODES = new Set(["TOKEN_EXPIRED", "TOKEN_REVOKED", "INVALID_TOKEN", "USER_NOT_FOUND", "ACCOUNT_DISABLED", "EMAIL_NOT_VERIFIED", "UNAUTHORIZED"]);

export function AuthProvider({ children }) {
  const session = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot, sessionStore.getServerSnapshot);
  const isHydrated = useSyncExternalStore(noop, () => true, () => false);
  // The token whose validity has been confirmed (issued in this tab, or re-checked via /auth/me).
  const [checkedToken, setCheckedToken] = useState(null);
  // Whether this tab has tried to restore a session from the refresh cookie (when it had no token).
  const [restoreTried, setRestoreTried] = useState(false);

  const token = session?.token ?? null;
  const user = session?.user ?? null;

  const startSession = useCallback((data) => {
    writeSession({ token: data.accessToken, user: data.user });
    setCheckedToken(data.accessToken);
    return data.user;
  }, []);

  const endSession = useCallback(() => writeSession(null), []);

  /**
   * Authenticated request: adds the token. On 401 (expired or missing token) it renews the session
   * from the refresh cookie once and retries; the session is cleared only if that fails or the
   * server reports the session as ended.
   */
  const authRequest = useCallback(
    async (path, options = {}) => {
      const send = () => apiRequest(path, { ...options, token: readSession()?.token });
      const isSessionEnded = (err) =>
        err instanceof ApiError && (err.status === 401 || (err.status === 403 && SESSION_ENDED_CODES.has(err.code)));
      try {
        return await send();
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 401) {
          if (isSessionEnded(err)) writeSession(null);
          throw err;
        }
        try {
          await renewSession();
        } catch {
          writeSession(null);
          throw err;
        }
        try {
          return await send();
        } catch (retryErr) {
          if (isSessionEnded(retryErr)) writeSession(null);
          throw retryErr;
        }
      }
    },
    []
  );

  // No token in this tab (new tab, or the access token was cleared): try the refresh cookie once.
  useEffect(() => {
    if (!isHydrated || token || restoreTried) return undefined;
    let cancelled = false;
    renewSession()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRestoreTried(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isHydrated, token, restoreTried]);

  // Confirm a token restored from storage is still valid and refresh the profile.
  useEffect(() => {
    if (!isHydrated || !token || token === checkedToken || renewedTokens.has(token)) return undefined;
    let cancelled = false;
    authRequest("/auth/me")
      .then((data) => {
        if (!cancelled && readSession()?.token === token) writeSession({ token, user: data.user });
      })
      .catch(() => {})
      .finally(() => {
        // The token may have been renewed (or cleared) meanwhile; mark whatever is current as checked.
        if (!cancelled) setCheckedToken(readSession()?.token ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [isHydrated, token, checkedToken, authRequest]);

  const login = useCallback((email, password) => apiRequest("/auth/login", { method: "POST", body: { email, password } }).then(startSession), [startSession]);
  const register = useCallback((fields) => apiRequest("/auth/register", { method: "POST", body: fields }), []);
  const verifyEmail = useCallback((email, code) => apiRequest("/auth/verify-email", { method: "POST", body: { email, code } }).then(startSession), [startSession]);
  const resendVerification = useCallback((email) => apiRequest("/auth/resend-verification", { method: "POST", body: { email } }), []);
  const forgotPassword = useCallback((email) => apiRequest("/auth/forgot-password", { method: "POST", body: { email } }), []);
  const resetPassword = useCallback((fields) => apiRequest("/auth/reset-password", { method: "POST", body: fields }), []);

  const logout = useCallback(async () => {
    try {
      await authRequest("/auth/logout", { method: "POST" });
    } catch {
      // Even if the server is unreachable, the local session is cleared.
    } finally {
      endSession();
    }
  }, [authRequest, endSession]);

  const updateProfile = useCallback(
    async (fields) => {
      const data = await authRequest("/users/me", { method: "PATCH", body: fields });
      const current = readSession();
      if (current) writeSession({ ...current, user: data.user });
      return data.user;
    },
    [authRequest]
  );

  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      const data = await authRequest("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
      const current = readSession();
      if (current) writeSession({ ...current, token: data.accessToken });
      setCheckedToken(data.accessToken);
      return data;
    },
    [authRequest]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      isAdmin: user?.role === "admin",
      // Ready once hydrated and either the stored token was re-validated, or (no token) the
      // refresh cookie was tried.
      isReady: isHydrated && (token ? token === checkedToken || renewedTokens.has(token) : restoreTried),
      login,
      register,
      verifyEmail,
      resendVerification,
      forgotPassword,
      resetPassword,
      logout,
      updateProfile,
      changePassword,
      authRequest,
    }),
    [user, token, isHydrated, checkedToken, restoreTried, login, register, verifyEmail, resendVerification, forgotPassword, resetPassword, logout, updateProfile, changePassword, authRequest]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
