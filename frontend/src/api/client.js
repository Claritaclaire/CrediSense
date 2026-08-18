import axios from "axios";

const client = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

// Log requests
client.interceptors.request.use((config) => {
  console.log('[API Request]', config.method.toUpperCase(), config.url, config);
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Log responses
client.interceptors.response.use(
  (response) => {
    console.log('[API Response]', response.config.method.toUpperCase(), response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('[API Error]', error.config?.method?.toUpperCase(), error.config?.url, error.response?.status, error.message);
    // Only clear token and redirect if 401 occurs on protected endpoints, NOT during login/register
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("/auth/")
    ) {
      localStorage.removeItem("access_token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default client;