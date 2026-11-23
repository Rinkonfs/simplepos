import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "https://simplepos-production-e8feb46f.up.railway.app/api",
    // baseURL: "https://simplepos-production-e8feb46f.up.railway.app/api",
    headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
