import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../api/axios";
import { useStore } from "../context/StoreContext";

export default function ReportsPage() {
    const { t } = useTranslation();
    const { currency } = useStore();
    const [period, setPeriod] = useState("daily");
    const [data, setData] = useState(null);
    const [showLowStock, setShowLowStock] = useState(false);

    useEffect(() => {
        api.get(`/reports/dashboard?period=${period}`).then((res) =>
            setData(res.data),
        );
    }, [period]);

    const downloadFile = (type) => {
        window.open(
            `${import.meta.env.VITE_API_URL}/reports/${type}?period=${period}`,
            "_blank",
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 justify-between items-center">
                <div className="flex gap-2">
                    <button
                        onClick={() => setPeriod("daily")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${period === "daily" ? "bg-indigo-600 text-white" : "bg-white border"}`}
                    >
                        {t("daily")}
                    </button>
                    <button
                        onClick={() => setPeriod("monthly")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${period === "monthly" ? "bg-indigo-600 text-white" : "bg-white border"}`}
                    >
                        {t("monthly")}
                    </button>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => downloadFile("pdf")}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm"
                    >
                        {t("download_pdf")}
                    </button>
                    <button
                        onClick={() => downloadFile("excel")}
                        className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm"
                    >
                        {t("download_excel")}
                    </button>
                </div>
            </div>

            {data && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white p-4 rounded-xl border">
                            <div className="text-xs text-gray-500">
                                {t("sales")}
                            </div>
                            <div className="text-xl font-bold">
                                {currency.currency_symbol}
                                {data.sales_total}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border">
                            <div className="text-xs text-gray-500">
                                {t("stock_in")}
                            </div>
                            <div className="text-xl font-bold text-emerald-600">
                                +{data.stock_in}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border">
                            <div className="text-xs text-gray-500">
                                {t("stock_out")}
                            </div>
                            <div className="text-xl font-bold text-red-600">
                                -{data.stock_out}
                            </div>
                        </div>
                        <button
                            onClick={() => setShowLowStock(!showLowStock)}
                            className="bg-white p-4 rounded-xl border text-left hover:border-amber-500 transition"
                        >
                            <div className="text-xs text-gray-500">
                                {t("low_stock")} (Click to view)
                            </div>
                            <div className="text-xl font-bold text-amber-600">
                                {data.low_stock_count}
                            </div>
                        </button>
                    </div>

                    {showLowStock && (
                        <div className="bg-white rounded-2xl border p-4 space-y-2">
                            <h3 className="font-bold text-sm text-amber-700">
                                Low Stock Products
                            </h3>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="p-2">SKU</th>
                                        <th className="p-2">Name</th>
                                        <th className="p-2">Category</th>
                                        <th className="p-2">Stock</th>
                                        <th className="p-2">Alert Level</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.low_stock_products?.map((p) => (
                                        <tr key={p.id}>
                                            <td className="p-2 font-mono text-xs">
                                                {p.sku}
                                            </td>
                                            <td className="p-2 font-medium">
                                                {p.name}
                                            </td>
                                            <td className="p-2 text-slate-500">
                                                {p.category?.name || "-"}
                                            </td>
                                            <td className="p-2 font-bold text-red-600">
                                                {p.stock_qty}
                                            </td>
                                            <td className="p-2 text-slate-500">
                                                {p.low_stock_alert}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
