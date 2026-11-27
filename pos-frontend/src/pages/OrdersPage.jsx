import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    Check,
    X,
    Package,
    Truck,
    Store,
    Edit2,
    Printer,
    Share2,
    Calendar,
    Trash2,
    Plus,
    CheckSquare,
} from "lucide-react";
import api from "../api/axios";
import { useStore } from "../context/StoreContext";

export default function OrdersPage({ user }) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { currency, products, fetchProducts, notify } = useStore();
    const sym = currency.currency_symbol;
    const isStaff = user.role !== "customer";

    const [orders, setOrders] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [channelFilter, setChannelFilter] = useState("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const [editingOrder, setEditingOrder] = useState(null);
    const [addProductId, setAddProductId] = useState("");
    const [invoiceOrder, setInvoiceOrder] = useState(null);

    const loadOrders = () => {
        api.get("/orders").then((res) => setOrders(res.data));
    };

    useEffect(() => {
        loadOrders();
        fetchProducts();
    }, [fetchProducts]);

    const updateStatus = async (id, status) => {
        await api.patch(`/orders/${id}/status`, { status });
        loadOrders();
        fetchProducts(true);
    };

    const cancelOrder = async (id) => {
        if (!window.confirm("Cancel this order?")) return;
        try {
            await api.patch(`/orders/${id}/cancel`);
            loadOrders();
            fetchProducts(true);
        } catch (err) {
            notify(
                err.response?.data?.message || "Cannot cancel order",
                "error",
            );
        }
    };

    const deleteOrder = async (id) => {
        if (!window.confirm("Delete this order?")) return;
        try {
            await api.delete(`/orders/${id}`);
            loadOrders();
            fetchProducts(true);
        } catch (err) {
            notify(
                err.response?.data?.message || "Cannot delete order",
                "error",
            );
        }
    };

    const addProductToEdit = () => {
        if (!addProductId) return;
        const prod = products.find((p) => p.id === Number(addProductId));
        if (!prod) return;

        const exists = editingOrder.items.find(
            (i) => Number(i.product_id) === prod.id,
        );
        if (exists) {
            setEditingOrder({
                ...editingOrder,
                items: editingOrder.items.map((i) =>
                    Number(i.product_id) === prod.id
                        ? { ...i, quantity: Number(i.quantity) + 1 }
                        : i,
                ),
            });
        } else {
            setEditingOrder({
                ...editingOrder,
                items: [
                    ...editingOrder.items,
                    {
                        product_id: prod.id,
                        quantity: 1,
                        product: { id: prod.id, name: prod.name },
                    },
                ],
            });
        }
        setAddProductId("");
    };

    const removeItemFromEdit = (productId) => {
        if (editingOrder.items.length <= 1) {
            notify("Order must have at least 1 product.", "error");
            return;
        }
        setEditingOrder({
            ...editingOrder,
            items: editingOrder.items.filter(
                (i) => Number(i.product_id) !== Number(productId),
            ),
        });
    };

    const saveEditedOrder = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/orders/${editingOrder.id}`, {
                delivery_type: editingOrder.delivery_type,
                shipping_address: editingOrder.shipping_address,
                status: editingOrder.status,
                items: editingOrder.items.map((i) => ({
                    product_id: i.product_id,
                    quantity: Number(i.quantity),
                })),
            });
            setEditingOrder(null);
            loadOrders();
            fetchProducts(true);
        } catch (err) {
            notify(
                err.response?.data?.message || "Failed to update order",
                "error",
            );
        }
    };

    const filtered = orders.filter((o) => {
        const matchesSearch =
            o.order_number.toLowerCase().includes(search.toLowerCase()) ||
            (o.user?.name || "").toLowerCase().includes(search.toLowerCase()) ||
            (o.customer_name || "")
                .toLowerCase()
                .includes(search.toLowerCase());
        const matchesStatus =
            statusFilter === "all" || o.status === statusFilter;
        const matchesChannel =
            channelFilter === "all" || o.channel === channelFilter;
        const d = o.created_at.slice(0, 10);
        const matchesDate =
            (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
        return matchesSearch && matchesStatus && matchesChannel && matchesDate;
    });

    const toggleSelect = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const selectAllAccepted = () => {
        const acceptedIds = filtered
            .filter((o) => o.status === "accepted")
            .map((o) => o.id);
        setSelectedIds(acceptedIds);
    };

    const badge = (status) => {
        const map = {
            pending: "bg-amber-100 text-amber-700",
            accepted: "bg-blue-100 text-blue-700",
            ready_for_delivery: "bg-purple-100 text-purple-700",
            shipped: "bg-cyan-100 text-cyan-700",
            completed: "bg-emerald-100 text-emerald-700",
            rejected: "bg-red-100 text-red-700",
            cancelled: "bg-slate-200 text-slate-700",
        };
        return map[status] || "bg-slate-100 text-slate-600";
    };

    const formatPayment = (m) => (m || "cash").replace("_", " ").toUpperCase();

    const buildInvoiceHtml = (o) => {
        const rows = o.items
            .map(
                (i) =>
                    `<tr><td>${i.product?.name} × ${i.quantity}</td><td style="text-align:right">${sym}${i.subtotal}</td></tr>`,
            )
            .join("");
        return `
      <div class="invoice-page">
        <h2>INVOICE</h2>
        <p>${o.order_number}</p>
        <p>${new Date(o.created_at).toLocaleString()}</p>
        <p>Customer: ${o.customer_name || o.user?.name || "Walk-in"}</p>
        ${o.delivery_type === "delivery" && o.shipping_address ? `<p>Address: ${o.shipping_address}</p>` : ""}
        <p>Payment: ${formatPayment(o.payment_method)} (${(o.payment_status || "unpaid").toUpperCase()})</p>
        <table>${rows}</table>
        ${Number(o.discount_amount) > 0 ? `<div class="row"><span>Discount (${o.discount_code})</span><span>-${sym}${o.discount_amount}</span></div>` : ""}
        ${Number(o.adjustment_amount) !== 0 ? `<div class="row"><span>Adjustment</span><span>${sym}${o.adjustment_amount}</span></div>` : ""}
        <div class="total"><span>Total</span><span>${sym}${o.total_amount}</span></div>
      </div>
    `;
    };

    const printInvoices = (orderList) => {
        if (!orderList.length) return;
        const body = orderList.map(buildInvoiceHtml).join("");
        const win = window.open("", "_blank", "width=450,height=650");
        win.document.write(`
      <html><head><title>Invoices</title>
      <style>
        body { font-family: sans-serif; margin: 0; font-size: 13px; }
        .invoice-page { padding: 20px; page-break-after: always; }
        .invoice-page:last-child { page-break-after: auto; }
        h2 { text-align: center; margin-bottom: 4px; }
        p { text-align: center; color: #555; margin: 2px 0; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        td { padding: 6px 0; border-bottom: 1px dashed #ddd; }
        .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .total { font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 8px; display: flex; justify-content: space-between; }
      </style></head>
      <body>${body}<script>window.onload=()=>{window.print();window.close()}</script></body></html>
    `);
        win.document.close();
    };

    const shareInvoice = (o) => {
        const text =
            `Invoice ${o.order_number}\nDate: ${new Date(o.created_at).toLocaleString()}\nPayment: ${formatPayment(o.payment_method)}\nTotal: ${sym}${o.total_amount}\nItems:\n` +
            o.items
                .map(
                    (i) =>
                        `- ${i.product?.name} x${i.quantity}: ${sym}${i.subtotal}`,
                )
                .join("\n");
        if (navigator.share) {
            navigator.share({ title: `Invoice ${o.order_number}`, text });
        } else {
            window.open(
                `https://wa.me/?text=${encodeURIComponent(text)}`,
                "_blank",
            );
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                    {user.role === "customer"
                        ? t("my_orders")
                        : t("order_management")}
                </h1>

                {isStaff && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={selectAllAccepted}
                            className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-100"
                        >
                            <CheckSquare className="w-3.5 h-3.5" /> Select All
                            Accepted
                        </button>
                        {selectedIds.length > 0 && (
                            <>
                                <button
                                    onClick={() =>
                                        printInvoices(
                                            orders.filter((o) =>
                                                selectedIds.includes(o.id),
                                            ),
                                        )
                                    }
                                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-700"
                                >
                                    <Printer className="w-3.5 h-3.5" /> Print
                                    Selected ({selectedIds.length})
                                </button>
                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="px-3 py-2 border rounded-xl text-xs font-semibold"
                                >
                                    Clear
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Filters with Date Range */}
            <div className="bg-white p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <input
                    placeholder="Search Order # or Customer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="p-2.5 border rounded-xl text-sm"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="p-2.5 border rounded-xl text-sm"
                >
                    <option value="all">All Status</option>
                    <option value="pending">{t("pending")}</option>
                    <option value="accepted">{t("accepted")}</option>
                    <option value="ready_for_delivery">
                        Ready for Delivery
                    </option>
                    <option value="shipped">Shipped</option>
                    <option value="completed">{t("completed")}</option>
                    <option value="rejected">{t("rejected")}</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <select
                    value={channelFilter}
                    onChange={(e) => setChannelFilter(e.target.value)}
                    className="p-2.5 border rounded-xl text-sm"
                >
                    <option value="all">All Channels (POS & Shop)</option>
                    <option value="pos">POS</option>
                    <option value="ecommerce">E-Commerce</option>
                </select>
                <input
                    type="date"
                    title="From Date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="p-2.5 border rounded-xl text-sm"
                />
                <input
                    type="date"
                    title="To Date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="p-2.5 border rounded-xl text-sm"
                />
            </div>

            <div className="space-y-3">
                {filtered.map((o) => {
                    const canEdit = isStaff || o.status === "pending";
                    const canDelete = isStaff || o.status === "pending";
                    const canCancel =
                        user.role === "customer" &&
                        ["accepted", "ready_for_delivery"].includes(o.status);

                    return (
                        <div
                            key={o.id}
                            className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3"
                        >
                            <div className="flex flex-wrap justify-between items-center gap-2 border-b pb-3">
                                <div className="flex items-start gap-2.5">
                                    {isStaff && (
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(o.id)}
                                            onChange={() => toggleSelect(o.id)}
                                            className="mt-1 w-4 h-4 accent-indigo-600 cursor-pointer"
                                        />
                                    )}
                                    <div>
                                        <span className="font-bold text-indigo-600">
                                            {o.order_number}
                                        </span>
                                        <span className="text-xs text-slate-500 ml-2">
                                            {o.customer_name || o.user?.name} •{" "}
                                            {o.channel.toUpperCase()} •{" "}
                                            {formatPayment(o.payment_method)}
                                        </span>
                                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                            <Calendar className="w-3 h-3" />{" "}
                                            {new Date(
                                                o.created_at,
                                            ).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1 text-xs bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                                        {o.delivery_type === "delivery" ? (
                                            <Truck className="w-3.5 h-3.5" />
                                        ) : (
                                            <Store className="w-3.5 h-3.5" />
                                        )}
                                        {o.delivery_type === "delivery"
                                            ? t("home_delivery")
                                            : t("pick_up")}
                                    </span>
                                    <span
                                        className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase ${badge(o.status)}`}
                                    >
                                        {o.status.replace(/_/g, " ")}
                                    </span>
                                </div>
                            </div>

                            {o.delivery_type === "delivery" &&
                                o.shipping_address && (
                                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                                        <strong>
                                            {t("delivery_address")}:
                                        </strong>{" "}
                                        {o.shipping_address}
                                    </div>
                                )}

                            <div className="space-y-1 text-sm">
                                {o.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex justify-between"
                                    >
                                        <span>
                                            {item.product?.name} ×{" "}
                                            {item.quantity}
                                        </span>
                                        <span className="font-medium">
                                            {sym}
                                            {item.subtotal}
                                        </span>
                                    </div>
                                ))}
                                {Number(o.discount_amount) > 0 && (
                                    <div className="flex justify-between text-xs text-emerald-600">
                                        <span>
                                            Discount ({o.discount_code})
                                        </span>
                                        <span>
                                            -{sym}
                                            {o.discount_amount}
                                        </span>
                                    </div>
                                )}
                                {Number(o.adjustment_amount) !== 0 && (
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Adjustment</span>
                                        <span>
                                            {sym}
                                            {o.adjustment_amount}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap justify-between items-center pt-2 border-t gap-2">
                                <div className="font-bold text-base">
                                    {t("total")}: {sym}
                                    {o.total_amount}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setInvoiceOrder(o)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
                                    >
                                        <Printer className="w-3.5 h-3.5" />{" "}
                                        Invoice
                                    </button>

                                    {canEdit && (
                                        <button
                                            onClick={() =>
                                                user.role === "customer"
                                                    ? navigate("/shop", {
                                                          state: {
                                                              editOrder: o,
                                                          },
                                                      })
                                                    : setEditingOrder(
                                                          JSON.parse(
                                                              JSON.stringify(o),
                                                          ),
                                                      )
                                            }
                                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-semibold hover:bg-indigo-100"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />{" "}
                                            Edit
                                        </button>
                                    )}

                                    {canCancel && (
                                        <button
                                            onClick={() => cancelOrder(o.id)}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600"
                                        >
                                            <X className="w-3.5 h-3.5" /> Cancel
                                            Order
                                        </button>
                                    )}

                                    {canDelete && (
                                        <button
                                            onClick={() => deleteOrder(o.id)}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />{" "}
                                            Delete
                                        </button>
                                    )}

                                    {isStaff && o.status === "pending" && (
                                        <>
                                            <button
                                                onClick={() =>
                                                    updateStatus(
                                                        o.id,
                                                        "accepted",
                                                    )
                                                }
                                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
                                            >
                                                <Check className="w-3.5 h-3.5" />{" "}
                                                {t("accept")}
                                            </button>
                                            <button
                                                onClick={() =>
                                                    updateStatus(
                                                        o.id,
                                                        "rejected",
                                                    )
                                                }
                                                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
                                            >
                                                <X className="w-3.5 h-3.5" />{" "}
                                                {t("reject")}
                                            </button>
                                        </>
                                    )}

                                    {isStaff &&
                                        o.status === "accepted" &&
                                        o.delivery_type === "delivery" && (
                                            <button
                                                onClick={() =>
                                                    updateStatus(
                                                        o.id,
                                                        "ready_for_delivery",
                                                    )
                                                }
                                                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700"
                                            >
                                                <Package className="w-3.5 h-3.5" />{" "}
                                                Ready for Delivery
                                            </button>
                                        )}

                                    {isStaff &&
                                        o.status === "ready_for_delivery" && (
                                            <button
                                                onClick={() =>
                                                    updateStatus(
                                                        o.id,
                                                        "shipped",
                                                    )
                                                }
                                                className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-semibold hover:bg-cyan-700"
                                            >
                                                <Truck className="w-3.5 h-3.5" />{" "}
                                                Mark Shipped
                                            </button>
                                        )}

                                    {isStaff &&
                                        ((o.status === "accepted" &&
                                            o.delivery_type !== "delivery") ||
                                            o.status === "shipped") && (
                                            <button
                                                onClick={() =>
                                                    updateStatus(
                                                        o.id,
                                                        "completed",
                                                    )
                                                }
                                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                                            >
                                                <Check className="w-3.5 h-3.5" />{" "}
                                                {t("mark_completed")}
                                            </button>
                                        )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Staff Edit Order Modal */}
            {editingOrder && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <form
                        onSubmit={saveEditedOrder}
                        className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4"
                    >
                        <h3 className="font-bold text-lg">
                            Edit Order {editingOrder.order_number}
                        </h3>

                        <select
                            value={editingOrder.status}
                            onChange={(e) =>
                                setEditingOrder({
                                    ...editingOrder,
                                    status: e.target.value,
                                })
                            }
                            className="w-full p-2.5 border rounded-xl text-sm"
                        >
                            <option value="pending">Pending</option>
                            <option value="accepted">Accepted</option>
                            <option value="ready_for_delivery">
                                Ready for Delivery
                            </option>
                            <option value="shipped">Shipped</option>
                            <option value="completed">Completed</option>
                            <option value="rejected">Rejected</option>
                        </select>

                        <select
                            value={editingOrder.delivery_type}
                            onChange={(e) =>
                                setEditingOrder({
                                    ...editingOrder,
                                    delivery_type: e.target.value,
                                })
                            }
                            className="w-full p-2.5 border rounded-xl text-sm"
                        >
                            <option value="pickup">Store Pickup</option>
                            <option value="delivery">Home Delivery</option>
                        </select>

                        {editingOrder.delivery_type === "delivery" && (
                            <textarea
                                value={editingOrder.shipping_address || ""}
                                onChange={(e) =>
                                    setEditingOrder({
                                        ...editingOrder,
                                        shipping_address: e.target.value,
                                    })
                                }
                                className="w-full p-2.5 border rounded-xl text-sm"
                                placeholder="Shipping Address"
                            />
                        )}

                        <div className="flex gap-2">
                            <select
                                value={addProductId}
                                onChange={(e) =>
                                    setAddProductId(e.target.value)
                                }
                                className="flex-1 p-2 border rounded-xl text-xs"
                            >
                                <option value="">
                                    -- Add Product to Order --
                                </option>
                                {products
                                    .filter((p) => p.stock_qty > 0)
                                    .map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({sym}
                                            {p.sell_price})
                                        </option>
                                    ))}
                            </select>
                            <button
                                type="button"
                                onClick={addProductToEdit}
                                className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add
                            </button>
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto border-t pt-2">
                            {editingOrder.items.map((item, idx) => (
                                <div
                                    key={item.product_id}
                                    className="flex justify-between items-center text-sm gap-2"
                                >
                                    <span className="truncate flex-1">
                                        {item.product?.name}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={item.quantity}
                                        onChange={(e) => {
                                            const items = [
                                                ...editingOrder.items,
                                            ];
                                            items[idx].quantity =
                                                e.target.value;
                                            setEditingOrder({
                                                ...editingOrder,
                                                items,
                                            });
                                        }}
                                        className="w-16 p-1.5 border rounded-lg text-right text-xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeItemFromEdit(item.product_id)
                                        }
                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setEditingOrder(null)}
                                className="flex-1 py-2.5 border rounded-xl text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Invoice Modal */}
            {invoiceOrder && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4">
                        <div className="text-center border-b pb-3">
                            <h3 className="font-bold text-lg">INVOICE</h3>
                            <p className="text-xs text-slate-500">
                                {invoiceOrder.order_number} •{" "}
                                {new Date(
                                    invoiceOrder.created_at,
                                ).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                                Customer:{" "}
                                {invoiceOrder.customer_name ||
                                    invoiceOrder.user?.name}
                            </p>
                            <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                                Payment:{" "}
                                {formatPayment(invoiceOrder.payment_method)} (
                                {(
                                    invoiceOrder.payment_status || "unpaid"
                                ).toUpperCase()}
                                )
                            </p>
                        </div>
                        <div className="space-y-1 text-sm">
                            {invoiceOrder.items.map((i) => (
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
                        <div className="border-t pt-2 flex justify-between font-bold text-base">
                            <span>{t("total")}</span>
                            <span>
                                {sym}
                                {invoiceOrder.total_amount}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-2">
                            <button
                                onClick={() => printInvoices([invoiceOrder])}
                                className="py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
                            >
                                <Printer className="w-3.5 h-3.5" /> Print
                            </button>
                            <button
                                onClick={() => shareInvoice(invoiceOrder)}
                                className="py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
                            >
                                <Share2 className="w-3.5 h-3.5" /> Share
                            </button>
                            <button
                                onClick={() => setInvoiceOrder(null)}
                                className="py-2 border rounded-xl text-xs font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
