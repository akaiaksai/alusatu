import api from './axios';

export async function getProfile() {
  const { data } = await api.get('/api/users/profile');
  return data.user;
}

export async function updateProfile(profile = {}) {
  const { username, email, phone, city, avatar } = profile;
  const payload = {};
  if (username !== undefined) payload.username = username;
  if (email !== undefined) payload.email = email;
  if (phone !== undefined) payload.phone = phone;
  if (city !== undefined) payload.city = city;
  if (Object.prototype.hasOwnProperty.call(profile, 'avatar')) {
    payload.avatar = avatar;
  }
  const { data } = await api.put('/api/users/profile', payload);
  return data.user;
}

export async function getAllUsers() {
  const { data } = await api.get('/api/users');
  return data
}

export async function deleteUser(id) {
  await api.delete(`/api/users/${id}`);
}

export async function updateUserRole(id, isAdmin) {
  const { data } = await api.put(`/api/users/${id}/role`, { isAdmin });
  return data.user;
}

export async function getCart() {
  const { data } = await api.get('/api/cart');
  return data
}

export async function addToCart({ productId, name, price, image, quantity }) {
  const { data } = await api.post('/api/cart', { productId, name, price, image, quantity });
  return data;
}

export async function updateCartItem(productId, quantity) {
  const { data } = await api.put(`/api/cart/${productId}`, { quantity });
  return data;
}

export async function removeFromCart(productId) {
  const { data } = await api.delete(`/api/cart/${productId}`);
  return data;
}

export async function clearCart() {
  const { data } = await api.delete('/api/cart');
  return data;
}

export async function getFavorites() {
  const { data } = await api.get('/api/favorites');
  return data
}

export async function addFavorite(productId) {
  const { data } = await api.post('/api/favorites', { productId });
  return data;
}

export async function removeFavorite(productId) {
  const { data } = await api.delete(`/api/favorites/${productId}`);
  return data;
}

export async function createOrder({ items, total, totalItems, pickupDate, deliveryMethod, deliveryAddress, pickupAddress }) {
  const { data } = await api.post('/api/orders', { items, total, totalItems, pickupDate, deliveryMethod, deliveryAddress, pickupAddress });
  return data;
}

export async function getMyOrders() {
  const { data } = await api.get('/api/orders');
  return data;
}

export async function getOrderReceipt(orderId) {
  const { data } = await api.get(`/api/orders/${orderId}/receipt`);
  return data;
}

export async function getAllOrders() {
  const { data } = await api.get('/api/orders/all');
  return data;
}

export async function deleteOrder(id) {
  const { data } = await api.delete(`/api/orders/${id}`);
  return data;
}

export async function clearAllOrders() {
  const { data } = await api.delete('/api/orders');
  return data;
}

export async function getListedProducts() {
  const { data } = await api.get('/api/products/listed');
  return data;
}

export async function getListedProductById(id) {
  const { data } = await api.get(`/api/products/listed/${id}`);
  return data;
}

export async function getProductReviews(productId) {
  const { data } = await api.get(`/api/products/${productId}/reviews`);
  return data;
}

export async function createProductReview(productId, { author, rating, text }) {
  const { data } = await api.post(`/api/products/${productId}/reviews`, { author, rating, text });
  return data;
}

export async function deleteProductReview(productId, reviewId) {
  const { data } = await api.delete(`/api/products/${productId}/reviews/${reviewId}`);
  return data;
}

export async function getMyListedProducts() {
  const { data } = await api.get('/api/products/my');
  return data;
}

export async function createListedProduct({ title, price, category, description, image, images }) {
  const payload = { title, price, category, description };
  if (Array.isArray(images)) payload.images = images;
  if (image) payload.image = image;
  const { data } = await api.post('/api/products', payload);
  return data;
}

export async function deleteListedProduct(id) {
  await api.delete(`/api/products/${id}`);
}

export async function topUpBalance(amount) {
  const { data } = await api.put('/api/users/balance', { amount });
  return data;
}

export async function refundOrder(orderId) {
  const { data } = await api.post(`/api/orders/${orderId}/refund`);
  return data;
}
