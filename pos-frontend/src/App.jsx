import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import "./i18n";
import api from "./api/axios";
import { StoreProvider } from "./context/StoreContext";
import Layout from "./components/Layout";
import PosPage from "./pages/PosPage";
import ReportsPage from "./pages/ReportsPage";
import StockPage from "./pages/StockPage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";
import OrdersPage from "./pages/OrdersPage";
import ProfilePage from "./pages/ProfilePage";
import VendorsPage from "./pages/VendorsPage";
import AccountingPage from "./pages/AccountingPage";
import PublicPoPage from "./pages/PublicPoPage";
import LoginPage from "./pages/LoginPage";

export default function App() {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem("user");
        return saved ? JSON.parse(saved) : null;
    });

    if (window.location.pathname.startsWith("/po/")) {
        const token = window.location.pathname
            .replace(/\/+$/, "")
            .split("/po/")[1];
        return <PublicPoPage token={token} />;
    }

    const handleLogout = async () => {
        try {
            await api.post("/logout");
        } catch (_) {}
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
    };

    if (!user) {
        return <LoginPage onLogin={(u) => setUser(u)} />;
    }

    return (
        <StoreProvider>
            <BrowserRouter>
                <Layout user={user} onLogout={handleLogout}>
                    <Routes>
                        <Route
                            path="/shop"
                            element={
                                <PosPage
                                    channel="ecommerce"
                                    user={user}
                                    onUserUpdate={setUser}
                                />
                            }
                        />

                        {user.role !== "shop" && (
                            <>
                                <Route
                                    path="/profile"
                                    element={
                                        <ProfilePage
                                            user={user}
                                            onUserUpdate={setUser}
                                        />
                                    }
                                />
                                <Route
                                    path="/orders"
                                    element={<OrdersPage user={user} />}
                                />
                            </>
                        )}

                        {(user.role === "super_admin" ||
                            user.role === "seller") && (
                            <>
                                <Route
                                    path="/pos"
                                    element={
                                        <PosPage channel="pos" user={user} />
                                    }
                                />
                                <Route
                                    path="/stock"
                                    element={<StockPage user={user} />}
                                />
                            </>
                        )}

                        {user.role === "super_admin" && (
                            <>
                                <Route
                                    path="/reports"
                                    element={<ReportsPage />}
                                />
                                <Route
                                    path="/settings"
                                    element={<SettingsPage />}
                                />
                                <Route path="/users" element={<UsersPage />} />
                                <Route
                                    path="/vendors"
                                    element={<VendorsPage />}
                                />
                                <Route
                                    path="/accounting"
                                    element={<AccountingPage />}
                                />
                            </>
                        )}

                        <Route
                            path="*"
                            element={
                                <Navigate
                                    to={
                                        user.role === "customer" ||
                                        user.role === "shop"
                                            ? "/shop"
                                            : "/pos"
                                    }
                                />
                            }
                        />
                    </Routes>
                </Layout>
            </BrowserRouter>
        </StoreProvider>
    );
}
