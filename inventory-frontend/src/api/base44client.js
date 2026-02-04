import api from "./client";

/**
 * Generic resource CRUD operations
 * @param {string} resourcePath - API endpoint path
 * @returns {Object} Object with list, create, read, update, delete methods
 */
const createEntityAPI = (resourcePath) => {
  return {
    /**
     * List resources
     * @param {string} [orderBy="-id"] - Field to order by
     * @param {number} [limit=100] - Maximum results
     * @returns {Promise<Array>}
     */
    list: async (orderBy = "-id", limit = 100) => {
      try {
        const response = await api.get(resourcePath);
        let data = response.data;
        if (!Array.isArray(data)) {
          data = data.results || [];
        }
        return data;
      } catch (error) {
        console.error(`Error fetching ${resourcePath}:`, error);
        throw error;
      }
    },

    /**
     * Filter resources
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>}
     */
    filter: async (filters = {}) => {
      try {
        const response = await api.get(resourcePath, { params: filters });
        let data = response.data;
        if (!Array.isArray(data)) {
          data = data.results || [];
        }
        return data;
      } catch (error) {
        console.error(`Error filtering ${resourcePath}:`, error);
        throw error;
      }
    },

    /**
     * Get single resource by ID
     * @param {number|string} id - Resource ID
     * @returns {Promise<Object>}
     */
    read: async (id) => {
      try {
        const response = await api.get(`${resourcePath}/${id}`);
        return response.data;
      } catch (error) {
        console.error(`Error reading ${resourcePath}/${id}:`, error);
        throw error;
      }
    },

    /**
     * Create new resource
     * @param {Object} data - Resource data
     * @returns {Promise<Object>}
     */
    create: async (data) => {
      try {
        const response = await api.post(`${resourcePath}/add`, data);
        return response.data;
      } catch (error) {
        console.error(`Error creating ${resourcePath}:`, error);
        throw error;
      }
    },

    /**
     * Update resource
     * @param {number|string} id - Resource ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>}
     */
    update: async (id, data) => {
      try {
        const response = await api.put(`${resourcePath}/${id}`, data);
        return response.data;
      } catch (error) {
        console.error(`Error updating ${resourcePath}/${id}:`, error);
        throw error;
      }
    },

    /**
     * Delete resource
     * @param {number|string} id - Resource ID
     * @returns {Promise<Object>}
     */
    delete: async (id) => {
      try {
        const response = await api.delete(`${resourcePath}/${id}`);
        return response.data;
      } catch (error) {
        console.error(`Error deleting ${resourcePath}/${id}:`, error);
        throw error;
      }
    },
  };
};

/**
 * Base44 API client with entity methods
 * @typedef {Object} Base44Client
 * @property {Object} entities - Entity CRUD operations
 * @property {Function} uploadInvoice - Upload invoice file
 * @property {Function} recordConsignmentSale - Record consignment sale
 */
export const base44 = {
  entities: {
    Product: createEntityAPI("/products"),
    Shop: createEntityAPI("/shops"),
    Invoice: createEntityAPI("/invoices"),
    InvoiceItem: createEntityAPI("/invoice-items"),
    ConsignmentStock: createEntityAPI("/consignment-stock"),
    ConsignmentSale: createEntityAPI("/consignment-sales"),
    MasterStock: createEntityAPI("/stock/master"),
    StockMovement: createEntityAPI("/stock-movements"),
    Order: createEntityAPI("/orders"),
    OrderItem: createEntityAPI("/order-items"),
  },

  /**
   * Upload invoice file
   * @param {File} file - Invoice file (PDF or Excel)
   * @returns {Promise<Object>}
   */
  uploadInvoice: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await api.post("/upload-invoice", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error uploading invoice:", error);
      throw error;
    }
  },

  /**
   * Record consignment sale
   * @param {Object} data - Sale data
   * @returns {Promise<Object>}
   */
  recordConsignmentSale: async (data) => {
    try {
      const response = await api.post("/consignment/sale", data);
      return response.data;
    } catch (error) {
      console.error("Error recording consignment sale:", error);
      throw error;
    }
  },

  /**
   * Application logs
   */
  appLogs: {
    /**
     * Log user activity in app
     * @param {string} pageName - Name of the page being visited
     * @returns {Promise<Object>}
     */
    logUserInApp: async (pageName) => {
      try {
        const response = await api.post("/logs/user-activity", { page: pageName });
        return response.data;
      } catch (error) {
        console.error("Error logging user activity:", error);
        throw error;
      }
    },
  },
};

// Legacy exports for backward compatibility
export const getProducts = () => api.get("/products");
export const getShops = () => api.get("/shops");
export const getMasterStock = () => api.get("/stock/master");
export const getConsignmentStock = () => api.get("/consignment-stock");
export const uploadInvoice = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/upload-invoice", formData);
};
export const recordConsignmentSale = (data) =>
  api.post("/consignment/sale", data);
