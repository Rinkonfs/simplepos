import { useState } from "react";
import { Lock, Mail, ShoppingBag, User } from "lucide-react";
import api from "../api/axios";

export default function LoginPage({ onLogin }) {
    const [isRegister, setIsRegister] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("admin@pos.test");
    const [password, setPassword] = useState("password");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const endpoint = isRegister ? "/register" : "/login";
            const payload = isRegister
                ? { name, email, password }
                : { email, password };
            const res = await api.post(endpoint, payload);
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));
            onLogin(res.data.user);
        } catch (err) {
            setError(err.response?.data?.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-100 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                        <ShoppingBag className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        StockPro POS
                    </h1>
                    <p className="text-sm text-slate-500">
                        {isRegister
                            ? "Create a Customer Account"
                            : "Sign in to manage stock, sales, or shop"}
                    </p>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                        <div className="relative">
                            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                            <input
                                type="text"
                                required
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                        <input
                            type="password"
                            required
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition disabled:opacity-60"
                    >
                        {loading
                            ? "Please wait..."
                            : isRegister
                              ? "Create Customer Account"
                              : "Sign In"}
                    </button>
                </form>

                <div className="text-center text-sm">
                    <button
                        type="button"
                        onClick={() => {
                            setIsRegister(!isRegister);
                            setError("");
                            if (!isRegister) {
                                setEmail("");
                                setPassword("");
                            }
                        }}
                        className="text-indigo-600 font-semibold hover:underline"
                    >
                        {isRegister
                            ? "Already have an account? Sign In"
                            : "New Customer? Sign Up here"}
                    </button>
                </div>
            </div>
        </div>
    );
}
