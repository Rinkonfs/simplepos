import { useEffect, useState } from "react";
import {
    Mail,
    MessageCircle,
    MessageSquare,
    Plus,
    Trash2,
    CheckCircle,
    DollarSign,
    Edit2,
    Printer,
    Calendar as CalendarIcon,
    List,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import api from "../api/axios";
import { useStore } from "../context/StoreContext";

export default function VendorsPage() {
    const { products, currency, fetchProducts } = useStore();
    const sym = currency.currency_symbol;

    const [tab, setTab] = useState("vendors"); // 'vendors' | 'pos'
    const [poView, setPoView] = useState("list"); // 'list' | 'calendar'
    const [poFilter, setPoFilter] = useState("all"); // 'all' | 'to_deliver' | 'to_pay' | 'paid'
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const [vendors, setVendors] = useState([]);
    const [posList, setPosList] = useState([]);

    const [editingVendorId, setEditingVendorId] = useState(null);
    const [vForm, setVForm] = useState({
        name: "",
        phone: "",
        whatsapp_number: "",
        email: "",
        address: "",
        bank_details: "",
    });

    const [editingPoId, setEditingPoId] = useState(null);
    const [poForm, setPoForm] = useState({
        vendor_id: "",
        items: [{ product_id: "", quantity: 1, cost_price: "" }],
    });

    const [payingPo, setPayingPo] = useState(null);
    const [payForm, setPayForm] = useState({
        amount: "",
        payment_method: "cash",
        reference_number: "",
        note: "",
    });
    const [smsPo, setSmsPo] = useState(null);

    // Calendar State
    const [calDate, setCalDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);

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
        if (editingVendorId) {
            await api.put(`/vendors/${editingVendorId}`, vForm);
            setEditingVendorId(null);
        } else {
            await api.post("/vendors", vForm);
        }
        setVForm({
            name: "",
            phone: "",
            whatsapp_number: "",
            email: "",
            address: "",
            bank_details: "",
        });
        load();
    };

    const savePO = async (e) => {
        e.preventDefault();
        if (editingPoId) {
            await api.put(`/purchase-orders/${editingPoId}`, poForm);
            setEditingPoId(null);
        } else {
            await api.post("/purchase-orders", poForm);
        }
        setPoForm({
            vendor_id: "",
            items: [{ product_id: "", quantity: 1, cost_price: "" }],
        });
        load();
    };

    const startEditPO = (po) => {
        setEditingPoId(po.id);
        setPoForm({
            vendor_id: po.vendor_id,
            items: po.items.map((i) => ({
                product_id: i.product_id,
                quantity: i.quantity,
                cost_price: i.cost_price,
            })),
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const updatePOStatus = async (id, status) => {
        await api.patch(`/purchase-orders/${id}/status`, { status });
        load();
        if (status === "received") fetchProducts(true);
    };

    const submitPayment = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/purchase-orders/${payingPo.id}/pay`, {
                ...payForm,
                amount: Number(payForm.amount),
            });
            setPayingPo(null);
            load();
        } catch (err) {
            alert(err.response?.data?.message || "Payment failed");
        }
    };

    const getPublicLink = (po) =>
        `${window.location.origin}/po/${po.public_token}`;

    const sendEmailPO = (po) => {
        const lines = po.items
            .map(
                (i) =>
                    `- ${i.product?.name} (SKU: ${i.product?.sku}) | Qty: ${i.quantity} ${i.product?.unit || "pcs"} | Cost: ${sym}${i.cost_price} | Subtotal: ${sym}${i.subtotal}`,
            )
            .join("\n");
        const body = `Hello ${po.vendor?.name},\n\nPO Number: ${po.po_number}\nDate: ${new Date(po.created_at).toLocaleString()}\n\nItems:\n${lines}\n\nTotal: ${sym}${po.total_amount}\n\nThank you!`;
        window.open(
            `mailto:${po.vendor?.email || ""}?subject=${encodeURIComponent(`Purchase Order ${po.po_number}`)}&body=${encodeURIComponent(body)}`,
        );
        if (po.status === "draft") updatePOStatus(po.id, "sent");
    };

    const sendWhatsAppPO = (po) => {
        const target = (
            po.vendor?.whatsapp_number ||
            po.vendor?.phone ||
            ""
        ).replace(/\D/g, "");
        const msg = `Hello ${po.vendor?.name}, view Purchase Order ${po.po_number} here: ${getPublicLink(po)}`;
        window.open(
            `https://wa.me/${target}?text=${encodeURIComponent(msg)}`,
            "_blank",
        );
        if (po.status === "draft") updatePOStatus(po.id, "sent");
    };

    const sendSmsToNumber = (po, number) => {
        const msg = `PO ${po.po_number}: View items & details here: ${getPublicLink(po)}`;
        window.open(`sms:${number}?body=${encodeURIComponent(msg)}`);
        setSmsPo(null);
        if (po.status === "draft") updatePOStatus(po.id, "sent");
    };

    const printA4Invoice = (po) => {
        const itemRows = po.items
            .map(
                (i) =>
                    `<tr><td>${i.product?.sku || "-"}</td><td>${i.product?.name}</td><td class="r">${i.quantity} ${i.product?.unit || ""}</td><td class="r">${sym}${i.cost_price}</td><td class="r">${sym}${i.subtotal}</td></tr>`,
            )
            .join("");
        const payRows = (po.payments || []).length
            ? po.payments
                  .map(
                      (p) =>
                          `<tr><td>${new Date(p.created_at).toLocaleString()}</td><td style="text-transform:uppercase">${p.payment_method.replace("_", " ")}</td><td>${p.reference_number || "-"}</td><td>${p.note || "-"}</td><td class="r">${sym}${p.amount}</td></tr>`,
                  )
                  .join("")
            : `<tr><td colspan="5" style="text-align:center;color:#777">No payments recorded yet</td></tr>`;
        const balance = Math.max(
            0,
            Number(po.total_amount) - Number(po.paid_amount),
        ).toFixed(2);

        const win = window.open("", "_blank", "width=900,height=1000");
        win.document.write(`
      <html><head><title>PO Invoice - ${po.po_number}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: Arial, sans-serif; color: #1e293b; font-size: 12px; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 18px; }
        h1 { margin: 0; color: #4f46e5; font-size: 22px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
        th { background: #f8fafc; font-weight: bold; }
        .r { text-align: right; }
        .totals { width: 280px; margin-left: auto; margin-bottom: 24px; }
        .totals td { border: none; border-bottom: 1px solid #e2e8f0; padding: 5px 8px; }
        .grand { font-size: 15px; font-weight: bold; background: #f1f5f9; }
      </style></head><body>
      <div class="header">
        <div><h1>PURCHASE ORDER INVOICE</h1><div><strong>PO #:</strong> ${po.po_number}</div><div><strong>Date:</strong> ${new Date(po.created_at).toLocaleString()}</div><div><strong>Status:</strong> ${po.status.toUpperCase()}</div></div>
        <div style="text-align:right"><strong>Vendor:</strong> ${po.vendor?.name}<br/>${po.vendor?.phone ? `Phone: ${po.vendor.phone}<br/>` : ""}${po.vendor?.email ? `Email: ${po.vendor.email}<br/>` : ""}${po.vendor?.address || ""}</div>
      </div>
      <h3>Order Items</h3>
      <table><thead><tr><th>SKU</th><th>Product</th><th class="r">Qty</th><th class="r">Unit Cost</th><th class="r">Subtotal</th></tr></thead><tbody>${itemRows}</tbody></table>
      <table class="totals">
        <tr><td>Total Amount</td><td class="r">${sym}${po.total_amount}</td></tr>
        <tr><td>Total Paid</td><td class="r" style="color:#059669">${sym}${po.paid_amount}</td></tr>
        <tr class="grand"><td>Balance Due</td><td class="r" style="color:#dc2626">${sym}${balance}</td></tr>
      </table>
      <h3>Payment History</h3>
      <table><thead><tr><th>Date & Time</th><th>Method</th><th>Reference</th><th>Note</th><th class="r">Amount</th></tr></thead><tbody>${payRows}</tbody></table>
      <script>window.onload=()=>{window.print();window.close()}</script></body></html>
    `);
        win.document.close();
    };

    const filteredPOs = posList.filter((po) => {
        const d = po.created_at.slice(0, 10);
        const matchDate =
            (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
        if (!matchDate) return false;
        if (poFilter === "to_deliver") return po.status !== "received";
        if (poFilter === "to_pay")
            return Number(po.paid_amount) < Number(po.total_amount);
        if (poFilter === "paid")
            return Number(po.paid_amount) >= Number(po.total_amount);
        return true;
    });

    // Calendar helpers
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const getDayPOs = (day) => {
        const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return filteredPOs.filter((po) => po.created_at.slice(0, 10) === key);
    };

    const needsRef =
        payForm.payment_method === "bkash" ||
        payForm.payment_method === "bank_transfer";

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
                        className="bg-white p-5 rounded-2xl border grid grid-cols-1 sm:grid-cols-3 gap-3"
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
                            placeholder="Phone Number"
                            value={vForm.phone}
                            onChange={(e) =>
                                setVForm({ ...vForm, phone: e.target.value })
                            }
                            className="p-2.5 border rounded-xl text-sm"
                        />
                        <input
                            placeholder="WhatsApp Number"
                            value={vForm.whatsapp_number}
                            onChange={(e) =>
                                setVForm({
                                    ...vForm,
                                    whatsapp_number: e.target.value,
                                })
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
                            className="p-2.5 border rounded-xl text-sm sm:col-span-2"
                        />
                        <textarea
                            placeholder="Bank Details (Bank Name, Account No, bKash)"
                            value={vForm.bank_details}
                            onChange={(e) =>
                                setVForm({
                                    ...vForm,
                                    bank_details: e.target.value,
                                })
                            }
                            className="p-2.5 border rounded-xl text-sm sm:col-span-3"
                            rows={2}
                        />
                        <button
                            type="submit"
                            className="bg-indigo-600 text-white rounded-xl text-sm font-semibold py-2.5 sm:col-span-3"
                        >
                            {editingVendorId ? "Update Vendor" : "Add Vendor"}
                        </button>
                    </form>

                    <div className="bg-white rounded-2xl border overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="p-3">Name</th>
                                    <th className="p-3">Phone / WhatsApp</th>
                                    <th className="p-3">Email</th>
                                    <th className="p-3">Bank Details</th>
                                    <th className="p-3">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {vendors.map((v) => (
                                    <tr key={v.id}>
                                        <td className="p-3 font-medium">
                                            <div>{v.name}</div>
                                            <div className="text-xs text-slate-400">
                                                {v.address}
                                            </div>
                                        </td>
                                        <td className="p-3 text-xs">
                                            <div>Ph: {v.phone || "-"}</div>
                                            <div className="text-emerald-600">
                                                WA: {v.whatsapp_number || "-"}
                                            </div>
                                        </td>
                                        <td className="p-3 text-xs">
                                            {v.email || "-"}
                                        </td>
                                        <td className="p-3 text-xs text-slate-500 whitespace-pre-line">
                                            {v.bank_details || "-"}
                                        </td>
                                        <td className="p-3 flex gap-1">
                                            <button
                                                onClick={() => {
                                                    setEditingVendorId(v.id);
                                                    setVForm({
                                                        name: v.name,
                                                        phone: v.phone || "",
                                                        whatsapp_number:
                                                            v.whatsapp_number ||
                                                            "",
                                                        email: v.email || "",
                                                        address:
                                                            v.address || "",
                                                        bank_details:
                                                            v.bank_details ||
                                                            "",
                                                    });
                                                }}
                                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
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
                    {/* Create / Edit PO Form */}
                    <form
                        onSubmit={savePO}
                        className="bg-white p-5 rounded-2xl border space-y-3"
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-base">
                                {editingPoId
                                    ? "Edit Purchase Order"
                                    : "Create Purchase Order"}
                            </h3>
                            {editingPoId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingPoId(null);
                                        setPoForm({
                                            vendor_id: "",
                                            items: [
                                                {
                                                    product_id: "",
                                                    quantity: 1,
                                                    cost_price: "",
                                                },
                                            ],
                                        });
                                    }}
                                    className="text-xs text-red-600 hover:underline"
                                >
                                    Cancel Edit
                                </button>
                            )}
                        </div>
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
                                className="grid grid-cols-1 sm:grid-cols-4 gap-2"
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
                                    className="p-2.5 border rounded-xl text-sm sm:col-span-2"
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
                                    step="0.01"
                                    min="0.01"
                                    placeholder="Qty"
                                    value={item.quantity}
                                    onChange={(e) => {
                                        const items = [...poForm.items];
                                        items[idx].quantity = e.target.value;
                                        setPoForm({ ...poForm, items });
                                    }}
                                    className="p-2.5 border rounded-xl text-sm"
                                />
                                <div className="flex gap-1">
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        placeholder="Cost"
                                        value={item.cost_price}
                                        onChange={(e) => {
                                            const items = [...poForm.items];
                                            items[idx].cost_price =
                                                e.target.value;
                                            setPoForm({ ...poForm, items });
                                        }}
                                        className="w-full p-2.5 border rounded-xl text-sm"
                                    />
                                    {poForm.items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPoForm({
                                                    ...poForm,
                                                    items: poForm.items.filter(
                                                        (_, i) => i !== idx,
                                                    ),
                                                })
                                            }
                                            className="p-2 text-red-500"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
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
                                {editingPoId ? "Update PO" : "Create PO"}
                            </button>
                        </div>
                    </form>

                    {/* PO Filters + Date Range + List/Calendar Toggle */}
                    <div className="bg-white p-4 rounded-2xl border flex flex-wrap justify-between items-center gap-3">
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { id: "all", label: "All" },
                                { id: "to_deliver", label: "To Deliver" },
                                { id: "to_pay", label: "To Pay" },
                                { id: "paid", label: "Paid" },
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setPoFilter(f.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${poFilter === f.id ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="p-2 border rounded-xl text-xs"
                            />
                            <span className="text-xs text-slate-400">to</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="p-2 border rounded-xl text-xs"
                            />
                            <button
                                onClick={() =>
                                    setPoView(
                                        poView === "list" ? "calendar" : "list",
                                    )
                                }
                                className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                            >
                                {poView === "list" ? (
                                    <>
                                        <CalendarIcon className="w-3.5 h-3.5" />{" "}
                                        Calendar View
                                    </>
                                ) : (
                                    <>
                                        <List className="w-3.5 h-3.5" /> List
                                        View
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {poView === "calendar" ? (
                        <div className="bg-white p-5 rounded-2xl border space-y-4">
                            <div className="flex flex-wrap justify-between items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() =>
                                            setCalDate(
                                                new Date(year, month - 1, 1),
                                            )
                                        }
                                        className="p-1.5 border rounded-lg"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="font-bold text-base">
                                        {calDate.toLocaleString("default", {
                                            month: "long",
                                            year: "numeric",
                                        })}
                                    </span>
                                    <button
                                        onClick={() =>
                                            setCalDate(
                                                new Date(year, month + 1, 1),
                                            )
                                        }
                                        className="p-1.5 border rounded-lg"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-3 text-xs">
                                    <span className="flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>{" "}
                                        Unpaid
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>{" "}
                                        Partial Paid
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>{" "}
                                        Paid
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>{" "}
                                        Yet to Deliver
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
                                {[
                                    "Sun",
                                    "Mon",
                                    "Tue",
                                    "Wed",
                                    "Thu",
                                    "Fri",
                                    "Sat",
                                ].map((d) => (
                                    <div key={d} className="py-1">
                                        {d}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {Array.from({ length: firstDay }).map(
                                    (_, i) => (
                                        <div
                                            key={`e-${i}`}
                                            className="h-16 bg-slate-50 rounded-xl"
                                        />
                                    ),
                                )}
                                {Array.from({ length: daysInMonth }).map(
                                    (_, idx) => {
                                        const day = idx + 1;
                                        const dayPOs = getDayPOs(day);
                                        return (
                                            <button
                                                key={day}
                                                onClick={() =>
                                                    setSelectedDay({
                                                        day,
                                                        pos: dayPOs,
                                                    })
                                                }
                                                className={`h-16 p-1.5 rounded-xl border text-left flex flex-col justify-between hover:border-indigo-500 ${selectedDay?.day === day ? "border-indigo-600 bg-indigo-50" : "bg-white"}`}
                                            >
                                                <span className="text-xs font-semibold">
                                                    {day}
                                                </span>
                                                <div className="flex flex-wrap gap-1">
                                                    {dayPOs.map((po) => {
                                                        const paid = Number(
                                                            po.paid_amount,
                                                        );
                                                        const tot = Number(
                                                            po.total_amount,
                                                        );
                                                        const payColor =
                                                            paid <= 0
                                                                ? "bg-red-500"
                                                                : paid < tot
                                                                  ? "bg-orange-500"
                                                                  : "bg-emerald-500";
                                                        return (
                                                            <span
                                                                key={po.id}
                                                                className="flex gap-0.5"
                                                            >
                                                                <span
                                                                    className={`w-2 h-2 rounded-full ${payColor}`}
                                                                    title={`${po.po_number} Payment`}
                                                                />
                                                                {po.status !==
                                                                    "received" && (
                                                                    <span
                                                                        className="w-2 h-2 rounded-full bg-blue-500"
                                                                        title={`${po.po_number} Yet to Deliver`}
                                                                    />
                                                                )}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </button>
                                        );
                                    },
                                )}
                            </div>

                            {selectedDay && selectedDay.pos.length > 0 && (
                                <div className="border-t pt-3 space-y-2">
                                    <h4 className="font-bold text-sm">
                                        POs on Day {selectedDay.day}
                                    </h4>
                                    {selectedDay.pos.map((po) => (
                                        <div
                                            key={po.id}
                                            className="p-3 bg-slate-50 rounded-xl flex justify-between items-center text-xs"
                                        >
                                            <span>
                                                <strong className="text-indigo-600">
                                                    {po.po_number}
                                                </strong>{" "}
                                                • {po.vendor?.name} •{" "}
                                                {po.status.toUpperCase()}
                                            </span>
                                            <span className="font-bold">
                                                Total: {sym}
                                                {po.total_amount} (Paid: {sym}
                                                {po.paid_amount})
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredPOs.map((po) => (
                                <div
                                    key={po.id}
                                    className="bg-white p-4 rounded-2xl border space-y-3"
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
                                                    {i.product?.name} ×{" "}
                                                    {i.quantity}{" "}
                                                    {i.product?.unit}
                                                </span>
                                                <span>
                                                    {sym}
                                                    {i.subtotal}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Payment Timeline Log */}
                                    {po.payments && po.payments.length > 0 && (
                                        <div className="bg-slate-50 p-3 rounded-xl border space-y-2">
                                            <div className="text-[11px] font-bold text-slate-600 uppercase">
                                                Payment Timeline
                                            </div>
                                            <div className="border-l-2 border-indigo-300 pl-3 space-y-2">
                                                {po.payments.map((p) => (
                                                    <div
                                                        key={p.id}
                                                        className="relative text-xs"
                                                    >
                                                        <span className="w-2 h-2 rounded-full bg-indigo-600 absolute -left-[17px] top-1" />
                                                        <div className="font-semibold text-emerald-700">
                                                            +{sym}
                                                            {p.amount} via{" "}
                                                            {p.payment_method
                                                                .replace(
                                                                    "_",
                                                                    " ",
                                                                )
                                                                .toUpperCase()}
                                                            {p.reference_number && (
                                                                <span className="text-slate-500 font-normal">
                                                                    {" "}
                                                                    (Ref:{" "}
                                                                    {
                                                                        p.reference_number
                                                                    }
                                                                    )
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400">
                                                            {new Date(
                                                                p.created_at,
                                                            ).toLocaleString()}{" "}
                                                            {p.note &&
                                                                `• ${p.note}`}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

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
                                                onClick={() =>
                                                    printA4Invoice(po)
                                                }
                                                className="px-2.5 py-1.5 bg-slate-800 text-white rounded-lg text-xs flex items-center gap-1"
                                            >
                                                <Printer className="w-3.5 h-3.5" />{" "}
                                                A4 Invoice
                                            </button>
                                            {po.status !== "received" && (
                                                <button
                                                    onClick={() =>
                                                        startEditPO(po)
                                                    }
                                                    className="px-2.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs flex items-center gap-1"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />{" "}
                                                    Edit
                                                </button>
                                            )}
                                            <button
                                                onClick={() => sendEmailPO(po)}
                                                className="px-2.5 py-1.5 bg-slate-100 rounded-lg text-xs flex items-center gap-1"
                                            >
                                                <Mail className="w-3.5 h-3.5" />{" "}
                                                Email
                                            </button>
                                            <button
                                                onClick={() =>
                                                    sendWhatsAppPO(po)
                                                }
                                                className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs flex items-center gap-1"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5" />{" "}
                                                WhatsApp
                                            </button>
                                            <button
                                                onClick={() => setSmsPo(po)}
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
                                                    Mark Delivered
                                                </button>
                                            )}
                                            {Number(po.paid_amount) <
                                                Number(po.total_amount) && (
                                                <button
                                                    onClick={() => {
                                                        const rem = (
                                                            Number(
                                                                po.total_amount,
                                                            ) -
                                                            Number(
                                                                po.paid_amount,
                                                            )
                                                        ).toFixed(2);
                                                        setPayingPo(po);
                                                        setPayForm({
                                                            amount: rem,
                                                            payment_method:
                                                                "cash",
                                                            reference_number:
                                                                "",
                                                            note: "",
                                                        });
                                                    }}
                                                    className="px-2.5 py-1.5 bg-amber-500 text-white rounded-lg text-xs flex items-center gap-1"
                                                >
                                                    <DollarSign className="w-3.5 h-3.5" />{" "}
                                                    Pay
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {payingPo && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <form
                        onSubmit={submitPayment}
                        className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-3"
                    >
                        <h3 className="font-bold text-lg">
                            Pay Vendor — {payingPo.po_number}
                        </h3>
                        {payingPo.vendor?.bank_details && (
                            <div className="text-xs bg-slate-50 p-2.5 rounded-xl border text-slate-600 whitespace-pre-line">
                                <strong>Bank / Wallet Info:</strong>
                                {"\n"}
                                {payingPo.vendor.bank_details}
                            </div>
                        )}
                        <input
                            required
                            type="number"
                            step="0.01"
                            placeholder="Amount"
                            value={payForm.amount}
                            onChange={(e) =>
                                setPayForm({
                                    ...payForm,
                                    amount: e.target.value,
                                })
                            }
                            className="w-full p-2.5 border rounded-xl text-sm"
                        />
                        <select
                            value={payForm.payment_method}
                            onChange={(e) =>
                                setPayForm({
                                    ...payForm,
                                    payment_method: e.target.value,
                                })
                            }
                            className="w-full p-2.5 border rounded-xl text-sm"
                        >
                            <option value="cash">Cash</option>
                            <option value="cheque">Cheque</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="bkash">bKash</option>
                        </select>
                        <input
                            required={needsRef}
                            minLength={needsRef ? 4 : undefined}
                            placeholder={
                                needsRef
                                    ? "Reference / TrxID (min 4 chars)"
                                    : "Cheque / Ref No. (optional)"
                            }
                            value={payForm.reference_number}
                            onChange={(e) =>
                                setPayForm({
                                    ...payForm,
                                    reference_number: e.target.value,
                                })
                            }
                            className="w-full p-2.5 border rounded-xl text-sm"
                        />
                        <input
                            placeholder="Note (optional)"
                            value={payForm.note}
                            onChange={(e) =>
                                setPayForm({ ...payForm, note: e.target.value })
                            }
                            className="w-full p-2.5 border rounded-xl text-sm"
                        />
                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setPayingPo(null)}
                                className="flex-1 py-2.5 border rounded-xl text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold"
                            >
                                Record Payment
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {smsPo && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-xs w-full p-6 space-y-3 text-center">
                        <h3 className="font-bold text-base">
                            Send SMS PO Link
                        </h3>
                        {smsPo.vendor?.phone && (
                            <button
                                onClick={() =>
                                    sendSmsToNumber(smsPo, smsPo.vendor.phone)
                                }
                                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold"
                            >
                                Phone: {smsPo.vendor.phone}
                            </button>
                        )}
                        {smsPo.vendor?.whatsapp_number && (
                            <button
                                onClick={() =>
                                    sendSmsToNumber(
                                        smsPo,
                                        smsPo.vendor.whatsapp_number,
                                    )
                                }
                                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
                            >
                                WhatsApp No: {smsPo.vendor.whatsapp_number}
                            </button>
                        )}
                        <button
                            onClick={() => setSmsPo(null)}
                            className="w-full py-2 border rounded-xl text-xs font-semibold"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
