import api from "./client";

const ENTITY_ALIASES = {
  Product: "/products",
  Shop: "/shops",
  Invoice: "/invoices",
  InvoiceItem: "/invoice-items",
  ConsignmentStock: "/stock/consignment",
  ConsignmentSale: "/sales/consignment",
  MasterStock: "/stock/master",
  StockMovement: "/stock-movements",
  Order: "/orders",
  OrderItem: "/order-items",
};

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
};

const createEntityAPI = (resourcePath) => {
  const path = resourcePath.startsWith("/") ? resourcePath : `/${resourcePath}`;

  return {
    list: async (orderBy = "-id", limit = 100) => {
      const response = await api.get(path);
      return normalizeArray(response.data);
    },
    filter: async (filters = {}) => {
      const response = await api.get(path);
      const rows = normalizeArray(response.data);
      if (!Object.keys(filters).length) return rows;
      return rows.filter((item) =>
        Object.entries(filters).every(([key, value]) => item[key] === value)
      );
    },
    read: async (id) => {
      const response = await api.get(`${path}/${id}`);
      return response.data;
    },
    create: async (data) => {
      const response = await api.post(path, data);
      return response.data;
    },
    update: async (id, data) => {
      const response = await api.put(`${path}/${id}`, data);
      return response.data;
    },
    delete: async (id) => {
      const response = await api.delete(`${path}/${id}`);
      return response.data;
    },
  };
};

export const base44 = {
  auth: {
    me: async () => {
      const response = await api.get("/me");
      return response.data;
    },
  },
  entities: Object.fromEntries(
    Object.entries(ENTITY_ALIASES).map(([name, route]) => [name, createEntityAPI(route)])
  ),
  uploadInvoice: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/upload-invoice", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  recordConsignmentSale: async (data) => {
    const response = await api.post("/consignment/sale", data);
    return response.data;
  },
  appLogs: {
    logUserInApp: async (pageName) => {
      const response = await api.post("/logs/user-activity", { page: pageName });
      return response.data;
    },
  },
};

export const getProducts = () => api.get("/products");
export const getShops = () => api.get("/shops");
export const getMasterStock = () => api.get("/stock/master");
export const getConsignmentStock = () => api.get("/stock/consignment");
export const uploadInvoice = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/upload-invoice", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const recordConsignmentSale = (data) => api.post("/consignment/sale", data);
export default base44;
