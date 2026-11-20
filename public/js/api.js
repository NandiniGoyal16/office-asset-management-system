/**
 * Frontend API Service Layer
 * Office Asset Management System
 */

const API = {
  // Generic Fetch Wrapper
  async request(endpoint, options = {}) {
    const url = `/api${endpoint}`;
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Inject active session Bearer token if available
    const token = localStorage.getItem('assetflow_token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers
        }
      });

      const data = await response.json().catch(() => ({}));

      // Handle 401 Unauthorized for non-auth endpoints
      if (response.status === 401 && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/register')) {
        localStorage.removeItem('assetflow_token');
        localStorage.removeItem('assetflow_user');
        if (window.App && typeof window.App.showAuthPortal === 'function') {
          window.App.showAuthPortal('Your session has expired. Please sign in again.');
        }
        throw new Error(data.error || 'Session expired. Please sign in again.');
      }

      if (!response.ok || data.success === false) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${url}]:`, err);
      throw err;
    }
  },

  // Authentication Endpoints
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  async getMe() {
    return this.request('/auth/me');
  },

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST'
    });
  },

  async getDemoAccounts() {
    return this.request('/auth/demo-accounts');
  },

  // Dashboard & Reports
  async getDashboard() {
    return this.request('/reports/dashboard');
  },

  async getDepreciationReport() {
    return this.request('/reports/depreciation');
  },

  // Assets
  async getAssets(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request(`/assets?${query}`);
  },

  async getAssetById(id) {
    return this.request(`/assets/${id}`);
  },

  async createAsset(assetData) {
    return this.request('/assets', {
      method: 'POST',
      body: JSON.stringify(assetData)
    });
  },

  async updateAsset(id, assetData) {
    return this.request(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assetData)
    });
  },

  async deleteAsset(id) {
    return this.request(`/assets/${id}`, {
      method: 'DELETE'
    });
  },

  // Metadata Dropdowns
  async getCategories() {
    return this.request('/assets/meta/categories');
  },

  async getLocations() {
    return this.request('/assets/meta/locations');
  },

  async getDepartments() {
    return this.request('/employees/departments');
  },

  async getEmployees() {
    return this.request('/employees');
  },

  // Allocations (Checkout / Checkin)
  async getAllocations(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request(`/allocations?${query}`);
  },

  async checkoutAsset(payload) {
    return this.request('/allocations/checkout', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async checkinAsset(payload) {
    return this.request('/allocations/checkin', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Maintenance & Service
  async getMaintenanceRecords(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request(`/maintenance?${query}`);
  },

  async createMaintenance(payload) {
    return this.request('/maintenance', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async resolveMaintenance(ticketId, payload) {
    return this.request(`/maintenance/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  // Audit Logs
  async getAuditLogs(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request(`/audit?${query}`);
  }
};

window.API = API;
