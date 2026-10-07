import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import * as User from '../models/userModel.js';
import { HttpError } from '../utils/httpError.js';
import { asyncHandler, ok } from '../utils/response.js';

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

const sign = (u) => jwt.sign({ id: u.id, role: u.role, name: u.name }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  phone: u.phone ?? null,
  businessName: u.business_name ?? null,
});

// POST /api/auth/customer/register and /api/auth/seller/register
export const register = (role) =>
  asyncHandler(async (req, res) => {
    const { name, email, password, businessName, phone } = req.body;
    if (await User.findByEmail(email)) throw new HttpError(409, 'An account with this email already exists');
    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name, email, password_hash, role,
      phone: role === 'seller' ? phone : null,
      business_name: role === 'seller' ? businessName : null,
    });
    ok(res, { token: sign(user), user: publicUser(user) }, 201);
  });

// POST /api/auth/customer/login and /api/auth/seller/login
export const login = (role) =>
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    // Same message for unknown email and wrong password, so emails can't be probed.
    const valid = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !valid) throw new HttpError(401, 'Invalid email or password');
    if (user.role !== role) throw new HttpError(403, `This email is registered as a ${user.role}. Use the ${user.role} login.`);
    ok(res, { token: sign(user), user: publicUser(user) });
  });

// GET /api/auth/me
export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new HttpError(401, 'Account no longer exists');
  ok(res, publicUser(user));
});
