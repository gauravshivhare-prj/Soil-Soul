"use client";

/**
 * Session state for the storefront and admin.
 *
 * The backend issues short-lived (15 min) bearer access tokens with server-side revocation
 * (logout ends every session). The token is kept in sessionStorage: it survives a reload but
 * is cleared when the tab closes and is never written to long-lived storage. When the server
 * rejects the token (expired/revoked/disabled) the session is cleared and the user signs in again.
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
const SESSION_ENDED_CODES = new Set(["TOKEN_EXPIRED", "TOKEN_REVOKED", "INVALID_TOKEN", "USER_NOT_FOUND", "ACCOUNT_DISABLED", "EMAIL_NOT_VERIFIED", "UNAUTHORIZED"]);

export function AuthProvider({ children }) {
  const session = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot, sessionStore.getServerSnapshot);
  const isHydrated = useSyncExternalStore(noop, () => true, () => false);
  // The token whose validity has been confirmed (issued in this tab, or re-checked via /auth/me).
  const [checkedToken, setCheckedToken] = useState(null);

  const token = session?.token ?? null;
  const user = session?.user ?? null;

  const startSession = useCallback((data) => {
    writeSession({ token: data.accessToken, user: data.user });
    setCheckedToken(data.accessToken);
    return data.user;
  }, []);

  const endSession = useCallback(() => writeSession(null), []);

  /** Authenticated request: adds the token and clears the session if the server ends it. */
  const authRequest = useCallback(
    async (path, options = {}) => {
      const current = readSession();
      try {
        return await apiRequest(path, { ...options, token: current?.token });
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || (err.status === 403 && SESSION_ENDED_CODES.has(err.code)))) {
          writeSession(null);
        }
        throw err;
      }
    },
    []
  );

  // Confirm a token restored from storage is still valid and refresh the profile.
  useEffect(() => {
    if (!isHydrated || !token || token === checkedToken) return undefined;
    let cancelled = false;
    authRequest("/auth/me")
      .then((data) => {
        if (!cancelled && readSession()?.token === token) writeSession({ token, user: data.user });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCheckedToken(token);
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
      // Ready once hydrated and any stored session has been re-validated with the server.
      isReady: isHydrated && (!token || token === checkedToken),
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
    [user, token, isHydrated, checkedToken, login, register, verifyEmail, resendVerification, forgotPassword, resetPassword, logout, updateProfile, changePassword, authRequest]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
