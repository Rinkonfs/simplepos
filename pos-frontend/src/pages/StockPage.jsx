import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import {
    Download,
    Edit2,
    Plus,
    Trash2,
    Upload,
    QrCode,
    X,
    Printer,
} from "lucide-react";
import api from "../api/axios";
import { useStore } from "../context/StoreContext";

const DEFAULT_IMG = "https://placehold.co/120x120/e2e8f0/64748b?text=No+Photo";

export default function StockPage({ user }) {
    const { t } = useTranslation();
    const { products, categories, currency, fetchProducts, fetchCategories } =
        useStore();
    const sym = currency.currency_symbol;

    const [tab, setTab] = useState("stock"); // 'stock' | 'logs'
    const [vendors, setVendors] = useState([]);
    const [logs, setLogs] = useState([]);
    const [editingLog, setEditingLog] = useState(null);

    const [search, setSearch] = useState("");
    const [photoFilter, setPhotoFilter] = useState("all");
    const [editingId, setEditingId] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [batchForm, setBatchForm] = useState({
        label: "",
        cost_price: "",
        sell_price: "",
        stock_qty: "",
    });

    const [form, setForm] = useState({
        category_id: "",
        vendor_id: "",
        sku: "",
        name: "",
        unit: "pcs",
        cost_price: "",
        sell_price: "",
        stock_qty: "",
        low_stock_alert: 5,
        max_purchase_qty: "",
        bulk_min_qty: "",
        bulk_price: "",
        image: null,
    });
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState({ text: "", type: "" });

    const barcodeRef = useRef(null);
    const qrRef = useRef(null);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
        api.get("/vendors").then((r) => setVendors(r.data));
        if (user?.role === "super_admin") {
            api.get("/stock-movements").then((r) => setLogs(r.data));
        }
    }, [fetchProducts, fetchCategories, user?.role]);

    const downloadCsv = (filename, headers, rows) => {
        const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const csv = [
            headers.join(","),
            ...rows.map((r) => r.map(escape).join(",")),
        ].join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(
            new Blob([csv], { type: "text/csv;charset=utf-8;" }),
        );
        a.download = filename;
        a.click();
    };

    const exportAllProducts = () => {
        downloadCsv(
            `all-stock-products-${new Date().toISOString().slice(0, 10)}.csv`,
            [
                "SKU",
                "Name",
                "Category",
                "Vendor",
                "Unit",
                "Cost Price",
                "Sell Price",
                "Stock Qty",
                "Low Stock Alert",
                "Max Purchase Qty",
                "Bulk Min Qty",
                "Bulk Price",
            ],
            products.map((p) => [
                p.sku,
                p.name,
                p.category?.name || "",
                p.vendor?.name || "",
                p.unit,
                p.cost_price,
                p.sell_price,
                p.stock_qty,
                p.low_stock_alert,
                p.max_purchase_qty || "",
                p.bulk_min_qty || "",
                p.bulk_price || "",
            ]),
        );
    };

    const exportStockLogs = () => {
        downloadCsv(
            `stock-change-logs-${new Date().toISOString().slice(0, 10)}.csv`,
            ["Date", "SKU", "Product", "User", "Type", "Quantity", "Reference"],
            logs.map((l) => [
                new Date(l.created_at).toLocaleString(),
                l.product?.sku || "",
                l.product?.name || "",
                l.user?.name || "",
                l.type.toUpperCase(),
                l.quantity,
                l.reference || "",
            ]),
        );
    };

    const skuMatches =
        form.sku && !editingId
            ? products.filter(
                  (p) =>
                      p.sku.toLowerCase().includes(form.sku.toLowerCase()) &&
                      p.sku.toLowerCase() !== form.sku.toLowerCase(),
              )
            : [];

    const selectSkuSuggestion = (p) => {
        setForm({
            category_id: p.category_id || "",
            vendor_id: p.vendor_id || "",
            sku: p.sku,
            name: p.name,
            unit: p.unit || "pcs",
            cost_price: p.cost_price,
            sell_price: p.sell_price,
            stock_qty: "",
            low_stock_alert: p.low_stock_alert,
            max_purchase_qty: p.max_purchase_qty || "",
            bulk_min_qty: p.bulk_min_qty || "",
            bulk_price: p.bulk_price || "",
            image: null,
        });
    };

    const resetForm = () => {
        setEditingId(null);
        setForm({
            category_id: "",
            vendor_id: "",
            sku: "",
            name: "",
            unit: "pcs",
            cost_price: "",
            sell_price: "",
            stock_qty: "",
            low_stock_alert: 5,
            max_purchase_qty: "",
            bulk_min_qty: "",
            bulk_price: "",
            image: null,
        });
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        setMessage({ text: "", type: "" });
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => {
                if (v !== null && v !== "") fd.append(k, v);
            });

            if (editingId) {
                await api.post(`/products/${editingId}`, fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                setMessage({ text: "Product updated!", type: "success" });
            } else {
                await api.post("/products", fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                setMessage({ text: "Stock saved!", type: "success" });
            }
            resetForm();
            fetchProducts(true);
        } catch (err) {
            setMessage({
                text: err.response?.data?.message || "Failed to save product",
                type: "error",
            });
        }
    };

    const handleAddBatch = async (e) => {
        e.preventDefault();
        const res = await api.post(
            `/products/${selectedProduct.id}/batches`,
            batchForm,
        );
        setSelectedProduct(res.data);
        setBatchForm({
            label: "",
            cost_price: "",
            sell_price: "",
            stock_qty: "",
        });
        fetchProducts(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this product?")) return;
        await api.delete(`/products/${id}`);
        fetchProducts(true);
    };

    const handleBulkUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        try {
            const fd = new FormData();
            fd.append("file", file);
            await api.post("/products/bulk-upload", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setFile(null);
            setMessage({ text: "Bulk CSV/Excel imported!", type: "success" });
            fetchProducts(true);
            fetchCategories(true);
        } catch (err) {
            setMessage({
                text: err.response?.data?.message || "Bulk upload failed",
                type: "error",
            });
        }
    };

    const filteredProducts = products.filter((p) => {
        const q = search.toLowerCase();
        const matchText =
            p.sku.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            (p.category?.name || "").toLowerCase().includes(q) ||
            (p.vendor?.name || "").toLowerCase().includes(q) ||
            String(p.cost_price).includes(q) ||
            String(p.sell_price).includes(q) ||
            String(p.stock_qty).includes(q);
        const matchPhoto =
            photoFilter === "all" ||
            (photoFilter === "with" ? !!p.image_url : !p.image_url);
        return matchText && matchPhoto;
    });

    const handlePrint = (mode) => {
        if (!selectedProduct) return;
        const barcodeHtml =
            mode !== "qr" && barcodeRef.current
                ? barcodeRef.current.innerHTML
                : "";
        const qrHtml =
            mode !== "barcode" && qrRef.current ? qrRef.current.innerHTML : "";
        let pageCss = "";
        if (mode === "barcode") {
            pageCss = `@page{size:38mm 25mm;margin:0}body{width:38mm;height:25mm;padding:2.5mm 3.8mm;box-sizing:border-box;margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}.title,.price{font-size:7pt;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}.box{width:100%;display:flex;justify-content:center}.box svg{width:100%;height:auto;max-height:13mm}`;
        } else if (mode === "qr") {
            pageCss = `@page{size:20mm 20mm;margin:0}body{width:20mm;height:20mm;padding:1mm;box-sizing:border-box;margin:0;display:flex;align-items:center;justify-content:center;overflow:hidden}.title,.price,span{display:none}.box svg{width:18mm;height:18mm}`;
        } else {
            pageCss = `body{font-family:sans-serif;text-align:center;padding:20px}.box{margin:12px auto}`;
        }
        const win = window.open("", "_blank", "width=400,height=500");
        win.document.write(
            `<html><head><title>${selectedProduct.sku}</title><style>*{box-sizing:border-box}body{font-family:sans-serif;text-align:center}${pageCss}</style></head><body><div class="title">${selectedProduct.name}</div><div class="price">${sym}${selectedProduct.sell_price}</div>${barcodeHtml ? `<div class="box">${barcodeHtml}</div>` : ""}${qrHtml ? `<div class="box">${qrHtml}</div>` : ""}<script>window.onload=()=>{window.print();window.close()}</script></body></html>`,
        );
        win.document.close();
    };

    return (
        <div className="space-y-6">
            {user?.role === "super_admin" && (
                <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setTab("stock")}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold ${tab === "stock" ? "bg-indigo-600 text-white" : "bg-white border"}`}
                        >
                            Stock Inventory
                        </button>
                        <button
                            onClick={() => setTab("logs")}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold ${tab === "logs" ? "bg-indigo-600 text-white" : "bg-white border"}`}
                        >
                            Stock Change Logs
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={exportAllProducts}
                            className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                        >
                            <Download className="w-3.5 h-3.5" /> Download All
                            Stock
                        </button>
                        <button
                            onClick={exportStockLogs}
                            className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                        >
                            <Download className="w-3.5 h-3.5" /> Download Stock
                            Logs
                        </button>
                    </div>
                </div>
            )}

            {tab === "logs" && user?.role === "super_admin" ? (
                <div className="bg-white rounded-2xl border overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3">Product</th>
                                <th className="p-3">User</th>
                                <th className="p-3">Type</th>
                                <th className="p-3">Qty</th>
                                <th className="p-3">Reference</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {logs.map((l) => (
                                <tr key={l.id}>
                                    <td className="p-3 text-xs text-slate-500">
                                        {new Date(
                                            l.created_at,
                                        ).toLocaleString()}
                                    </td>
                                    <td className="p-3 font-medium">
                                        {l.product?.name} ({l.product?.sku})
                                    </td>
                                    <td className="p-3 text-xs">
                                        {l.user?.name}
                                    </td>
                                    <td className="p-3 uppercase font-bold text-xs">
                                        {l.type}
                                    </td>
                                    <td className="p-3 font-semibold">
                                        {l.quantity}
                                    </td>
                                    <td className="p-3 text-xs text-slate-500">
                                        {l.reference}
                                    </td>
                                    <td className="p-3 flex gap-1">
                                        <button
                                            onClick={() =>
                                                setEditingLog({ ...l })
                                            }
                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() =>
                                                api
                                                    .delete(
                                                        `/stock-movements/${l.id}`,
                                                    )
                                                    .then(() =>
                                                        api
                                                            .get(
                                                                "/stock-movements",
                                                            )
                                                            .then((r) =>
                                                                setLogs(r.data),
                                                            ),
                                                    )
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
                    {editingLog && (
                        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    await api.put(
                                        `/stock-movements/${editingLog.id}`,
                                        editingLog,
                                    );
                                    setEditingLog(null);
                                    api.get("/stock-movements").then((r) =>
                                        setLogs(r.data),
                                    );
                                }}
                                className="bg-white p-6 rounded-2xl max-w-sm w-full space-y-3"
                            >
                                <h3 className="font-bold">Edit Stock Log</h3>
                                <select
                                    value={editingLog.type}
                                    onChange={(e) =>
                                        setEditingLog({
                                            ...editingLog,
                                            type: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 border rounded-xl text-sm"
                                >
                                    <option value="in">IN</option>
                                    <option value="out">OUT</option>
                                    <option value="adjustment">
                                        ADJUSTMENT
                                    </option>
                                </select>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingLog.quantity}
                                    onChange={(e) =>
                                        setEditingLog({
                                            ...editingLog,
                                            quantity: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 border rounded-xl text-sm"
                                />
                                <input
                                    value={editingLog.reference || ""}
                                    onChange={(e) =>
                                        setEditingLog({
                                            ...editingLog,
                                            reference: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 border rounded-xl text-sm"
                                    placeholder="Reference"
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingLog(null)}
                                        className="flex-1 py-2 border rounded-xl text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm"
                                    >
                                        Save
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {message.text && (
                        <div
                            className={`p-3 rounded-xl text-sm border ${message.type === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}
                        >
                            {message.text}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <form
                            onSubmit={handleSaveProduct}
                            className="bg-white p-5 rounded-2xl border shadow-sm space-y-3"
                        >
                            <div className="flex justify-between items-center">
                                <h2 className="font-bold text-base flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-indigo-600" />{" "}
                                    {editingId
                                        ? t("edit_product")
                                        : t("add_stock")}
                                </h2>
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="text-xs text-slate-500 hover:underline"
                                    >
                                        {t("cancel_edit")}
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                                <select
                                    value={form.category_id}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            category_id: e.target.value,
                                        })
                                    }
                                    className="p-2.5 border rounded-xl text-sm bg-slate-50"
                                >
                                    <option value="">
                                        {t("select_category")}
                                    </option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={form.vendor_id}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            vendor_id: e.target.value,
                                        })
                                    }
                                    className="p-2.5 border rounded-xl text-sm bg-slate-50"
                                >
                                    <option value="">
                                        -- Select Vendor --
                                    </option>
                                    {vendors.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="relative sm:col-span-2">
                                    <input
                                        required
                                        placeholder="SKU (type to search existing SKUs)"
                                        value={form.sku}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                sku: e.target.value,
                                            })
                                        }
                                        className="w-full p-2.5 border rounded-xl text-sm bg-slate-50"
                                    />
                                    {skuMatches.length > 0 && (
                                        <div className="absolute z-20 left-0 right-0 bg-white border rounded-xl shadow-lg max-h-36 overflow-y-auto divide-y mt-1">
                                            {skuMatches.map((m) => (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() =>
                                                        selectSkuSuggestion(m)
                                                    }
                                                    className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50"
                                                >
                                                    <span className="font-mono font-bold text-indigo-600">
                                                        {m.sku}
                                                    </span>{" "}
                                                    — {m.name} (Stock:{" "}
                                                    {m.stock_qty} {m.unit})
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <input
                                    required
                                    placeholder={t("product_name")}
                                    value={form.name}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            name: e.target.value,
                                        })
                                    }
                                    className="p-2.5 border rounded-xl text-sm bg-slate-50"
                                />
                                <select
                                    value={form.unit}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            unit: e.target.value,
                                        })
                                    }
                                    className="p-2.5 border rounded-xl text-sm bg-slate-50"
                                >
                                    <option value="pcs">
                                        Unit: Pieces (pcs)
                                    </option>
                                    <option value="kg">
                                        Unit: Kilograms (kg)
                                    </option>
                                    <option value="liter">
                                        Unit: Liters (liter)
                                    </option>
                                </select>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    placeholder={t("cost_price")}
                                    value={form.cost_price}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            cost_price: e.target.value,
                                        })
                                    }
                                    className="p-2.5 border rounded-xl text-sm bg-slate-50"
                                />
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    placeholder={t("sell_price")}
                                    value={form.sell_price}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            sell_price: e.target.value,
                                        })
                                    }
                                    className="p-2.5 border rounded-xl text-sm bg-slate-50"
                                />
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    placeholder={
                                        editingId
                                            ? "Stock Qty"
                                            : "Add Stock Qty"
                                    }
                                    value={form.stock_qty}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            stock_qty: e.target.value,
                                        })
                                    }
                                    className="p-2.5 border rounded-xl text-sm bg-slate-50"
                                />
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder={t("low_stock_alert")}
                                    value={form.low_stock_alert}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            low_stock_alert: e.target.value,
                                        })
                                    }
                                    className="p-2.5 border rounded-xl text-sm bg-slate-50"
                                />
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Max Qty / Purchase (optional)"
                                    value={form.max_purchase_qty}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            max_purchase_qty: e.target.value,
                                        })
                                    }
                                    className="p-2.5 border rounded-xl text-sm bg-slate-50"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Bulk Min Qty"
                                        value={form.bulk_min_qty}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                bulk_min_qty: e.target.value,
                                            })
                                        }
                                        className="p-2.5 border rounded-xl text-sm bg-slate-50"
                                    />
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Bulk Price"
                                        value={form.bulk_price}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                bulk_price: e.target.value,
                                            })
                                        }
                                        className="p-2.5 border rounded-xl text-sm bg-slate-50"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                image: e.target.files[0],
                                            })
                                        }
                                        className="w-full text-sm border rounded-xl p-2 bg-slate-50"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
                            >
                                {editingId
                                    ? t("update_product")
                                    : t("add_stock")}
                            </button>
                        </form>

                        <form
                            onSubmit={handleBulkUpload}
                            className="bg-white p-5 rounded-2xl border shadow-sm space-y-4 h-fit"
                        >
                            <div className="flex justify-between items-center">
                                <h2 className="font-bold text-base flex items-center gap-2">
                                    <Upload className="w-4 h-4 text-emerald-600" />{" "}
                                    {t("bulk_excel")}
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const csv =
                                            "sku,name,category,vendor,unit,cost_price,sell_price,stock_qty,low_stock_alert,max_purchase_qty,bulk_min_qty,bulk_price\n" +
                                            "SKU-1001,Demo Coffee,Beverages,Fresh Beans Co,pcs,2.50,5.00,50,10,5,10,4.20\n" +
                                            "SKU-1002,Cooking Oil,Grocery,Pure Oils Ltd,liter,1.80,3.20,25.5,5,,10,2.90\n";
                                        const a = document.createElement("a");
                                        a.href = URL.createObjectURL(
                                            new Blob([csv], {
                                                type: "text/csv",
                                            }),
                                        );
                                        a.download =
                                            "bulk-stock-demo-template.csv";
                                        a.click();
                                    }}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg"
                                >
                                    <Download className="w-3.5 h-3.5" />{" "}
                                    {t("demo_template")}
                                </button>
                            </div>
                            <p className="text-xs text-slate-500">
                                <code>
                                    sku, name, category, vendor, unit,
                                    cost_price, sell_price, stock_qty,
                                    low_stock_alert, max_purchase_qty,
                                    bulk_min_qty, bulk_price
                                </code>
                            </p>
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={(e) => setFile(e.target.files[0])}
                                className="w-full text-sm border rounded-xl p-2.5 bg-slate-50"
                            />
                            <button
                                type="submit"
                                disabled={!file}
                                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                            >
                                {t("bulk_excel")}
                            </button>
                        </form>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border flex flex-wrap gap-3">
                        <input
                            placeholder="Search by SKU, Name, Category, Vendor, Price, or Stock..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 p-2.5 border rounded-xl text-sm"
                        />
                        <select
                            value={photoFilter}
                            onChange={(e) => setPhotoFilter(e.target.value)}
                            className="p-2.5 border rounded-xl text-sm"
                        >
                            <option value="all">All Photos</option>
                            <option value="with">With Photo</option>
                            <option value="without">No Photo</option>
                        </select>
                    </div>

                    <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="p-3">Photo</th>
                                    <th className="p-3">SKU</th>
                                    <th className="p-3">Name</th>
                                    <th className="p-3">Category / Vendor</th>
                                    <th className="p-3">Cost / Sell</th>
                                    <th className="p-3">Stock</th>
                                    <th className="p-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredProducts.map((p) => (
                                    <tr
                                        key={p.id}
                                        className="hover:bg-slate-50"
                                    >
                                        <td className="p-3">
                                            <img
                                                src={p.image_url || DEFAULT_IMG}
                                                alt={p.name}
                                                onError={(e) => {
                                                    e.currentTarget.src =
                                                        DEFAULT_IMG;
                                                }}
                                                onClick={() =>
                                                    setSelectedProduct(p)
                                                }
                                                className="w-11 h-11 rounded-lg object-contain bg-slate-50 border cursor-pointer"
                                            />
                                        </td>
                                        <td className="p-3 font-mono text-xs">
                                            {p.sku}
                                        </td>
                                        <td
                                            onClick={() =>
                                                setSelectedProduct(p)
                                            }
                                            className="p-3 font-medium text-indigo-600 hover:underline cursor-pointer"
                                        >
                                            <div>{p.name}</div>
                                            {p.bulk_min_qty && p.bulk_price && (
                                                <div className="text-[11px] text-emerald-600">
                                                    Bulk: {p.bulk_min_qty}+{" "}
                                                    {p.unit} @ {sym}
                                                    {p.bulk_price}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 text-xs text-slate-500">
                                            <div>{p.category?.name || "-"}</div>
                                            <div>{p.vendor?.name || "-"}</div>
                                        </td>
                                        <td className="p-3">
                                            {sym}
                                            {p.cost_price} /{" "}
                                            <span className="font-semibold text-indigo-600">
                                                {sym}
                                                {p.sell_price}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${Number(p.stock_qty) <= Number(p.low_stock_alert) ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                                            >
                                                {p.stock_qty} {p.unit}
                                            </span>
                                        </td>
                                        <td className="p-3 flex items-center gap-1">
                                            <button
                                                onClick={() =>
                                                    setSelectedProduct(p)
                                                }
                                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                                            >
                                                <QrCode className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingId(p.id);
                                                    setForm({
                                                        category_id:
                                                            p.category_id || "",
                                                        vendor_id:
                                                            p.vendor_id || "",
                                                        sku: p.sku,
                                                        name: p.name,
                                                        unit: p.unit || "pcs",
                                                        cost_price:
                                                            p.cost_price,
                                                        sell_price:
                                                            p.sell_price,
                                                        stock_qty: p.stock_qty,
                                                        low_stock_alert:
                                                            p.low_stock_alert,
                                                        max_purchase_qty:
                                                            p.max_purchase_qty ||
                                                            "",
                                                        bulk_min_qty:
                                                            p.bulk_min_qty ||
                                                            "",
                                                        bulk_price:
                                                            p.bulk_price || "",
                                                        image: null,
                                                    });
                                                }}
                                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            {user?.role === "super_admin" && (
                                                <button
                                                    onClick={() =>
                                                        handleDelete(p.id)
                                                    }
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {selectedProduct && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setSelectedProduct(null)}
                            className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-4">
                            <img
                                src={selectedProduct.image_url || DEFAULT_IMG}
                                alt={selectedProduct.name}
                                className="w-16 h-16 rounded-2xl object-contain bg-slate-50 border"
                            />
                            <div>
                                <h3 className="font-bold text-lg">
                                    {selectedProduct.name}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    SKU: {selectedProduct.sku} •{" "}
                                    {selectedProduct.category?.name || "-"}
                                </p>
                                <p className="text-sm font-bold text-indigo-600 mt-1">
                                    {sym}
                                    {selectedProduct.sell_price} | Stock:{" "}
                                    {selectedProduct.stock_qty}{" "}
                                    {selectedProduct.unit}
                                </p>
                            </div>
                        </div>

                        <div className="border-t pt-3 space-y-2">
                            <div className="text-xs font-bold text-slate-600">
                                Price Batches (Same SKU, Different Price)
                            </div>
                            {selectedProduct.batches?.map((b) => (
                                <div
                                    key={b.id}
                                    className="text-xs flex justify-between bg-slate-50 p-2 rounded-lg"
                                >
                                    <span>
                                        {b.label} (Qty: {b.stock_qty})
                                    </span>
                                    <span>
                                        Cost: {sym}
                                        {b.cost_price} / Sell: {sym}
                                        {b.sell_price}
                                    </span>
                                </div>
                            ))}
                            <form
                                onSubmit={handleAddBatch}
                                className="grid grid-cols-4 gap-1.5"
                            >
                                <input
                                    required
                                    placeholder="Label"
                                    value={batchForm.label}
                                    onChange={(e) =>
                                        setBatchForm({
                                            ...batchForm,
                                            label: e.target.value,
                                        })
                                    }
                                    className="p-1.5 border rounded-lg text-xs"
                                />
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    placeholder="Cost"
                                    value={batchForm.cost_price}
                                    onChange={(e) =>
                                        setBatchForm({
                                            ...batchForm,
                                            cost_price: e.target.value,
                                        })
                                    }
                                    className="p-1.5 border rounded-lg text-xs"
                                />
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    placeholder="Sell"
                                    value={batchForm.sell_price}
                                    onChange={(e) =>
                                        setBatchForm({
                                            ...batchForm,
                                            sell_price: e.target.value,
                                        })
                                    }
                                    className="p-1.5 border rounded-lg text-xs"
                                />
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    placeholder="Qty"
                                    value={batchForm.stock_qty}
                                    onChange={(e) =>
                                        setBatchForm({
                                            ...batchForm,
                                            stock_qty: e.target.value,
                                        })
                                    }
                                    className="p-1.5 border rounded-lg text-xs"
                                />
                                <button
                                    type="submit"
                                    className="col-span-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold"
                                >
                                    + Add Price Batch
                                </button>
                            </form>
                        </div>

                        <div className="border-t pt-4 flex flex-col items-center gap-4 bg-slate-50 p-4 rounded-2xl">
                            <div
                                ref={barcodeRef}
                                className="bg-white p-2 rounded-xl border"
                            >
                                <Barcode
                                    value={selectedProduct.sku}
                                    height={50}
                                    width={1.6}
                                    fontSize={12}
                                />
                            </div>
                            <div
                                ref={qrRef}
                                className="bg-white p-3 rounded-xl border"
                            >
                                <QRCodeSVG
                                    value={JSON.stringify({
                                        sku: selectedProduct.sku,
                                        name: selectedProduct.name,
                                        price: selectedProduct.sell_price,
                                    })}
                                    size={110}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => handlePrint("barcode")}
                                className="py-2.5 bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
                            >
                                <Printer className="w-3.5 h-3.5" /> Barcode
                            </button>
                            <button
                                onClick={() => handlePrint("qr")}
                                className="py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
                            >
                                <Printer className="w-3.5 h-3.5" /> QR Code
                            </button>
                            <button
                                onClick={() => handlePrint("both")}
                                className="py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
                            >
                                <Printer className="w-3.5 h-3.5" /> Both
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
