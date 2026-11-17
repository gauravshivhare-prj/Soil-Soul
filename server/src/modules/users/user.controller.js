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

export async function getAddresses(req, res, next) {
  try {
    const addresses = await userService.getAddresses(req.user.id);
    res.status(200).json({ success: true, data: { addresses } });
  } catch (err) {
    next(err);
  }
}

export async function addAddress(req, res, next) {
  try {
    const addresses = await userService.addAddress(req.user.id, req.body);
    res.status(201).json({ success: true, data: { addresses } });
  } catch (err) {
    next(err);
  }
}

export async function updateAddress(req, res, next) {
  try {
    const addresses = await userService.updateAddress(req.user.id, req.params.addressId, req.body);
    res.status(200).json({ success: true, data: { addresses } });
  } catch (err) {
    next(err);
  }
}

export async function deleteAddress(req, res, next) {
  try {
    const addresses = await userService.deleteAddress(req.user.id, req.params.addressId);
    res.status(200).json({ success: true, data: { addresses } });
  } catch (err) {
    next(err);
  }
}

export async function setDefaultAddress(req, res, next) {
  try {
    const addresses = await userService.setDefaultAddress(req.user.id, req.params.addressId);
    res.status(200).json({ success: true, data: { addresses } });
  } catch (err) {
    next(err);
  }
}
