import { Router } from 'express';
import { categories } from '../controllers/businessController.js';
import * as D from '../controllers/dealController.js';
import * as R from '../controllers/reviewController.js';
import * as L from '../controllers/leadController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { dealIdParam, dealUpdateBody, reviewsQuery } from '../validators/schemas.js';

export const categoryRoutes = Router().get('/', categories);

export const dealRoutes = Router();
dealRoutes.patch('/:dealId', authenticate, requireRole('seller'), validate(dealIdParam, 'params'), validate(dealUpdateBody), D.update);
dealRoutes.delete('/:dealId', authenticate, requireRole('seller'), validate(dealIdParam, 'params'), D.remove);

export const reviewRoutes = Router().get('/', validate(reviewsQuery, 'query'), R.list);

export const leadRoutes = Router().get('/mine', authenticate, requireRole('seller'), L.mine);
