import { Router } from 'express';
import { register, login, me } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginBody, registerCustomerBody, registerSellerBody } from '../validators/schemas.js';

const r = Router();
r.post('/customer/register', validate(registerCustomerBody), register('customer'));
r.post('/customer/login', validate(loginBody), login('customer'));
r.post('/seller/register', validate(registerSellerBody), register('seller'));
r.post('/seller/login', validate(loginBody), login('seller'));
r.get('/me', authenticate, me);
export default r;
