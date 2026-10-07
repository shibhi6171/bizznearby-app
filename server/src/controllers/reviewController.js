import * as Biz from '../models/businessModel.js';
import * as Review from '../models/reviewModel.js';
import { HttpError } from '../utils/httpError.js';
import { asyncHandler, ok } from '../utils/response.js';

const shape = (r) => ({
  id: r.id,
  rating: r.rating,
  comment: r.comment,
  createdAt: r.created_at,
  businessId: r.business_id,
  businessName: r.businesses?.name ?? null,
  author: r.users?.name ?? 'Customer',
});

// GET /api/reviews?businessId=&limit=&offset=   (public)
export const list = asyncHandler(async (req, res) => {
  const { businessId, limit, offset } = req.query;
  const rows = await Review.list({ businessId, limit, offset });
  let summary = null;
  if (businessId) {
    const all = await Review.ratings(businessId);
    const distribution = [5, 4, 3, 2, 1].map((star) => all.filter((r) => r.rating === star).length);
    const count = all.length;
    summary = { count, average: count ? Math.round((all.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0, distribution };
  }
  ok(res, { reviews: rows.map(shape), summary });
});

// POST /api/businesses/:id/reviews   (customers only, one review per business, no edit/delete)
export const create = asyncHandler(async (req, res) => {
  const biz = await Biz.basic(req.params.id);
  if (!biz) throw new HttpError(404, 'Business not found');
  try {
    const row = await Review.create({
      business_id: biz.id,
      user_id: req.user.id,
      rating: req.body.rating,
      comment: req.body.comment,
    });
    ok(res, row, 201);
  } catch (err) {
    if (err?.code === '23505') throw new HttpError(409, 'You have already reviewed this shop');
    throw err;
  }
});
