import * as Biz from '../models/businessModel.js';
import { uploadMany, deleteMany, deleteImage } from '../services/cloudinaryService.js';
import { HttpError } from '../utils/httpError.js';
import { asyncHandler, ok } from '../utils/response.js';
import { nn } from '../utils/db.js';

const MAX_IMAGES = 10;

// Ownership gate used by every mutating route: only the seller who owns the business may change it.
async function loadOwned(req) {
  const b = await Biz.basic(req.params.id);
  if (!b) throw new HttpError(404, 'Business not found');
  if (b.owner_id !== req.user.id) throw new HttpError(403, 'You can only manage your own businesses');
  return b;
}

export const categories = asyncHandler(async (_req, res) => ok(res, await Biz.categories()));

// GET /api/businesses/nearby?lat=&lng=&radiusKm=&category=&q=&minRating=&limit=&offset=
export const nearby = asyncHandler(async (req, res) => {
  const { lat, lng, radiusKm, category, q, minRating, limit, offset } = req.query;
  const rows = await Biz.nearby({
    user_lat: lat,
    user_lng: lng,
    radius_meters: Math.round(radiusKm * 1000),
    filter_category: category && category !== 'all' ? category : null,
    search_text: q || null,
    min_rating: minRating,
    result_limit: limit,
    result_offset: offset,
  });
  ok(res, rows);
});

// Builds the public/owner view of a business (owner sees inactive deals and hidden listings).
async function present(id, viewerId) {
  const b = await Biz.getById(id);
  if (!b) throw new HttpError(404, 'Business not found');
  const isOwner = viewerId === b.owner_id;
  if (!b.is_active && !isOwner) throw new HttpError(404, 'Business not found');
  const now = Date.now();
  const deals = (b.deals || []).filter(
    (d) => isOwner || (d.is_active && new Date(d.starts_at).getTime() <= now && new Date(d.expires_at).getTime() >= now)
  );
  const images = [...(b.business_images || [])].sort((a, c) => Number(c.is_cover) - Number(a.is_cover));
  const { owner_id, business_images, categories: category, ...rest } = b;
  return { ...rest, category, images, deals, isOwner };
}

// GET /api/businesses/:id
export const getOne = asyncHandler(async (req, res) => ok(res, await present(req.params.id, req.user?.id)));

// GET /api/businesses/mine
export const mine = asyncHandler(async (req, res) => ok(res, await Biz.listByOwner(req.user.id)));

// POST /api/businesses  (multipart: fields + images[])
export const create = asyncHandler(async (req, res) => {
  const b = req.body;
  const categoryId = await Biz.categoryId(b.category);
  if (!categoryId) throw new HttpError(400, 'Unknown category');

  let uploaded = [];
  let created = null;
  try {
    uploaded = await uploadMany(req.files || [], 'bizznearby/businesses');
    created = await Biz.create({
      owner_id: req.user.id,
      category_id: categoryId,
      name: b.name,
      description: nn(b.description),
      address: b.address,
      phone: nn(b.phone),
      whatsapp: nn(b.whatsapp),
      email: nn(b.email),
      website: nn(b.website),
      opening_hours: b.openingHours ?? {},
      latitude: b.latitude,
      longitude: b.longitude,
    });
    if (uploaded.length) {
      await Biz.addImages(uploaded.map((u, i) => ({ business_id: created.id, url: u.url, public_id: u.public_id, is_cover: i === 0 })));
    }
  } catch (err) {
    // Roll back: don't leave orphaned Cloudinary files or a half-created business
    await deleteMany(uploaded.map((u) => u.public_id));
    if (created) await Biz.remove(created.id).catch(() => {});
    throw err;
  }
  ok(res, await present(created.id, req.user.id), 201);
});

// PUT /api/businesses/:id  (JSON, any subset of fields)
export const update = asyncHandler(async (req, res) => {
  await loadOwned(req);
  const b = req.body;
  const patch = {};
  const direct = { name: 'name', description: 'description', address: 'address', phone: 'phone', whatsapp: 'whatsapp', email: 'email', website: 'website', latitude: 'latitude', longitude: 'longitude', openingHours: 'opening_hours' };
  const nullable = new Set(['description', 'phone', 'whatsapp', 'email', 'website']);
  for (const [key, col] of Object.entries(direct)) {
    if (b[key] !== undefined) patch[col] = nullable.has(key) ? nn(b[key]) : b[key];
  }
  if (b.category) {
    const id = await Biz.categoryId(b.category);
    if (!id) throw new HttpError(400, 'Unknown category');
    patch.category_id = id;
  }
  if (!Object.keys(patch).length) throw new HttpError(400, 'Nothing to update');
  await Biz.update(req.params.id, patch);
  ok(res, await present(req.params.id, req.user.id));
});

// DELETE /api/businesses/:id
export const remove = asyncHandler(async (req, res) => {
  await loadOwned(req);
  const [imgs, banners] = await Promise.all([Biz.images(req.params.id), Biz.dealBannerIds(req.params.id)]);
  await Biz.remove(req.params.id);
  await deleteMany([...imgs.map((i) => i.public_id), ...banners.map((d) => d.banner_public_id)]);
  ok(res, { deleted: true });
});

// POST /api/businesses/:id/images  (multipart images[])  - owner only
export const addImages = asyncHandler(async (req, res) => {
  await loadOwned(req);
  const files = req.files || [];
  if (!files.length) throw new HttpError(400, 'Choose at least one image');
  const existing = await Biz.images(req.params.id);
  if (existing.length + files.length > MAX_IMAGES) throw new HttpError(400, `A business can have at most ${MAX_IMAGES} photos`);
  const uploaded = await uploadMany(files, 'bizznearby/businesses');
  try {
    const rows = await Biz.addImages(
      uploaded.map((u, i) => ({ business_id: req.params.id, url: u.url, public_id: u.public_id, is_cover: existing.length === 0 && i === 0 }))
    );
    ok(res, rows, 201);
  } catch (err) {
    await deleteMany(uploaded.map((u) => u.public_id));
    throw err;
  }
});

// DELETE /api/businesses/:id/images/:imageId  - owner only
export const removeImage = asyncHandler(async (req, res) => {
  await loadOwned(req);
  const img = await Biz.image(req.params.imageId, req.params.id);
  if (!img) throw new HttpError(404, 'Image not found');
  await Biz.removeImage(img.id);
  await deleteImage(img.public_id);
  if (img.is_cover) {
    const rest = await Biz.images(req.params.id);
    if (rest.length) await Biz.setCover(req.params.id, rest[0].id);
  }
  ok(res, { deleted: true });
});
