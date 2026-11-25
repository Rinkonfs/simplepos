import { useState } from "react";
import { Lock, Mail, ShoppingBag, User, KeyRound } from "lucide-react";
import api from "../api/axios";

export default function LoginPage({ onLogin }) {
    const [mode, setMode] = useState("login"); // 'login' | 'register' | 'forgot' | 'reset'
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setInfo("");
        setLoading(true);
        try {
            if (mode === "login" || mode === "register") {
                const endpoint = mode === "register" ? "/register" : "/login";
                const payload =
                    mode === "register"
                        ? { name, email, password }
                        : { email, password };
                const res = await api.post(endpoint, payload);
                localStorage.setItem("token", res.data.token);
                localStorage.setItem("user", JSON.stringify(res.data.user));
                onLogin(res.data.user);
            } else if (mode === "forgot") {
                const res = await api.post("/forgot-password", { email });
                setInfo(res.data.message);
                setMode("reset");
            } else if (mode === "reset") {
                const res = await api.post("/reset-password", {
                    email,
                    code,
                    password,
                    password_confirmation: passwordConfirm,
                });
                setInfo(res.data.message);
                setPassword("");
                setPasswordConfirm("");
                setCode("");
                setMode("login");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Request failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-100 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-5">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                        <ShoppingBag className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        StockPro POS
                    </h1>
                    <p className="text-sm text-slate-500">
                        {mode === "register"
                            ? "Create a Customer Account"
                            : mode === "forgot"
                              ? "Enter your email to receive a reset code"
                              : mode === "reset"
                                ? "Enter reset code & new password"
                                : "Sign in to manage stock, sales, or shop"}
                    </p>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl text-center">
                        {error}
                    </div>
                )}
                {info && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl text-center">
                        {info}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                    {mode === "register" && (
                        <div className="relative">
                            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            <input
                                type="text"
                                required
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-sm"
                            />
                        </div>
                    )}

                    <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                            type="email"
                            required
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-sm"
                        />
                    </div>

                    {mode === "reset" && (
                        <div className="relative">
                            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            <input
                                type="text"
                                required
                                placeholder="6-digit Reset Code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-sm"
                            />
                        </div>
                    )}

                    {(mode === "login" ||
                        mode === "register" ||
                        mode === "reset") && (
                        <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            <input
                                type="password"
                                required
                                placeholder={
                                    mode === "reset"
                                        ? "New Password"
                                        : "Password"
                                }
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-sm"
                            />
                        </div>
                    )}

                    {mode === "reset" && (
                        <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            <input
                                type="password"
                                required
                                placeholder="Confirm New Password"
                                value={passwordConfirm}
                                onChange={(e) =>
                                    setPasswordConfirm(e.target.value)
                                }
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-sm"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition disabled:opacity-60"
                    >
                        {loading
                            ? "Please wait..."
                            : mode === "register"
                              ? "Create Account"
                              : mode === "forgot"
                                ? "Send Reset Code"
                                : mode === "reset"
                                  ? "Reset Password"
                                  : "Sign In"}
                    </button>
                </form>

                <div className="flex flex-col gap-2 text-center text-sm pt-1">
                    {mode === "login" && (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    setMode("forgot");
                                    setError("");
                                    setInfo("");
                                }}
                                className="text-slate-500 text-xs hover:underline"
                            >
                                Forgot Password?
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setMode("register");
                                    setError("");
                                    setInfo("");
                                }}
                                className="text-indigo-600 font-semibold hover:underline"
                            >
                                New Customer? Sign Up here
                            </button>
                        </>
                    )}
                    {mode !== "login" && (
                        <button
                            type="button"
                            onClick={() => {
                                setMode("login");
                                setError("");
                                setInfo("");
                            }}
                            className="text-indigo-600 font-semibold hover:underline"
                        >
                            Back to Sign In
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
