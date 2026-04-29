import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 segundos de timeout
});

// Interceptor de retry será configurado no AuthContext para evitar conflitos

// Products API
export const productsAPI = {
  getAll: (params = {}) => api.get('/products', { params }),
  getById: id => api.get(`/products/${id}`),
  create: data => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: id => api.delete(`/products/${id}`),
  getLowStock: () => api.get('/products/low-stock')
};

// Suppliers API
export const suppliersAPI = {
  getAll: () => api.get('/suppliers'),
  getById: id => api.get(`/suppliers/${id}`),
  create: data => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: id => api.delete(`/suppliers/${id}`)
};

// Stock API
export const stockAPI = {
  addStock: (productId, data) => api.post(`/products/${productId}/stock/add`, data),
  removeStock: (productId, data) => api.post(`/products/${productId}/stock/remove`, data),
  setStock: (productId, data) => api.put(`/products/${productId}/stock/set`, data),
  getMovements: productId => api.get(`/products/${productId}/movements`)
};

// Alerts API
export const alertsAPI = {
  getLowStock: () => api.get('/alerts/low-stock')
};

// Purchase Orders API
export const purchaseOrdersAPI = {
  getAll: (params = {}) => api.get('/purchase-orders', { params }),
  getById: id => api.get(`/purchase-orders/${id}`),
  create: data => api.post('/purchase-orders', data),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
  delete: id => api.delete(`/purchase-orders/${id}`),
  approve: id => api.post(`/purchase-orders/${id}/approve`),
  reject: (id, reason) => api.post(`/purchase-orders/${id}/reject`, { reason }),
  receive: (id, data) => api.post(`/purchase-orders/${id}/receive`, data),
  autoGenerate: supplierId =>
    api.post('/purchase-orders/auto-generate', { fornecedor_id: supplierId }),
  getStatistics: () => api.get('/purchase-orders/statistics')
};

// Insights API (Simplified)
export const insightsAPI = {
  getOverview: () => api.get('/insights/overview'),
  getProductInsights: productId => api.get(`/insights/product/${productId}`),
  getLowStockAlerts: () => api.get('/insights/low-stock-alerts'),
  generateSalesData: (days = 30) => api.post(`/insights/generate-sales-data?days=${days}`),

  // ML endpoints
  getDemandPrediction: (productId, daysAhead = 30) =>
    api.get(`/insights/ml/demand-prediction/${productId}?days_ahead=${daysAhead}`),

  getPriceOptimization: productId => api.get(`/insights/ml/price-optimization/${productId}`),

  getAnomalyDetection: (productId = null) =>
    api.get(`/insights/ml/anomaly-detection${productId ? `?product_id=${productId}` : ''}`),

  getStockOptimization: productId => api.get(`/insights/ml/stock-optimization/${productId}`),

  getMLProductInsights: productId => api.get(`/insights/ml/product-insights/${productId}`)
};

// Auto Restock API (Simplified)
export const autoRestockAPI = {
  getAnalysis: () => api.get('/auto-restock/analysis'),
  restockAll: () => api.post('/auto-restock/restock-all'),
  restockProduct: productId => api.post(`/auto-restock/restock-product/${productId}`)
};

// Sales API
export const salesAPI = {
  getAll: (limit = 100) => api.get(`/sales?limit=${limit}`),
  getById: id => api.get(`/sales/${id}`),
  getTopProducts: (limit = 5) => api.get(`/sales/analytics/top-products?limit=${limit}`)
};

// Simulation API
export const simulationAPI = {
  start: (durationMinutes = 10, maxPendingOrders = 5) =>
    api.post('/simulation/start', { duration_minutes: durationMinutes, max_pending_orders: maxPendingOrders }),
  stop: () => api.post('/simulation/stop'),
  getStatus: () => api.get('/simulation/status'),
  approveAll: () => api.post('/simulation/approve-all'),
  clearApproved: () => api.post('/simulation/clear-approved')
};

export default api;
