import * as userService from './user.service.js';

/**
 * Update the authenticated user's own profile (name, phone).
 */
export async function updateMe(req, res, next) {
  try {
    const user = await userService.updateOwnProfile(req.user.id, req.body);
    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminCustomers(req, res, next) {
  try {
    const data = await userService.listCustomers(req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
