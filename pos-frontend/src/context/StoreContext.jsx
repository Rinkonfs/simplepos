import { createContext, useContext, useState, useCallback } from "react";
import api from "../api/axios";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [currency, setCurrency] = useState({
        currency_symbol: "$",
        currency_code: "USD",
    });

    const [loaded, setLoaded] = useState({
        products: false,
        categories: false,
        customers: false,
        settings: false,
    });

    const fetchProducts = useCallback(
        async (force = false) => {
            if (loaded.products && !force) return;
            const res = await api.get("/products");
            setProducts(res.data);
            setLoaded((prev) => ({ ...prev, products: true }));
        },
        [loaded.products],
    );

    const fetchCategories = useCallback(
        async (force = false) => {
            if (loaded.categories && !force) return;
            const res = await api.get("/categories");
            setCategories(res.data);
            setLoaded((prev) => ({ ...prev, categories: true }));
        },
        [loaded.categories],
    );

    const fetchCustomers = useCallback(
        async (force = false) => {
            if (loaded.customers && !force) return;
            const res = await api.get("/customers");
            setCustomers(res.data);
            setLoaded((prev) => ({ ...prev, customers: true }));
        },
        [loaded.customers],
    );

    const fetchSettings = useCallback(
        async (force = false) => {
            if (loaded.settings && !force) return;
            const res = await api.get("/settings");
            setCurrency(res.data);
            setLoaded((prev) => ({ ...prev, settings: true }));
        },
        [loaded.settings],
    );

    const clearStore = () => {
        setProducts([]);
        setCategories([]);
        setCustomers([]);
        setLoaded({
            products: false,
            categories: false,
            customers: false,
            settings: false,
        });
    };

    return (
        <StoreContext.Provider
            value={{
                products,
                categories,
                customers,
                currency,
                fetchProducts,
                fetchCategories,
                fetchCustomers,
                fetchSettings,
                clearStore,
            }}
        >
            {children}
        </StoreContext.Provider>
    );
}

export const useStore = () => useContext(StoreContext);
