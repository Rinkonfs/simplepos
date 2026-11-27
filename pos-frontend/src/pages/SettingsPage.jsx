import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Trash2,
    Edit2,
    Tag,
    DollarSign,
    Mail,
    MessageSquare,
    Download,
    Upload,
    Database,
    Users,
} from "lucide-react";
import api from "../api/axios";
import { useStore } from "../context/StoreContext";

export default function SettingsPage() {
    const { t } = useTranslation();
    const {
        categories,
        currency,
        fetchCategories,
        fetchSettings,
        fetchProducts,
        customers,
        fetchCustomers,
        notify,
    } = useStore();

    const [currForm, setCurrForm] = useState({
        currency_symbol: "$",
        currency_code: "USD",
        enable_grade_class: false,
        enable_student_id: false,
        enable_card_number: false,
        mail_host: "",
        mail_port: "587",
        mail_username: "",
        mail_password: "",
        mail_encryption: "tls",
        mail_from_address: "",
        mail_from_name: "StockPro POS",
        sms_provider: "custom_http",
        sms_api_url: "",
        sms_api_key: "",
        sms_sender_id: "",
    });

    const [backupFile, setBackupFile] = useState(null);
    const [userFile, setUserFile] = useState(null);

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
        fetchCustomers();
        loadDiscounts();
        api.get("/settings/full").then((r) =>
            setCurrForm((prev) => ({ ...prev, ...r.data })),
        );
    }, [fetchCategories, fetchCustomers]);

    const saveSettings = async (e) => {
        e.preventDefault();
        try {
            const res = await api.put("/settings", currForm);
            setCurrForm((prev) => ({ ...prev, ...res.data }));
            await fetchSettings(true);
            notify("Settings saved successfully!", "success");
        } catch (err) {
            notify(
                err.response?.data?.message || "Failed to save settings",
                "error",
            );
        }
    };

    const handleExportAll = async () => {
        try {
            const res = await api.get("/backup/export");
            const blob = new Blob([JSON.stringify(res.data, null, 2)], {
                type: "application/json",
            });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `stockpro-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            notify("All system data exported!", "success");
        } catch (err) {
            notify(err.response?.data?.message || "Export failed", "error");
        }
    };

    const handleImportAll = async (e) => {
        e.preventDefault();
        if (!backupFile) return;
        if (
            !window.confirm(
                "This will replace existing Stock, Orders, Vendors, POs, Reports, & Accounting data with the backup file. Continue?",
            )
        ) {
            return;
        }
        try {
            const fd = new FormData();
            fd.append("file", backupFile);
            const res = await api.post("/backup/import", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setBackupFile(null);
            await Promise.all([
                fetchProducts(true),
                fetchCategories(true),
                fetchSettings(true),
                loadDiscounts(),
            ]);
            notify(res.data.message || "Full backup imported!", "success");
        } catch (err) {
            notify(err.response?.data?.message || "Import failed", "error");
        }
    };

    const handleWipeAllData = async () => {
        if (
            !window.confirm(
                "WARNING: This will DELETE all Stock, Orders, Reports, Vendors, POs, Categories, Discounts & Accounting data (Users will be KEPT). Continue?",
            )
        ) {
            return;
        }
        try {
            const res = await api.delete("/backup/wipe-data");
            await Promise.all([
                fetchProducts(true),
                fetchCategories(true),
                loadDiscounts(),
            ]);
            notify(res.data.message, "success");
        } catch (err) {
            notify(
                err.response?.data?.message || "Failed to delete data",
                "error",
            );
        }
    };

    const handleBulkImportUsers = async (e) => {
        e.preventDefault();
        if (!userFile) return;
        try {
            const fd = new FormData();
            fd.append("file", userFile);
            const res = await api.post("/users/bulk-import", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setUserFile(null);
            await fetchCustomers(true);
            notify(res.data.message, "success");
        } catch (err) {
            notify(
                err.response?.data?.message || "User import failed",
                "error",
            );
        }
    };

    const handleDeleteAllUsers = async () => {
        if (
            !window.confirm(
                "WARNING: This will DELETE ALL users except your current Super Admin account. Continue?",
            )
        ) {
            return;
        }
        try {
            const res = await api.delete("/users-all");
            await fetchCustomers(true);
            notify(res.data.message, "success");
        } catch (err) {
            notify(
                err.response?.data?.message || "Failed to delete users",
                "error",
            );
        }
    };

    const downloadUserDemoCsv = () => {
        const csv =
            "name,email,phone,role,password,saved_address,grade_class,student_id,card_number\n" +
            "John Student,john@school.test,01700000001,customer,123456,Dhaka,Grade 10,STU-101,CARD-9001\n" +
            "Store Kiosk,kiosk@pos.test,,shop,123456,,,,\n";
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = "users-demo-template.csv";
        a.click();
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
            {/* System, Currency, Email SMTP, & SMS Gateway Settings */}
            <form
                onSubmit={saveSettings}
                className="bg-white p-5 rounded-2xl border shadow-sm space-y-6"
            >
                <div className="space-y-4">
                    <div className="font-bold text-base flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-indigo-600" />{" "}
                        System & Currency Settings
                    </div>

                    <div className="flex flex-wrap items-end gap-3">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">
                                Currency Preset
                            </label>
                            <select
                                value={`${currForm.currency_code}|${currForm.currency_symbol}`}
                                onChange={(e) => {
                                    const [code, symbol] =
                                        e.target.value.split("|");
                                    setCurrForm({
                                        ...currForm,
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
                                value={currForm.currency_symbol || "$"}
                                onChange={(e) =>
                                    setCurrForm({
                                        ...currForm,
                                        currency_symbol: e.target.value,
                                    })
                                }
                                className="w-24 p-2.5 border rounded-xl text-sm"
                            />
                        </div>
                    </div>

                    <div className="pt-3 border-t space-y-2">
                        <div className="text-xs font-bold text-slate-600 uppercase">
                            Optional User Details (Unlock for Users & POS/Shop
                            Search)
                        </div>
                        <div className="flex flex-wrap gap-5 text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!currForm.enable_grade_class}
                                    onChange={(e) =>
                                        setCurrForm({
                                            ...currForm,
                                            enable_grade_class:
                                                e.target.checked,
                                        })
                                    }
                                    className="w-4 h-4 accent-indigo-600"
                                />
                                Enable Grade / Class
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!currForm.enable_student_id}
                                    onChange={(e) =>
                                        setCurrForm({
                                            ...currForm,
                                            enable_student_id: e.target.checked,
                                        })
                                    }
                                    className="w-4 h-4 accent-indigo-600"
                                />
                                Enable Student ID Number
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!currForm.enable_card_number}
                                    onChange={(e) =>
                                        setCurrForm({
                                            ...currForm,
                                            enable_card_number:
                                                e.target.checked,
                                        })
                                    }
                                    className="w-4 h-4 accent-indigo-600"
                                />
                                Enable Card Number
                            </label>
                        </div>
                    </div>
                </div>

                {/* Email (SMTP) Configuration */}
                <div className="pt-4 border-t space-y-3">
                    <div className="font-bold text-base flex items-center gap-2">
                        <Mail className="w-5 h-5 text-indigo-600" /> Email
                        (SMTP) Configuration
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                            placeholder="SMTP Host (e.g. smtp.gmail.com)"
                            value={currForm.mail_host || ""}
                            onChange={(e) =>
                                setCurrForm({
                                    ...currForm,
                                    mail_host: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        />
                        <input
                            placeholder="Port (e.g. 587)"
                            value={currForm.mail_port || ""}
                            onChange={(e) =>
                                setCurrForm({
                                    ...currForm,
                                    mail_port: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        />
                        <select
                            value={currForm.mail_encryption || "tls"}
                            onChange={(e) =>
                                setCurrForm({
                                    ...currForm,
                                    mail_encryption: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        >
                            <option value="tls">TLS</option>
                            <option value="ssl">SSL</option>
                            <option value="none">None</option>
                        </select>
                        <input
                            placeholder="SMTP Username"
                            value={currForm.mail_username || ""}
                            onChange={(e) =>
                                setCurrForm({
                                    ...currForm,
                                    mail_username: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        />
                        <input
                            type="password"
                            placeholder="SMTP Password / App Key"
                            value={currForm.mail_password || ""}
                            onChange={(e) =>
                                setCurrForm({
                                    ...currForm,
                                    mail_password: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        />
                        <input
                            placeholder="From Email Address"
                            value={currForm.mail_from_address || ""}
                            onChange={(e) =>
                                setCurrForm({
                                    ...currForm,
                                    mail_from_address: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        />
                        <input
                            placeholder="From Name"
                            value={currForm.mail_from_name || ""}
                            onChange={(e) =>
                                setCurrForm({
                                    ...currForm,
                                    mail_from_name: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm sm:col-span-3"
                        />
                    </div>
                </div>

                {/* SMS Gateway Configuration */}
                <div className="pt-4 border-t space-y-3">
                    <div className="font-bold text-base flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-emerald-600" />{" "}
                        SMS Gateway Configuration
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <select
                            value={currForm.sms_provider || "custom_http"}
                            onChange={(e) =>
                                setCurrForm({
                                    ...currForm,
                                    sms_provider: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        >
                            <option value="custom_http">Custom HTTP API</option>
                            <option value="sslwireless">
                                SSLWireless (BD)
                            </option>
                            <option value="bulksmsbd">BulkSMS BD</option>
                            <option value="twilio">Twilio</option>
                        </select>
                        <input
                            placeholder="SMS API URL"
                            value={currForm.sms_api_url || ""}
                            onChange={(e) =>
                                setCurrForm({
                                    ...currForm,
                                    sms_api_url: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm sm:col-span-2"
                        />
                        <input
                            placeholder="Sender ID"
                            value={currForm.sms_sender_id || ""}
                            onChange={(e) =>
                                setCurrForm({
                                    ...currForm,
                                    sms_sender_id: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        />
                        <input
                            type="password"
                            placeholder="API Key / Token"
                            value={currForm.sms_api_key || ""}
                            onChange={(e) =>
                                setCurrForm({
                                    ...currForm,
                                    sms_api_key: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm sm:col-span-4"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold"
                >
                    Save All Settings
                </button>
            </form>

            {/* One-Click Full System Export, Import, & Safe Wipe */}
            <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
                <div className="font-bold text-base flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-600" /> One-Click
                    Full Data Backup, Restore, & Reset
                </div>
                <p className="text-xs text-slate-500">
                    Exports, imports, or safely deletes all{" "}
                    <strong>
                        Stock, Orders, Stock Logs (Reports), Vendors, Purchase
                        Orders, Accounting Payments, Categories, & Discounts
                    </strong>
                    .
                </p>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={handleExportAll}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" /> Export All Data
                        (1-Click)
                    </button>

                    <form
                        onSubmit={handleImportAll}
                        className="flex flex-wrap items-center gap-2"
                    >
                        <input
                            type="file"
                            accept=".json"
                            onChange={(e) => setBackupFile(e.target.files[0])}
                            className="text-xs border rounded-xl p-2 bg-slate-50"
                        />
                        <button
                            type="submit"
                            disabled={!backupFile}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                        >
                            <Upload className="w-4 h-4" /> Import All Data
                        </button>
                    </form>

                    <button
                        type="button"
                        onClick={handleWipeAllData}
                        className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" /> Delete All Data (Keep
                        Users)
                    </button>
                </div>
            </div>

            {/* Bulk User Management (Import / Delete Users) */}
            <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="font-bold text-base flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" /> Bulk User
                        Management (Import / Delete Users)
                    </div>
                    <button
                        type="button"
                        onClick={downloadUserDemoCsv}
                        className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1"
                    >
                        <Download className="w-3.5 h-3.5" /> User CSV Template
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <form
                        onSubmit={handleBulkImportUsers}
                        className="flex flex-wrap items-center gap-2"
                    >
                        <input
                            type="file"
                            accept=".csv,.txt"
                            onChange={(e) => setUserFile(e.target.files[0])}
                            className="text-xs border rounded-xl p-2 bg-slate-50"
                        />
                        <button
                            type="submit"
                            disabled={!userFile}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                        >
                            <Upload className="w-4 h-4" /> Import Users (CSV)
                        </button>
                    </form>

                    <button
                        type="button"
                        onClick={handleDeleteAllUsers}
                        className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" /> Delete All Users (Keep
                        Me)
                    </button>
                </div>
            </div>

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
