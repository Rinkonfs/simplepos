import { useEffect, useState } from "react";
import { Trash2, Edit2 } from "lucide-react";
import api from "../api/axios";

const DEFAULT_AVATAR = "https://placehold.co/80x80/e2e8f0/64748b?text=User";

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        saved_address: "",
        password: "",
        role: "seller",
        photo: null,
    });

    const load = () => api.get("/users").then((r) => setUsers(r.data));
    useEffect(() => {
        load();
    }, []);

    const save = async (e) => {
        e.preventDefault();
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => {
            if (v !== null && v !== "") fd.append(k, v);
        });

        if (editingId) {
            await api.post(`/users/${editingId}`, fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
        } else {
            await api.post("/users", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
        }
        setEditingId(null);
        setForm({
            name: "",
            email: "",
            phone: "",
            saved_address: "",
            password: "",
            role: "seller",
            photo: null,
        });
        load();
    };

    const filtered = users.filter(
        (u) =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            (u.phone || "").includes(search),
    );

    return (
        <div className="space-y-6">
            <form
                onSubmit={save}
                className="bg-white p-5 rounded-2xl border shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3"
            >
                <input
                    required
                    placeholder="Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="p-2.5 border rounded-xl text-sm"
                />
                <input
                    required
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                    }
                    className="p-2.5 border rounded-xl text-sm"
                />
                <input
                    placeholder="Phone Number"
                    value={form.phone}
                    onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                    }
                    className="p-2.5 border rounded-xl text-sm"
                />
                <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="p-2.5 border rounded-xl text-sm"
                >
                    <option value="seller">Seller</option>
                    <option value="customer">Customer</option>
                    <option value="super_admin">Super Admin</option>
                </select>
                <input
                    placeholder="Address"
                    value={form.saved_address}
                    onChange={(e) =>
                        setForm({ ...form, saved_address: e.target.value })
                    }
                    className="p-2.5 border rounded-xl text-sm sm:col-span-2"
                />
                <input
                    type="password"
                    required={!editingId}
                    placeholder={
                        editingId ? "New Password (optional)" : "Password"
                    }
                    value={form.password}
                    onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                    }
                    className="p-2.5 border rounded-xl text-sm"
                />
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                        setForm({ ...form, photo: e.target.files[0] })
                    }
                    className="p-2 border rounded-xl text-xs"
                />
                <button
                    type="submit"
                    className="bg-indigo-600 text-white rounded-xl text-sm font-semibold py-2.5 sm:col-span-4"
                >
                    {editingId ? "Update User" : "Add User"}
                </button>
            </form>

            <input
                placeholder="Search users by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full p-3 bg-white border rounded-xl text-sm"
            />

            <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="p-3">Photo</th>
                            <th className="p-3">Name</th>
                            <th className="p-3">Email / Phone</th>
                            <th className="p-3">Address</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filtered.map((u) => (
                            <tr key={u.id}>
                                <td className="p-3">
                                    <img
                                        src={u.photo_url || DEFAULT_AVATAR}
                                        alt={u.name}
                                        className="w-9 h-9 rounded-full object-cover border"
                                    />
                                </td>
                                <td className="p-3 font-medium">{u.name}</td>
                                <td className="p-3 text-xs text-slate-500">
                                    <div>{u.email}</div>
                                    <div>{u.phone || "-"}</div>
                                </td>
                                <td className="p-3 text-xs text-slate-500">
                                    {u.saved_address || "-"}
                                </td>
                                <td className="p-3 uppercase text-xs font-semibold">
                                    {u.role}
                                </td>
                                <td className="p-3 flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingId(u.id);
                                            setForm({
                                                name: u.name,
                                                email: u.email,
                                                phone: u.phone || "",
                                                saved_address:
                                                    u.saved_address || "",
                                                password: "",
                                                role: u.role,
                                                photo: null,
                                            });
                                        }}
                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() =>
                                            api
                                                .delete(`/users/${u.id}`)
                                                .then(load)
                                        }
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
