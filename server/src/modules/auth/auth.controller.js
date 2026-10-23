import * as authService from './auth.service.js';

/**
 * Handle user registration.
 */
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body ?? {};
    const result = await authService.registerUser({ name, email, password });
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
