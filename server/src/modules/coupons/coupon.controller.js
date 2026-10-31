import * as couponService from './coupon.service.js';

export async function quoteCoupon(req, res, next) {
  try { res.status(200).json({ success: true, data: { quote: await couponService.quoteCoupon(req.user.id, req.body?.code) } }); }
  catch (err) { next(err); }
}

export async function listCoupons(req, res, next) {
  try { res.status(200).json({ success: true, data: { coupons: await couponService.listCoupons() } }); }
  catch (err) { next(err); }
}

export async function createCoupon(req, res, next) {
  try { res.status(201).json({ success: true, data: { coupon: await couponService.createCoupon(req.body ?? {}) } }); }
  catch (err) { next(err); }
}

export async function updateCoupon(req, res, next) {
  try { res.status(200).json({ success: true, data: { coupon: await couponService.updateCoupon(req.params.id, req.body ?? {}) } }); }
  catch (err) { next(err); }
}
