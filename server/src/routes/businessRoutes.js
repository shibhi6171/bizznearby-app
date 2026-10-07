import { Router } from 'express';
import * as B from '../controllers/businessController.js';
import * as D from '../controllers/dealController.js';
import * as R from '../controllers/reviewController.js';
import * as L from '../controllers/leadController.js';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.js';
import { businessImages, dealBanner } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { businessBody, businessUpdateBody, dealBody, idParam, imageParams, leadBody, nearbyQuery, reviewBody } from '../validators/schemas.js';

const r = Router();
const seller = [authenticate, requireRole('seller')];

// public
r.get('/nearby', validate(nearbyQuery, 'query'), B.nearby);

// seller
r.get('/mine', ...seller, B.mine);
r.post('/', ...seller, businessImages, validate(businessBody), B.create);

r.get('/:id', validate(idParam, 'params'), optionalAuth, B.getOne);
r.put('/:id', ...seller, validate(idParam, 'params'), validate(businessUpdateBody), B.update);
r.delete('/:id', ...seller, validate(idParam, 'params'), B.remove);

// photos: only the owning seller (checked in the controller)
r.post('/:id/images', ...seller, validate(idParam, 'params'), businessImages, B.addImages);
r.delete('/:id/images/:imageId', ...seller, validate(imageParams, 'params'), B.removeImage);

// deals, reviews, leads
r.post('/:id/deals', ...seller, validate(idParam, 'params'), dealBanner, validate(dealBody), D.create);
r.post('/:id/reviews', authenticate, requireRole('customer'), validate(idParam, 'params'), validate(reviewBody), R.create);
r.post('/:id/leads', optionalAuth, validate(idParam, 'params'), validate(leadBody), L.create);

export default r;
