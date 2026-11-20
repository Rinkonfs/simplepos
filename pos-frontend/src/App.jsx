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
import LoginPage from "./pages/LoginPage";

export default function App() {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem("user");
        return saved ? JSON.parse(saved) : null;
    });

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

                        {user.role !== "customer" && (
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
                                        user.role === "customer"
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
