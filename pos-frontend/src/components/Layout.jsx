import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    ShoppingCart,
    Package,
    BarChart3,
    Store,
    Globe,
    LogOut,
    User,
    Settings,
    Users,
    ClipboardList,
    ChevronDown,
} from "lucide-react";
import { useStore } from "../context/StoreContext";

export default function Layout({ user, onLogout, children }) {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const { fetchSettings } = useStore();
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const changeLang = (lang) => {
        i18n.changeLanguage(lang);
        localStorage.setItem("lang", lang);
    };

    const navItems = [
        ...(user?.role !== "customer"
            ? [
                  { to: "/pos", label: t("pos"), icon: ShoppingCart },
                  { to: "/stock", label: t("stock"), icon: Package },
              ]
            : []),
        {
            to: "/orders",
            label: user?.role === "customer" ? t("my_orders") : t("orders"),
            icon: ClipboardList,
        },
        ...(user?.role === "super_admin"
            ? [{ to: "/reports", label: t("reports"), icon: BarChart3 }]
            : []),
        { to: "/shop", label: t("shop"), icon: Store },
    ];

    const roleColors = {
        super_admin: "bg-purple-100 text-purple-700",
        seller: "bg-blue-100 text-blue-700",
        customer: "bg-emerald-100 text-emerald-700",
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 pb-24 md:pb-8">
            <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
                            S
                        </div>
                        <div>
                            <div className="font-bold text-base leading-tight text-slate-900">
                                {t("app_name")}
                            </div>
                            <div className="text-[11px] text-slate-500 hidden sm:block">
                                {t("app_subtitle")}
                            </div>
                        </div>
                    </div>

                    <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        {navItems.map(({ to, label, icon: Icon }) => {
                            const active = location.pathname === to;
                            return (
                                <Link
                                    key={to}
                                    to={to}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                                        active
                                            ? "bg-white text-indigo-600 shadow-sm"
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                            <Globe className="w-4 h-4 text-slate-500" />
                            <select
                                value={i18n.language}
                                onChange={(e) => changeLang(e.target.value)}
                                className="text-xs sm:text-sm font-medium bg-transparent focus:outline-none cursor-pointer"
                            >
                                <option value="en">EN</option>
                                <option value="id">ID</option>
                                <option value="bn">বাংলা</option>
                            </select>
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
                            >
                                {user.photo_url ? (
                                    <img
                                        src={user.photo_url}
                                        alt={user.name}
                                        className="w-6 h-6 rounded-full object-cover"
                                    />
                                ) : (
                                    <User className="w-4 h-4 text-slate-500" />
                                )}
                                <span className="text-xs sm:text-sm font-medium text-slate-700 hidden sm:inline">
                                    {user.name}
                                </span>
                                <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase hidden sm:inline ${
                                        roleColors[user.role] || "bg-slate-200"
                                    }`}
                                >
                                    {user.role.replace("_", " ")}
                                </span>
                                <ChevronDown className="w-4 h-4 text-slate-500" />
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50">
                                    <div className="px-3 py-2 border-b text-xs text-slate-500 sm:hidden">
                                        <div className="font-bold text-slate-800">
                                            {user.name}
                                        </div>
                                        <div className="uppercase">
                                            {user.role.replace("_", " ")}
                                        </div>
                                    </div>
                                    <Link
                                        to="/profile"
                                        onClick={() => setMenuOpen(false)}
                                        className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl hover:bg-slate-50 text-slate-700"
                                    >
                                        <User className="w-4 h-4 text-indigo-600" />{" "}
                                        My Profile
                                    </Link>
                                    {user.role === "super_admin" && (
                                        <>
                                            <Link
                                                to="/vendors"
                                                onClick={() =>
                                                    setMenuOpen(false)
                                                }
                                                className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl hover:bg-slate-50 text-slate-700"
                                            >
                                                <Store className="w-4 h-4 text-indigo-600" />{" "}
                                                Vendors & PO
                                            </Link>
                                            <Link
                                                to="/accounting"
                                                onClick={() =>
                                                    setMenuOpen(false)
                                                }
                                                className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl hover:bg-slate-50 text-slate-700"
                                            >
                                                <BarChart3 className="w-4 h-4 text-indigo-600" />{" "}
                                                Accounting
                                            </Link>
                                            <Link
                                                to="/settings"
                                                onClick={() =>
                                                    setMenuOpen(false)
                                                }
                                                className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl hover:bg-slate-50 text-slate-700"
                                            >
                                                <Settings className="w-4 h-4 text-indigo-600" />{" "}
                                                {t("settings")}
                                            </Link>
                                            <Link
                                                to="/users"
                                                onClick={() =>
                                                    setMenuOpen(false)
                                                }
                                                className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl hover:bg-slate-50 text-slate-700"
                                            >
                                                <Users className="w-4 h-4 text-indigo-600" />{" "}
                                                {t("users")}
                                            </Link>
                                        </>
                                    )}
                                    <button
                                        onClick={() => {
                                            setMenuOpen(false);
                                            onLogout();
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 rounded-xl hover:bg-red-50 font-medium"
                                    >
                                        <LogOut className="w-4 h-4" />{" "}
                                        {t("logout")}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-3 sm:p-6">{children}</main>

            <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex justify-around py-2 px-1 z-30 shadow-lg">
                {navItems.map(({ to, label, icon: Icon }) => {
                    const active = location.pathname === to;
                    return (
                        <Link
                            key={to}
                            to={to}
                            className={`flex flex-col items-center px-2 py-1 rounded-xl text-[11px] font-medium transition ${
                                active
                                    ? "text-indigo-600 bg-indigo-50"
                                    : "text-slate-500"
                            }`}
                        >
                            <Icon className="w-5 h-5 mb-0.5" />
                            {label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
