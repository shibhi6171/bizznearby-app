import * as Biz from '../models/businessModel.js';
import * as Lead from '../models/leadModel.js';
import { HttpError } from '../utils/httpError.js';
import { asyncHandler, ok } from '../utils/response.js';

// POST /api/businesses/:id/leads  { type }   (guests allowed)
export const create = asyncHandler(async (req, res) => {
  const biz = await Biz.basic(req.params.id);
  if (!biz) throw new HttpError(404, 'Business not found');
  if (req.user?.id !== biz.owner_id) {
    await Lead.create({ business_id: biz.id, user_id: req.user?.id ?? null, type: req.body.type });
  }
  ok(res, null, 201);
});

// GET /api/leads/mine   (sellers)
export const mine = asyncHandler(async (req, res) => {
  const rows = await Lead.forOwner(req.user.id);
  ok(res, rows.map((l) => ({ id: l.id, type: l.type, createdAt: l.created_at, businessId: l.businesses.id, businessName: l.businesses.name, customer: l.users?.name ?? 'Guest' })));
});
