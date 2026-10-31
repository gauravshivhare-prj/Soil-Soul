import * as reviewService from './review.service.js';

export async function getProductReviews(req, res, next) {
  try {
    res.status(200).json({ success: true, data: await reviewService.listPublicReviews(req.params.slug, req.query) });
  } catch (err) { next(err); }
}

export async function createProductReview(req, res, next) {
  try {
    const result = await reviewService.createProductReview(req.user.id, req.params.slug, req.body ?? {});
    res.status(201).json({ success: true, data: { review: result } });
  } catch (err) { next(err); }
}

export async function getAdminReviews(req, res, next) {
  try { res.status(200).json({ success: true, data: await reviewService.listAdminReviews(req.query) }); }
  catch (err) { next(err); }
}

export async function moderateReview(req, res, next) {
  try { res.status(200).json({ success: true, data: { review: await reviewService.moderateReview(req.params.id, { ...req.body, adminId: req.user.id }) } }); }
  catch (err) { next(err); }
}
