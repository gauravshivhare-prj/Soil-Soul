import { User } from './user.model.js';
import { Order } from '../orders/order.model.js';
import { ORDER_STATUS } from '../orders/order.transitions.js';
import { createError } from '../../utils/createError.js';
import { isDuplicateKeyError, toDuplicateKeyError } from '../../utils/duplicateKeyError.js';
import { normalizeIndianMobile } from '../../utils/phone.js';
import { toProfile } from '../auth/auth.service.js';

const UPDATABLE_FIELDS = Object.freeze(['name', 'phone']);

/**
 * Update the authenticated user's own profile. Only `name` and `phone` may change here;
 * email, role, status, verification state and password have their own controlled flows.
 *
 * @param {string} userId - From the verified token (never from the request body)
 * @param {Object} body - `{ name?, phone? }`; `phone: null` or `""` removes the number
 */
export async function updateOwnProfile(userId, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createError(400, 'VALIDATION_ERROR', 'Profile details are required.');
  }
  const keys = Object.keys(body);
  const unknown = keys.filter((k) => !UPDATABLE_FIELDS.includes(k));
  if (unknown.length > 0) {
    throw createError(400, 'VALIDATION_ERROR', `Only ${UPDATABLE_FIELDS.join(' and ')} can be updated here.`);
  }
  if (keys.length === 0) {
    throw createError(400, 'VALIDATION_ERROR', 'Provide at least one field to update.');
  }

  const $set = {};
  const $unset = {};

  if ('name' in body) {
    if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 60) {
      throw createError(400, 'VALIDATION_ERROR', 'Name must be between 2 and 60 characters.');
    }
    $set.name = body.name.trim();
  }

  if ('phone' in body) {
    if (body.phone === null || body.phone === '') {
      $unset.phone = 1;
    } else {
      const phone = normalizeIndianMobile(body.phone);
      if (!phone) {
        throw createError(400, 'VALIDATION_ERROR', 'Enter a valid Indian mobile number, or leave it blank.');
      }
      $set.phone = phone;
    }
  }

  const update = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;

  let user;
  try {
    user = await User.findByIdAndUpdate(userId, update, { returnDocument: 'after', runValidators: true }).select(
      '_id name email phone role'
    );
  } catch (err) {
    if (isDuplicateKeyError(err)) throw toDuplicateKeyError(err);
    throw err;
  }
  if (!user) throw createError(401, 'USER_NOT_FOUND', 'User account no longer exists.');

  return toProfile(user);
}

export async function listCustomers({ page = 1, limit = 25, search = '' } = {}) {
  const currentPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 25));
  const filter = { role: 'customer' };
  const query = String(search).trim().slice(0, 100);

  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
    ];
  }

  const [customers, total] = await Promise.all([
    User.find(filter)
      .select('_id name email phone status createdAt')
      .sort({ createdAt: -1, _id: 1 })
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    User.countDocuments(filter),
  ]);

  const orderStats = await Order.aggregate([
    { $match: { user: { $in: customers.map((customer) => customer._id) }, orderStatus: { $ne: ORDER_STATUS.CANCELLED } } }, // statuses are stored upper-case
    { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$total' } } },
  ]);
  const statsByUser = new Map(orderStats.map((stats) => [stats._id.toString(), stats]));

  return {
    customers: customers.map((customer) => {
      const stats = statsByUser.get(customer._id.toString());
      return {
        id: customer._id.toString(),
        name: customer.name,
        email: customer.email,
        phone: customer.phone ?? null,
        status: customer.status,
        joined: customer.createdAt,
        orders: stats?.orders ?? 0,
        spent: stats?.spent ?? 0,
      };
    }),
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: currentPage * pageSize < total,
    },
  };
}

export async function getAddresses(userId) {
  const user = await User.findById(userId).select('addresses');
  if (!user) throw createError(401, 'USER_NOT_FOUND', 'User account not found.');
  return user.addresses || [];
}

export async function addAddress(userId, body) {
  const user = await User.findById(userId);
  if (!user) throw createError(401, 'USER_NOT_FOUND', 'User account not found.');
  if (user.addresses && user.addresses.length >= 3) {
    throw createError(400, 'MAX_ADDRESSES_REACHED', 'Maximum of 3 addresses can be saved. Please edit or delete an existing address.');
  }

  const { name, phone, line1, line2, city, state, pincode, label, isDefault } = body || {};
  if (!name || !phone || !line1 || !city || !state || !pincode) {
    throw createError(400, 'VALIDATION_ERROR', 'All required address fields must be filled.');
  }

  const shouldBeDefault = Boolean(isDefault) || (user.addresses?.length === 0);
  if (shouldBeDefault && user.addresses) {
    user.addresses.forEach((a) => { a.isDefault = false; });
  }

  user.addresses.push({
    label: label?.trim() || 'Home',
    name: name.trim(),
    phone: phone.trim(),
    line1: line1.trim(),
    line2: (line2 || '').trim(),
    city: city.trim(),
    state: state.trim(),
    pincode: pincode.trim(),
    isDefault: shouldBeDefault,
  });

  await user.save();
  return user.addresses;
}

export async function updateAddress(userId, addressId, body) {
  const user = await User.findById(userId);
  if (!user) throw createError(401, 'USER_NOT_FOUND', 'User account not found.');

  const address = user.addresses.id(addressId);
  if (!address) throw createError(404, 'ADDRESS_NOT_FOUND', 'Address not found.');

  const { name, phone, line1, line2, city, state, pincode, label, isDefault } = body || {};
  if (isDefault) {
    user.addresses.forEach((a) => { a.isDefault = false; });
    address.isDefault = true;
  } else if (isDefault === false && address.isDefault && user.addresses.length > 1) {
    const other = user.addresses.find((a) => a.id !== addressId);
    if (other) other.isDefault = true;
    address.isDefault = false;
  }

  if (name !== undefined) address.name = name.trim();
  if (phone !== undefined) address.phone = phone.trim();
  if (line1 !== undefined) address.line1 = line1.trim();
  if (line2 !== undefined) address.line2 = (line2 || '').trim();
  if (city !== undefined) address.city = city.trim();
  if (state !== undefined) address.state = state.trim();
  if (pincode !== undefined) address.pincode = pincode.trim();
  if (label !== undefined) address.label = label.trim();

  await user.save();
  return user.addresses;
}

export async function deleteAddress(userId, addressId) {
  const user = await User.findById(userId);
  if (!user) throw createError(401, 'USER_NOT_FOUND', 'User account not found.');

  const address = user.addresses.id(addressId);
  if (!address) throw createError(404, 'ADDRESS_NOT_FOUND', 'Address not found.');

  const wasDefault = address.isDefault;
  user.addresses.pull({ _id: addressId });

  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();
  return user.addresses;
}

export async function setDefaultAddress(userId, addressId) {
  const user = await User.findById(userId);
  if (!user) throw createError(401, 'USER_NOT_FOUND', 'User account not found.');

  const address = user.addresses.id(addressId);
  if (!address) throw createError(404, 'ADDRESS_NOT_FOUND', 'Address not found.');

  user.addresses.forEach((a) => { a.isDefault = false; });
  address.isDefault = true;

  await user.save();
  return user.addresses;
}
