import { useEffect, useState } from "react";
import axios from "axios";

export default function PublicPoPage({ token }) {
    const [po, setPo] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!token) {
            return;
        }
        const baseUrl =
            import.meta.env.VITE_API_URL || "http://localhost:8000/api";
        axios
            .get(`${baseUrl}/public/po/${token}`, {
                headers: { Accept: "application/json" },
            })
            .then((res) => setPo(res.data))
            .catch((err) =>
                setError(
                    err.response?.data?.message ||
                        "Unable to load Purchase Order",
                ),
            );
    }, [token]);

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-3xl border shadow-sm max-w-md w-full text-center space-y-2">
                    <h2 className="font-bold text-lg text-red-600">
                        Link Unavailable
                    </h2>
                    <p className="text-sm text-slate-600">
                        Invalid Purchase Order link.
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-3xl border shadow-sm max-w-md w-full text-center space-y-2">
                    <h2 className="font-bold text-lg text-red-600">
                        Link Unavailable
                    </h2>
                    <p className="text-sm text-slate-600">{error}</p>
                </div>
            </div>
        );
    }

    if (!po) {
        return (
            <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
                Loading Purchase Order...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
            <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border shadow-sm space-y-6">
                <div className="flex justify-between items-start border-b pb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-indigo-600">
                            PURCHASE ORDER
                        </h1>
                        <p className="text-sm font-mono text-slate-600">
                            {po.po_number}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            {new Date(po.created_at).toLocaleString()}
                        </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase">
                        {po.status}
                    </span>
                </div>

                <div className="text-sm space-y-1">
                    <div className="font-bold text-slate-800">
                        Vendor: {po.vendor?.name}
                    </div>
                    {po.vendor?.phone && (
                        <div className="text-slate-500">
                            Phone: {po.vendor.phone}
                        </div>
                    )}
                    {po.vendor?.address && (
                        <div className="text-slate-500">
                            Address: {po.vendor.address}
                        </div>
                    )}
                </div>

                <table className="w-full text-sm text-left border-t">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="p-3">SKU</th>
                            <th className="p-3">Product</th>
                            <th className="p-3 text-right">Qty</th>
                            <th className="p-3 text-right">Unit Cost</th>
                            <th className="p-3 text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {po.items.map((i) => (
                            <tr key={i.id}>
                                <td className="p-3 font-mono text-xs">
                                    {i.product?.sku}
                                </td>
                                <td className="p-3 font-medium">
                                    {i.product?.name}
                                </td>
                                <td className="p-3 text-right">
                                    {i.quantity} {i.product?.unit}
                                </td>
                                <td className="p-3 text-right">
                                    {i.cost_price}
                                </td>
                                <td className="p-3 text-right font-semibold">
                                    {i.subtotal}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="border-t pt-4 flex justify-between items-center font-bold text-lg">
                    <span>Total Amount</span>
                    <span className="text-indigo-600">{po.total_amount}</span>
                </div>

                <button
                    onClick={() => window.print()}
                    className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
                >
                    Print Purchase Order
                </button>
            </div>
        </div>
    );
}
