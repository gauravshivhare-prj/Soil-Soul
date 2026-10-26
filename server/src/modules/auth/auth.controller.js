import * as authService from './auth.service.js';
import {
  REFRESH_COOKIE,
  endAllRefreshSessions,
  readRefreshCookie,
  refreshCookieOptions,
  rotateRefreshSession,
  startRefreshSession,
} from './refreshSessions.js';

/** Give this browser a refresh session (httpOnly cookie) after the user proved who they are. */
async function attachRefreshSession(res, userId) {
  res.cookie(REFRESH_COOKIE, await startRefreshSession(userId), refreshCookieOptions());
}

function clearRefreshCookie(res) {
  const { maxAge: _maxAge, ...options } = refreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE, options);
}

/**
 * Handle user registration.
 */
export async function register(req, res, next) {
  try {
    const { name, email, password, phone } = req.body ?? {};
    const result = await authService.registerUser({ name, email, password, phone });
    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle user login.
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body ?? {};
    const result = await authService.loginUser({ email, password });
    await attachRefreshSession(res, result.user.id);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Return current authenticated user profile.
 */
export async function me(req, res, next) {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Log out of every session for the authenticated user.
 */
export async function logout(req, res, next) {
  try {
    const result = await authService.logoutUser(req.user.id);
    await endAllRefreshSessions(req.user.id);
    clearRefreshCookie(res);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

const respond = (status, fn) => async (req, res, next) => {
  try {
    res.status(status).json({ success: true, data: await fn(req) });
  } catch (err) {
    next(err);
  }
};

/** Verify an email address with its code; starts a session. */
export async function verifyEmail(req, res, next) {
  try {
    const result = await authService.verifyEmail({ email: req.body?.email, code: req.body?.code });
    await attachRefreshSession(res, result.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Renew the access token from the refresh cookie (rotating it). Used on reload/new tab and when
 * the short-lived access token expires. Any failure clears the cookie.
 */
export async function refresh(req, res, next) {
  try {
    const { user, cookie } = await rotateRefreshSession(readRefreshCookie(req));
    if (cookie) res.cookie(REFRESH_COOKIE, cookie, refreshCookieOptions());
    res.status(200).json({ success: true, data: { user: authService.toProfile(user), accessToken: authService.signAccessToken(user) } });
  } catch (err) {
    clearRefreshCookie(res);
    next(err);
  }
}

/** Send a new verification code (always the same generic response). */
export const resendVerification = respond(200, (req) => authService.resendVerification({ email: req.body?.email }));

/** Start a password reset (always the same generic response). */
export const forgotPassword = respond(200, (req) => authService.forgotPassword({ email: req.body?.email }));

/** Complete a password reset with the emailed code (ends every session, including refresh sessions). */
export async function resetPassword(req, res, next) {
  try {
    const result = await authService.resetPassword({ email: req.body?.email, code: req.body?.code, newPassword: req.body?.newPassword });
    clearRefreshCookie(res);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** Change the logged-in user's password; ends other sessions and gives this browser a fresh one. */
export async function changePassword(req, res, next) {
  try {
    const result = await authService.changePassword(req.user.id, {
      currentPassword: req.body?.currentPassword,
      newPassword: req.body?.newPassword,
    });
    await endAllRefreshSessions(req.user.id);
    await attachRefreshSession(res, req.user.id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
