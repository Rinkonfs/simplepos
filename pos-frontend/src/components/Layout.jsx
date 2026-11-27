import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Maximize } from 'lucide-react';
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
    Truck,
    Wallet,
} from "lucide-react";
import { useStore } from "../context/StoreContext";

export default function Layout({ user, onLogout, children }) {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const { fetchSettings, modalMsg, closeNotify } = useStore();
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const changeLang = (lang) => {
        i18n.changeLanguage(lang);
        localStorage.setItem("lang", lang);
    };

    const navItems =
        user?.role === "shop"
            ? [{ to: "/shop", label: t("shop"), icon: Store }]
            : [
                  ...(user?.role !== "customer"
                      ? [
                            { to: "/pos", label: t("pos"), icon: ShoppingCart },
                            { to: "/stock", label: t("stock"), icon: Package },
                        ]
                      : []),
                  {
                      to: "/orders",
                      label:
                          user?.role === "customer"
                              ? t("my_orders")
                              : t("orders"),
                      icon: ClipboardList,
                  },
                  ...(user?.role === "super_admin"
                      ? [
                            {
                                to: "/reports",
                                label: t("reports"),
                                icon: BarChart3,
                            },
                        ]
                      : []),
                  { to: "/shop", label: t("shop"), icon: Store },
              ];

    const roleColors = {
        super_admin: "bg-purple-100 text-purple-700",
        seller: "bg-blue-100 text-blue-700",
        customer: "bg-emerald-100 text-emerald-700",
        shop: "bg-amber-100 text-amber-700",
    };
if (user?.role === 'shop') {
    const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              S
            </div>
            <span className="font-bold text-base text-slate-900">{t('app_name')} — Kiosk</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg">
              <Globe className="w-4 h-4 text-slate-500" />
              <select
                value={i18n.language}
                onChange={(e) => changeLang(e.target.value)}
                className="text-xs font-medium bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="en">EN</option>
                <option value="id">ID</option>
                <option value="bn">বাংলা</option>
              </select>
            </div>

            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-semibold"
              title="Toggle Fullscreen"
            >
              <Maximize className="w-4 h-4" /> Fullscreen
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" /> {t('logout')}
            </button>
          </div>
        </header>

        <main className="w-full p-3 sm:p-5">{children}</main>

        {modalMsg && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
              <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center font-bold text-xl ${modalMsg.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {modalMsg.type === 'error' ? '!' : '✓'}
              </div>
              <p className="text-sm font-medium text-slate-800">{modalMsg.text}</p>
              <button onClick={closeNotify} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold">OK</button>
            </div>
          </div>
        )}
      </div>
    );
  }

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
                                    {user.role !== "shop" && (
                                        <Link
                                            to="/profile"
                                            onClick={() => setMenuOpen(false)}
                                            className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl hover:bg-slate-50 text-slate-700"
                                        >
                                            <User className="w-4 h-4 text-indigo-600" />{" "}
                                            My Profile
                                        </Link>
                                    )}
                                    {user.role === "super_admin" && (
                                        <>
                                            <Link
                                                to="/vendors"
                                                onClick={() =>
                                                    setMenuOpen(false)
                                                }
                                                className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl hover:bg-slate-50 text-slate-700"
                                            >
                                                <Truck className="w-4 h-4 text-indigo-600" />{" "}
                                                Vendors & PO
                                            </Link>
                                            <Link
                                                to="/accounting"
                                                onClick={() =>
                                                    setMenuOpen(false)
                                                }
                                                className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl hover:bg-slate-50 text-slate-700"
                                            >
                                                <Wallet className="w-4 h-4 text-indigo-600" />{" "}
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

            {/* Global Notification Modal */}
            {modalMsg && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
                        <div
                            className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center font-bold text-xl ${
                                modalMsg.type === "error"
                                    ? "bg-red-100 text-red-600"
                                    : "bg-emerald-100 text-emerald-600"
                            }`}
                        >
                            {modalMsg.type === "error" ? "!" : "✓"}
                        </div>
                        <p className="text-sm font-medium text-slate-800">
                            {modalMsg.text}
                        </p>
                        <button
                            onClick={closeNotify}
                            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

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
