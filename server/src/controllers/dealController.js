import * as Biz from '../models/businessModel.js';
import { uploadBuffer, deleteImage } from '../services/cloudinaryService.js';
import { HttpError } from '../utils/httpError.js';
import { asyncHandler, ok } from '../utils/response.js';
import { nn } from '../utils/db.js';

// POST /api/businesses/:id/deals  (multipart: fields + optional banner)
export const create = asyncHandler(async (req, res) => {
  const biz = await Biz.basic(req.params.id);
  if (!biz) throw new HttpError(404, 'Business not found');
  if (biz.owner_id !== req.user.id) throw new HttpError(403, 'You can only add deals to your own businesses');

  const b = req.body;
  const startsAt = b.startsAt || new Date();
  if (b.expiresAt <= new Date()) throw new HttpError(400, 'The expiry must be in the future');
  if (b.expiresAt <= startsAt) throw new HttpError(400, 'The expiry must be after the start');

  const banner = req.file ? await uploadBuffer(req.file.buffer, 'bizznearby/deals') : null;
  try {
    const deal = await Biz.createDeal({
      business_id: biz.id,
      title: b.title,
      description: nn(b.description),
      discount_percent: b.discountPercent,
      starts_at: startsAt,
      expires_at: b.expiresAt,
      banner_url: banner?.url ?? null,
      banner_public_id: banner?.public_id ?? null,
    });
    ok(res, deal, 201);
  } catch (err) {
    if (banner) await deleteImage(banner.public_id).catch(() => {});
    throw err;
  }
});

async function loadOwnedDeal(req) {
  const deal = await Biz.dealWithOwner(req.params.dealId);
  if (!deal) throw new HttpError(404, 'Deal not found');
  if (deal.businesses.owner_id !== req.user.id) throw new HttpError(403, 'You can only manage your own deals');
  return deal;
}

// PATCH /api/deals/:dealId  (change fields or deactivate with { isActive: false })
export const update = asyncHandler(async (req, res) => {
  const deal = await loadOwnedDeal(req);
  const b = req.body;
  const patch = {};
  if (b.title !== undefined) patch.title = b.title;
  if (b.description !== undefined) patch.description = nn(b.description);
  if (b.discountPercent !== undefined) patch.discount_percent = b.discountPercent;
  if (b.isActive !== undefined) patch.is_active = b.isActive;
  if (b.expiresAt !== undefined) {
    if (b.expiresAt <= new Date(deal.starts_at)) throw new HttpError(400, 'The expiry must be after the start');
    patch.expires_at = b.expiresAt;
  }
  if (!Object.keys(patch).length) throw new HttpError(400, 'Nothing to update');
  ok(res, await Biz.updateDeal(deal.id, patch));
});

// DELETE /api/deals/:dealId
export const remove = asyncHandler(async (req, res) => {
  const deal = await loadOwnedDeal(req);
  await Biz.removeDeal(deal.id);
  await deleteImage(deal.banner_public_id).catch(() => {});
  ok(res, { deleted: true });
});
