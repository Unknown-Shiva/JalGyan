import { apiRequest } from './api';

export const calculatorService = {
  /**
   * Execute and persist a water calculation
   * Open to guests and authenticated users
   * @param {Object} payload
   * @returns {Promise<Object>}
   */
  async calculate(payload) {
    return apiRequest('/calculator/calculate', {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Retrieve calculation history for the authenticated user
   * @param {Object} params
   * @returns {Promise<{ calculations: Array, pagination: Object }>}
   */
  async getHistory({ page = 1, limit = 10, type = 'ALL' } = {}) {
    const params = new URLSearchParams();
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));
    if (type && type !== 'ALL') params.append('type', type);

    return apiRequest(`/calculator/history?${params.toString()}`);
  },

  /**
   * Retrieve a specific calculation by ID
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getCalculationById(id) {
    if (!id) throw new Error('Calculation ID is required.');
    return apiRequest(`/calculator/history/${id}`);
  },
};
