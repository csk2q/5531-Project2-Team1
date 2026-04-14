const BASE_URL = "http://127.0.0.1:5000";

export const getToken = () => localStorage.getItem("token");
export const setToken = (token) => localStorage.setItem("token", token);
export const clearToken = () => localStorage.removeItem("token");

export const getStoredUser = () => {
  try { return JSON.parse(localStorage.getItem("nas_user")); } catch { return null; }
};
export const storeUser = (user) => localStorage.setItem("nas_user", JSON.stringify(user));
export const clearStoredUser = () => localStorage.removeItem("nas_user");

export const authFetch = (path, options = {}) => {
  const token = getToken();

  const headers = {
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  return fetch(`${BASE_URL}${path}`, { ...options, headers });
};
