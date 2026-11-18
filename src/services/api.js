import axios from "axios";
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    "Content-Type": "application/json"
  }
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("taskline_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem("taskline_token")) {
      const url = error.config?.url || "";
      if (!url.includes("/auth/login") && !url.includes("/auth/register")) {
        localStorage.removeItem("taskline_token");
        window.dispatchEvent(new Event("taskline:unauthorized"));
      }
    }
    return Promise.reject(error);
  }
);
var stdin_default = api;
export {
  stdin_default as default
};
