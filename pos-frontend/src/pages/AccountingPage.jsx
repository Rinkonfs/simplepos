import { useEffect, useState } from "react";
import api from "../api/axios";
import { useStore } from "../context/StoreContext";

export default function AccountingPage() {
    const { currency } = useStore();
    const sym = currency.currency_symbol;

    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [data, setData] = useState(null);

    const load = () => {
        api.get(`/accounting/summary?from=${from}&to=${to}`).then((res) =>
            setData(res.data),
        );
    };

    useEffect(() => {
        load();
    }, [from, to]);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">
                    Accounting & Profit / Loss
                </h1>
                <div className="flex gap-2">
                    <input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="p-2 border rounded-xl text-sm bg-white"
                    />
                    <input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="p-2 border rounded-xl text-sm bg-white"
                    />
                </div>
            </div>

            {data && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="bg-white p-4 rounded-2xl border">
                            <div className="text-xs text-slate-500">
                                POS Income
                            </div>
                            <div className="text-lg font-bold text-indigo-600">
                                {sym}
                                {data.pos_income}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border">
                            <div className="text-xs text-slate-500">
                                E-Com Income
                            </div>
                            <div className="text-lg font-bold text-blue-600">
                                {sym}
                                {data.ecommerce_income}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border">
                            <div className="text-xs text-slate-500">
                                Total Income
                            </div>
                            <div className="text-lg font-bold text-emerald-600">
                                {sym}
                                {data.total_income}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border">
                            <div className="text-xs text-slate-500">
                                Vendor Paid
                            </div>
                            <div className="text-lg font-bold text-red-600">
                                {sym}
                                {data.vendor_paid}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border">
                            <div className="text-xs text-slate-500">
                                Vendor Payable
                            </div>
                            <div className="text-lg font-bold text-amber-600">
                                {sym}
                                {data.vendor_payable}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border">
                            <div className="text-xs text-slate-500">
                                Net Profit / Loss
                            </div>
                            <div
                                className={`text-lg font-bold ${data.net_profit >= 0 ? "text-emerald-600" : "text-red-600"}`}
                            >
                                {sym}
                                {data.net_profit}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-4 rounded-2xl border space-y-3">
                            <h3 className="font-bold text-sm">
                                Recent Customer Income
                            </h3>
                            <div className="divide-y text-xs">
                                {data.recent_orders.map((o) => (
                                    <div
                                        key={o.id}
                                        className="py-2 flex justify-between"
                                    >
                                        <span>
                                            <strong className="text-indigo-600">
                                                {o.order_number}
                                            </strong>{" "}
                                            ({o.channel.toUpperCase()})
                                        </span>
                                        <span className="font-bold text-emerald-600">
                                            +{sym}
                                            {o.total_amount}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border space-y-3">
                            <h3 className="font-bold text-sm">
                                Recent Vendor Payments
                            </h3>
                            <div className="divide-y text-xs">
                                {data.vendor_payments.map((p) => (
                                    <div
                                        key={p.id}
                                        className="py-2 flex justify-between"
                                    >
                                        <span>
                                            <strong>{p.vendor?.name}</strong> —{" "}
                                            {p.note}
                                        </span>
                                        <span className="font-bold text-red-600">
                                            -{sym}
                                            {p.amount}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
