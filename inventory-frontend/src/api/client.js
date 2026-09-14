import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const applyAuthHeader = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete api.defaults.headers.common.Authorization;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
}, (error) => Promise.reject(error));

const storedToken = localStorage.getItem("token");
if (storedToken) {
  applyAuthHeader(storedToken);
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      applyAuthHeader(null);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;