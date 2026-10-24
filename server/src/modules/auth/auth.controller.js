import * as authService from './auth.service.js';

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
export const verifyEmail = respond(200, (req) =>
  authService.verifyEmail({ email: req.body?.email, code: req.body?.code })
);

/** Send a new verification code (always the same generic response). */
export const resendVerification = respond(200, (req) => authService.resendVerification({ email: req.body?.email }));

/** Start a password reset (always the same generic response). */
export const forgotPassword = respond(200, (req) => authService.forgotPassword({ email: req.body?.email }));

/** Complete a password reset with the emailed code. */
export const resetPassword = respond(200, (req) =>
  authService.resetPassword({ email: req.body?.email, code: req.body?.code, newPassword: req.body?.newPassword })
);

/** Change the logged-in user's password; returns a fresh token. */
export const changePassword = respond(200, (req) =>
  authService.changePassword(req.user.id, {
    currentPassword: req.body?.currentPassword,
    newPassword: req.body?.newPassword,
  })
);
