import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, Edit2, Tag, DollarSign } from "lucide-react";
import api from "../api/axios";
import { useStore } from "../context/StoreContext";

export default function SettingsPage() {
    const { t } = useTranslation();
    const {
        categories,
        currency,
        fetchCategories,
        fetchSettings,
        customers,
        fetchCustomers,
    } = useStore();

    const [currForm, setCurrForm] = useState(currency);

    const [catName, setCatName] = useState("");
    const [parentId, setParentId] = useState("");
    const [catSearch, setCatSearch] = useState("");
    const [editingCat, setEditingCat] = useState(null);

    const [discounts, setDiscounts] = useState([]);
    const [discForm, setDiscForm] = useState({
        code: "",
        type: "percentage",
        value: "",
        max_discount_amount: "",
        expires_at: "",
        max_uses: "",
        customer_id: "",
        category_id: "",
    });

    const loadDiscounts = () =>
        api.get("/discount-codes").then((r) => setDiscounts(r.data));

    useEffect(() => {
        fetchCategories();
        fetchSettings();
        fetchCustomers();
        loadDiscounts();
    }, [fetchCategories, fetchSettings, fetchCustomers]);

    useEffect(() => {
        setCurrForm(currency);
    }, [currency]);

    const saveCurrency = async (e) => {
        e.preventDefault();
        await api.put("/settings", currForm);
        await fetchSettings(true);
        alert("Currency updated!");
    };

    const saveCategory = async (e) => {
        e.preventDefault();
        const payload = { name: catName, parent_id: parentId || null };
        if (editingCat) {
            await api.put(`/categories/${editingCat.id}`, payload);
            setEditingCat(null);
        } else {
            await api.post("/categories", payload);
        }
        setCatName("");
        setParentId("");
        fetchCategories(true);
    };

    const saveDiscount = async (e) => {
        e.preventDefault();
        await api.post("/discount-codes", {
            ...discForm,
            max_discount_amount: discForm.max_discount_amount || null,
            expires_at: discForm.expires_at || null,
            max_uses: discForm.max_uses || null,
            customer_id: discForm.customer_id || null,
            category_id: discForm.category_id || null,
        });
        setDiscForm({
            code: "",
            type: "percentage",
            value: "",
            max_discount_amount: "",
            expires_at: "",
            max_uses: "",
            customer_id: "",
            category_id: "",
        });
        loadDiscounts();
    };

    const filteredCats = categories.filter((c) =>
        c.name.toLowerCase().includes(catSearch.toLowerCase()),
    );

    return (
        <div className="space-y-6">
            {/* Currency Settings */}
            <form
                onSubmit={saveCurrency}
                className="bg-white p-5 rounded-2xl border shadow-sm flex flex-wrap items-end gap-3"
            >
                <div className="font-bold text-base flex items-center gap-2 w-full">
                    <DollarSign className="w-5 h-5 text-indigo-600" /> Currency
                    Settings
                </div>
                <div>
                    <label className="block text-xs text-slate-500 mb-1">
                        Currency Preset
                    </label>
                    <select
                        value={`${currForm.currency_code}|${currForm.currency_symbol}`}
                        onChange={(e) => {
                            const [code, symbol] = e.target.value.split("|");
                            setCurrForm({
                                currency_code: code,
                                currency_symbol: symbol,
                            });
                        }}
                        className="p-2.5 border rounded-xl text-sm"
                    >
                        <option value="USD|$">USD ($)</option>
                        <option value="IDR|Rp">IDR (Rp)</option>
                        <option value="BDT|৳">BDT (৳)</option>
                        <option value="EUR|€">EUR (€)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-slate-500 mb-1">
                        Symbol
                    </label>
                    <input
                        value={currForm.currency_symbol}
                        onChange={(e) =>
                            setCurrForm({
                                ...currForm,
                                currency_symbol: e.target.value,
                            })
                        }
                        className="w-24 p-2.5 border rounded-xl text-sm"
                    />
                </div>
                <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
                >
                    Save Currency
                </button>
            </form>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Categories & Sub-Categories */}
                <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
                    <h2 className="font-bold text-lg">
                        {t("category_settings")}
                    </h2>
                    <form
                        onSubmit={saveCategory}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                    >
                        <input
                            required
                            placeholder={t("category_name")}
                            value={catName}
                            onChange={(e) => setCatName(e.target.value)}
                            className="p-2.5 border rounded-xl text-sm"
                        />
                        <select
                            value={parentId}
                            onChange={(e) => setParentId(e.target.value)}
                            className="p-2.5 border rounded-xl text-sm"
                        >
                            <option value="">Main Category</option>
                            {categories
                                .filter((c) => !c.parent_id)
                                .map((c) => (
                                    <option key={c.id} value={c.id}>
                                        Sub of: {c.name}
                                    </option>
                                ))}
                        </select>
                        <button
                            type="submit"
                            className="bg-indigo-600 text-white rounded-xl text-sm font-semibold py-2.5"
                        >
                            {editingCat ? t("update") : t("add")}
                        </button>
                    </form>

                    <input
                        placeholder="Search categories..."
                        value={catSearch}
                        onChange={(e) => setCatSearch(e.target.value)}
                        className="w-full p-2 border rounded-xl text-xs bg-slate-50"
                    />

                    <div className="divide-y max-h-72 overflow-y-auto">
                        {filteredCats.map((c) => (
                            <div
                                key={c.id}
                                className="py-2.5 flex justify-between items-center text-sm"
                            >
                                <span className="font-medium">
                                    {c.parent ? (
                                        <span className="text-slate-400">
                                            {c.parent.name} &rsaquo;{" "}
                                        </span>
                                    ) : (
                                        ""
                                    )}
                                    {c.name}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingCat(c);
                                            setCatName(c.name);
                                            setParentId(c.parent_id || "");
                                        }}
                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() =>
                                            api
                                                .delete(`/categories/${c.id}`)
                                                .then(() =>
                                                    fetchCategories(true),
                                                )
                                        }
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Advanced Discount Codes */}
                <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <Tag className="w-5 h-5 text-indigo-600" />{" "}
                        {t("discount_codes")}
                    </h2>
                    <form
                        onSubmit={saveDiscount}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                    >
                        <input
                            required
                            placeholder="CODE"
                            value={discForm.code}
                            onChange={(e) =>
                                setDiscForm({
                                    ...discForm,
                                    code: e.target.value.toUpperCase(),
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm uppercase"
                        />
                        <select
                            value={discForm.type}
                            onChange={(e) =>
                                setDiscForm({
                                    ...discForm,
                                    type: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        >
                            <option value="percentage">
                                {t("percentage")}
                            </option>
                            <option value="fixed">{t("fixed")}</option>
                        </select>
                        <input
                            required
                            type="number"
                            step="0.01"
                            placeholder={t("value")}
                            value={discForm.value}
                            onChange={(e) =>
                                setDiscForm({
                                    ...discForm,
                                    value: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        />
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Max Discount Limit (optional)"
                            value={discForm.max_discount_amount}
                            onChange={(e) =>
                                setDiscForm({
                                    ...discForm,
                                    max_discount_amount: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        />
                        <input
                            type="number"
                            placeholder="Max Uses (optional)"
                            value={discForm.max_uses}
                            onChange={(e) =>
                                setDiscForm({
                                    ...discForm,
                                    max_uses: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        />
                        <input
                            type="date"
                            value={discForm.expires_at}
                            onChange={(e) =>
                                setDiscForm({
                                    ...discForm,
                                    expires_at: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        />
                        <select
                            value={discForm.customer_id}
                            onChange={(e) =>
                                setDiscForm({
                                    ...discForm,
                                    customer_id: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        >
                            <option value="">All Customers</option>
                            {customers.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <select
                            value={discForm.category_id}
                            onChange={(e) =>
                                setDiscForm({
                                    ...discForm,
                                    category_id: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        >
                            <option value="">All Categories</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            className="bg-emerald-600 text-white rounded-xl text-sm font-semibold py-2.5 sm:col-span-2"
                        >
                            {t("add_code")}
                        </button>
                    </form>

                    <div className="divide-y max-h-60 overflow-y-auto">
                        {discounts.map((d) => (
                            <div
                                key={d.id}
                                className="py-2.5 flex justify-between items-center text-xs"
                            >
                                <div>
                                    <span className="font-mono font-bold text-indigo-600 text-sm">
                                        {d.code}
                                    </span>
                                    <span className="text-slate-500 ml-2">
                                        (
                                        {d.type === "percentage"
                                            ? `${d.value}%`
                                            : `${currency.currency_symbol}${d.value}`}
                                        {d.max_discount_amount
                                            ? ` • Max: ${currency.currency_symbol}${d.max_discount_amount}`
                                            : ""}
                                        )
                                    </span>
                                    <div className="text-slate-400">
                                        Used: {d.used_count}
                                        {d.max_uses ? `/${d.max_uses}` : ""} •
                                        Exp:{" "}
                                        {d.expires_at
                                            ? d.expires_at.slice(0, 10)
                                            : "Never"}
                                        {d.customer && ` • ${d.customer.name}`}
                                        {d.category && ` • ${d.category.name}`}
                                    </div>
                                </div>
                                <button
                                    onClick={() =>
                                        api
                                            .delete(`/discount-codes/${d.id}`)
                                            .then(loadDiscounts)
                                    }
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
