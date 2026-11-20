import { useState } from "react";
import { Lock, MapPin, Phone, User } from "lucide-react";
import api from "../api/axios";

export default function ProfilePage({ user, onUserUpdate }) {
    const [form, setForm] = useState({
        name: user.name || "",
        phone: user.phone || "",
        saved_address: user.saved_address || "",
        password: "",
        password_confirmation: "",
        photo: null,
    });
    const [msg, setMsg] = useState({ text: "", type: "" });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg({ text: "", type: "" });
        try {
            const fd = new FormData();
            fd.append("name", form.name);
            fd.append("phone", form.phone);
            fd.append("saved_address", form.saved_address);
            if (form.password) {
                fd.append("password", form.password);
                fd.append("password_confirmation", form.password_confirmation);
            }
            if (form.photo) fd.append("photo", form.photo);

            const res = await api.post("/profile", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            localStorage.setItem("user", JSON.stringify(res.data));
            onUserUpdate(res.data);
            setForm((prev) => ({
                ...prev,
                password: "",
                password_confirmation: "",
                photo: null,
            }));
            setMsg({ text: "Profile updated successfully!", type: "success" });
        } catch (err) {
            setMsg({
                text: err.response?.data?.message || "Update failed",
                type: "error",
            });
        }
    };

    return (
        <div className="max-w-lg mx-auto bg-white p-6 rounded-2xl border shadow-sm space-y-4">
            <h2 className="font-bold text-lg text-slate-900">My Profile</h2>

            {msg.text && (
                <div
                    className={`p-3 rounded-xl text-sm border ${msg.type === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}
                >
                    {msg.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                        required
                        placeholder="Full Name"
                        value={form.name}
                        onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                        }
                        className="w-full pl-9 p-2.5 border rounded-xl text-sm"
                    />
                </div>

                <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                        placeholder="Phone Number"
                        value={form.phone}
                        onChange={(e) =>
                            setForm({ ...form, phone: e.target.value })
                        }
                        className="w-full pl-9 p-2.5 border rounded-xl text-sm"
                    />
                </div>

                <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <textarea
                        placeholder="Saved Delivery Address"
                        value={form.saved_address}
                        onChange={(e) =>
                            setForm({ ...form, saved_address: e.target.value })
                        }
                        className="w-full pl-9 p-2.5 border rounded-xl text-sm"
                        rows={2}
                    />
                </div>

                <div>
                    <label className="block text-xs text-slate-500 mb-1">
                        Profile Photo (optional)
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                            setForm({ ...form, photo: e.target.files[0] })
                        }
                        className="w-full text-xs border rounded-xl p-2"
                    />
                </div>

                <div className="border-t pt-3 space-y-3">
                    <p className="text-xs text-slate-500 font-semibold">
                        Change Password (leave blank to keep current)
                    </p>
                    <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                            type="password"
                            placeholder="New Password"
                            value={form.password}
                            onChange={(e) =>
                                setForm({ ...form, password: e.target.value })
                            }
                            className="w-full pl-9 p-2.5 border rounded-xl text-sm"
                        />
                    </div>
                    <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                            type="password"
                            placeholder="Confirm New Password"
                            value={form.password_confirmation}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    password_confirmation: e.target.value,
                                })
                            }
                            className="w-full pl-9 p-2.5 border rounded-xl text-sm"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold"
                >
                    Save Profile
                </button>
            </form>
        </div>
    );
}
