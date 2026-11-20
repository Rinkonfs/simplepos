import axios from "axios";

const api = axios.create({
    // baseURL: import.meta.env.VITE_API_URL || "https://simplepos-production-62b3da82.up.railway.app/api",
    baseURL: "simplepos-production-62b3da82.up.railway.app/api",
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
