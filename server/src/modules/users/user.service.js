import { User } from './user.model.js';
import { Order } from '../orders/order.model.js';
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
    { $match: { user: { $in: customers.map((customer) => customer._id) }, orderStatus: { $ne: 'cancelled' } } },
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
