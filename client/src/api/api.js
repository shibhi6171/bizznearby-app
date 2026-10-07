import { http } from './http.js';

const qs = (p = {}) => {
  const u = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && u.set(k, v));
  return u.toString();
};

export const api = {
  // auth
  login: (role, body) => http(`/auth/${role}/login`, { method: 'POST', body }),
  register: (role, body) => http(`/auth/${role}/register`, { method: 'POST', body }),
  me: () => http('/auth/me'),
  // discovery
  nearby: (p) => http(`/businesses/nearby?${qs(p)}`),
  business: (id) => http(`/businesses/${id}`),
  // seller: businesses and photos
  myBusinesses: () => http('/businesses/mine'),
  createBusiness: (form) => http('/businesses', { method: 'POST', form }),
  updateBusiness: (id, body) => http(`/businesses/${id}`, { method: 'PUT', body }),
  deleteBusiness: (id) => http(`/businesses/${id}`, { method: 'DELETE' }),
  addImages: (id, form) => http(`/businesses/${id}/images`, { method: 'POST', form }),
  deleteImage: (id, imageId) => http(`/businesses/${id}/images/${imageId}`, { method: 'DELETE' }),
  // seller: deals
  createDeal: (id, form) => http(`/businesses/${id}/deals`, { method: 'POST', form }),
  updateDeal: (dealId, body) => http(`/deals/${dealId}`, { method: 'PATCH', body }),
  deleteDeal: (dealId) => http(`/deals/${dealId}`, { method: 'DELETE' }),
  // reviews and leads
  reviews: (p) => http(`/reviews?${qs(p)}`),
  addReview: (id, body) => http(`/businesses/${id}/reviews`, { method: 'POST', body }),
  addLead: (id, type) => http(`/businesses/${id}/leads`, { method: 'POST', body: { type } }).catch(() => {}),
  myLeads: () => http('/leads/mine'),
};
