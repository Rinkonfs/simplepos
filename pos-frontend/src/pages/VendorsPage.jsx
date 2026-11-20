import { useEffect, useState } from "react";
import {
    Mail,
    MessageCircle,
    MessageSquare,
    Plus,
    Trash2,
    CheckCircle,
    DollarSign,
} from "lucide-react";
import api from "../api/axios";
import { useStore } from "../context/StoreContext";

export default function VendorsPage() {
    const { products, currency, fetchProducts } = useStore();
    const sym = currency.currency_symbol;

    const [tab, setTab] = useState("vendors"); // 'vendors' | 'pos'
    const [vendors, setVendors] = useState([]);
    const [posList, setPosList] = useState([]);

    const [vForm, setVForm] = useState({
        name: "",
        phone: "",
        email: "",
        address: "",
    });
    const [poForm, setPoForm] = useState({
        vendor_id: "",
        items: [{ product_id: "", quantity: 1, cost_price: "" }],
    });

    const load = async () => {
        const [vRes, poRes] = await Promise.all([
            api.get("/vendors"),
            api.get("/purchase-orders"),
        ]);
        setVendors(vRes.data);
        setPosList(poRes.data);
    };

    useEffect(() => {
        load();
        fetchProducts();
    }, [fetchProducts]);

    const saveVendor = async (e) => {
        e.preventDefault();
        await api.post("/vendors", vForm);
        setVForm({ name: "", phone: "", email: "", address: "" });
        load();
    };

    const createPO = async (e) => {
        e.preventDefault();
        await api.post("/purchase-orders", poForm);
        setPoForm({
            vendor_id: "",
            items: [{ product_id: "", quantity: 1, cost_price: "" }],
        });
        load();
    };

    const updatePOStatus = async (id, status) => {
        await api.patch(`/purchase-orders/${id}/status`, { status });
        load();
        if (status === "received") fetchProducts(true);
    };

    const payPO = async (po) => {
        const remaining = po.total_amount - po.paid_amount;
        const amt = window.prompt(
            `Enter payment amount (Remaining: ${sym}${remaining.toFixed(2)})`,
            remaining.toFixed(2),
        );
        if (!amt || Number(amt) <= 0) return;
        await api.post(`/purchase-orders/${po.id}/pay`, {
            amount: Number(amt),
            payment_method: "cash",
        });
        load();
    };

    const sendPO = (po, via) => {
        const lines = po.items
            .map(
                (i) =>
                    `- ${i.product?.name} (${i.product?.sku}) x ${i.quantity} @ ${sym}${i.cost_price}`,
            )
            .join("\n");
        const text = `Purchase Order: ${po.po_number}\nVendor: ${po.vendor?.name}\nItems:\n${lines}\nTotal: ${sym}${po.total_amount}`;

        if (via === "email") {
            window.open(
                `mailto:${po.vendor?.email || ""}?subject=${encodeURIComponent(`PO ${po.po_number}`)}&body=${encodeURIComponent(text)}`,
            );
        } else if (via === "whatsapp") {
            const phone = (po.vendor?.phone || "").replace(/\D/g, "");
            window.open(
                `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
                "_blank",
            );
        } else if (via === "sms") {
            window.open(
                `sms:${po.vendor?.phone || ""}?body=${encodeURIComponent(text)}`,
            );
        }
        if (po.status === "draft") updatePOStatus(po.id, "sent");
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-2">
                <button
                    onClick={() => setTab("vendors")}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold ${tab === "vendors" ? "bg-indigo-600 text-white" : "bg-white border"}`}
                >
                    Vendors
                </button>
                <button
                    onClick={() => setTab("pos")}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold ${tab === "pos" ? "bg-indigo-600 text-white" : "bg-white border"}`}
                >
                    Purchase Orders
                </button>
            </div>

            {tab === "vendors" ? (
                <div className="space-y-4">
                    <form
                        onSubmit={saveVendor}
                        className="bg-white p-5 rounded-2xl border grid grid-cols-1 sm:grid-cols-5 gap-3"
                    >
                        <input
                            required
                            placeholder="Vendor Name"
                            value={vForm.name}
                            onChange={(e) =>
                                setVForm({ ...vForm, name: e.target.value })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        />
                        <input
                            placeholder="Phone"
                            value={vForm.phone}
                            onChange={(e) =>
                                setVForm({ ...vForm, phone: e.target.value })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={vForm.email}
                            onChange={(e) =>
                                setVForm({ ...vForm, email: e.target.value })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        />
                        <input
                            placeholder="Address"
                            value={vForm.address}
                            onChange={(e) =>
                                setVForm({ ...vForm, address: e.target.value })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        />
                        <button
                            type="submit"
                            className="bg-indigo-600 text-white rounded-xl text-sm font-semibold py-2.5"
                        >
                            Add Vendor
                        </button>
                    </form>

                    <div className="bg-white rounded-2xl border overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="p-3">Name</th>
                                    <th className="p-3">Phone</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Address</th>
                                    <th className="p-3">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {vendors.map((v) => (
                                    <tr key={v.id}>
                                        <td className="p-3 font-medium">
                                            {v.name}
                                        </td>
                                        <td className="p-3">
                                            {v.phone || "-"}
                                        </td>
                                        <td className="p-3">
                                            {v.email || "-"}
                                        </td>
                                        <td className="p-3 text-slate-500">
                                            {v.address || "-"}
                                        </td>
                                        <td className="p-3">
                                            <button
                                                onClick={() =>
                                                    api
                                                        .delete(
                                                            `/vendors/${v.id}`,
                                                        )
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
            ) : (
                <div className="space-y-6">
                    <form
                        onSubmit={createPO}
                        className="bg-white p-5 rounded-2xl border space-y-3"
                    >
                        <h3 className="font-bold text-base">
                            Create Purchase Order
                        </h3>
                        <select
                            required
                            value={poForm.vendor_id}
                            onChange={(e) =>
                                setPoForm({
                                    ...poForm,
                                    vendor_id: e.target.value,
                                })
                            }
                            className="w-full sm:w-64 p-2.5 border rounded-xl text-sm"
                        >
                            <option value="">-- Select Vendor --</option>
                            {vendors.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.name}
                                </option>
                            ))}
                        </select>

                        {poForm.items.map((item, idx) => (
                            <div
                                key={idx}
                                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                            >
                                <select
                                    required
                                    value={item.product_id}
                                    onChange={(e) => {
                                        const p = products.find(
                                            (x) =>
                                                x.id === Number(e.target.value),
                                        );
                                        const items = [...poForm.items];
                                        items[idx] = {
                                            ...items[idx],
                                            product_id: e.target.value,
                                            cost_price: p?.cost_price || "",
                                        };
                                        setPoForm({ ...poForm, items });
                                    }}
                                    className="p-2.5 border rounded-xl text-sm"
                                >
                                    <option value="">
                                        -- Select Product --
                                    </option>
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.sku})
                                        </option>
                                    ))}
                                </select>
                                <input
                                    required
                                    type="number"
                                    min="1"
                                    placeholder="Qty"
                                    value={item.quantity}
                                    onChange={(e) => {
                                        const items = [...poForm.items];
                                        items[idx].quantity = e.target.value;
                                        setPoForm({ ...poForm, items });
                                    }}
                                    className="p-2.5 border rounded-xl text-sm"
                                />
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    placeholder="Cost Price"
                                    value={item.cost_price}
                                    onChange={(e) => {
                                        const items = [...poForm.items];
                                        items[idx].cost_price = e.target.value;
                                        setPoForm({ ...poForm, items });
                                    }}
                                    className="p-2.5 border rounded-xl text-sm"
                                />
                            </div>
                        ))}

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setPoForm({
                                        ...poForm,
                                        items: [
                                            ...poForm.items,
                                            {
                                                product_id: "",
                                                quantity: 1,
                                                cost_price: "",
                                            },
                                        ],
                                    })
                                }
                                className="px-3 py-2 border rounded-xl text-xs font-semibold flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Item
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                            >
                                Create PO
                            </button>
                        </div>
                    </form>

                    <div className="space-y-3">
                        {posList.map((po) => (
                            <div
                                key={po.id}
                                className="bg-white p-4 rounded-2xl border space-y-2"
                            >
                                <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-2">
                                    <div>
                                        <span className="font-bold text-indigo-600">
                                            {po.po_number}
                                        </span>
                                        <span className="text-xs text-slate-500 ml-2">
                                            {po.vendor?.name} •{" "}
                                            {new Date(
                                                po.created_at,
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 font-semibold uppercase">
                                        {po.status}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-600 space-y-1">
                                    {po.items.map((i) => (
                                        <div
                                            key={i.id}
                                            className="flex justify-between"
                                        >
                                            <span>
                                                {i.product?.name} × {i.quantity}
                                            </span>
                                            <span>
                                                {sym}
                                                {i.subtotal}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap justify-between items-center pt-2 border-t gap-2">
                                    <div className="text-sm font-bold">
                                        Total: {sym}
                                        {po.total_amount}{" "}
                                        <span className="text-xs text-emerald-600 font-normal">
                                            (Paid: {sym}
                                            {po.paid_amount})
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        <button
                                            onClick={() => sendPO(po, "email")}
                                            className="px-2.5 py-1.5 bg-slate-100 rounded-lg text-xs flex items-center gap-1"
                                        >
                                            <Mail className="w-3.5 h-3.5" />{" "}
                                            Email
                                        </button>
                                        <button
                                            onClick={() =>
                                                sendPO(po, "whatsapp")
                                            }
                                            className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs flex items-center gap-1"
                                        >
                                            <MessageCircle className="w-3.5 h-3.5" />{" "}
                                            WhatsApp
                                        </button>
                                        <button
                                            onClick={() => sendPO(po, "sms")}
                                            className="px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs flex items-center gap-1"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />{" "}
                                            SMS
                                        </button>
                                        {po.status !== "received" && (
                                            <button
                                                onClick={() =>
                                                    updatePOStatus(
                                                        po.id,
                                                        "received",
                                                    )
                                                }
                                                className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs flex items-center gap-1"
                                            >
                                                <CheckCircle className="w-3.5 h-3.5" />{" "}
                                                Receive Stock
                                            </button>
                                        )}
                                        {Number(po.paid_amount) <
                                            Number(po.total_amount) && (
                                            <button
                                                onClick={() => payPO(po)}
                                                className="px-2.5 py-1.5 bg-amber-500 text-white rounded-lg text-xs flex items-center gap-1"
                                            >
                                                <DollarSign className="w-3.5 h-3.5" />{" "}
                                                Pay Vendor
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
