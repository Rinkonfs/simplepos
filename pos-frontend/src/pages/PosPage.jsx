import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    Banknote,
    CreditCard,
    Edit2,
    Minus,
    Plus,
    Printer,
    Share2,
    Smartphone,
    Store,
    Tag,
    Trash2,
    Truck,
    User,
} from "lucide-react";
import api from "../api/axios";
import { useStore } from "../context/StoreContext";

const DEFAULT_IMG = "https://placehold.co/120x120/e2e8f0/64748b?text=No+Photo";

export default function PosPage({ channel = "pos", user, onUserUpdate }) {
    const { t } = useTranslation();
    const location = useLocation();
    const isStaff = ["super_admin", "seller", "shop"].includes(user?.role);
    const {
        products,
        customers,
        currency,
        fetchProducts,
        fetchCustomers,
        fetchSettings,
        notify,
    } = useStore();
    const sym = currency.currency_symbol;

    const [search, setSearch] = useState("");
    const [cart, setCart] = useState([]);
    const [editingOrder, setEditingOrder] = useState(null);

    const [customerSearch, setCustomerSearch] = useState("");
    const [customerId, setCustomerId] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [adjustment, setAdjustment] = useState(0);

    const [codeInput, setCodeInput] = useState("");
    const [appliedDiscount, setAppliedDiscount] = useState(null);

    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [deliveryType, setDeliveryType] = useState("pickup");
    const [address, setAddress] = useState(user?.saved_address || "");
    const [saveAddress, setSaveAddress] = useState(true);

    const [gatewayOpen, setGatewayOpen] = useState(false);
    const [gatewayInput, setGatewayInput] = useState("");
    const [invoiceOrder, setInvoiceOrder] = useState(null);

    useEffect(() => {
        fetchProducts();
        fetchSettings();
        if (isStaff) fetchCustomers();
    }, [fetchProducts, fetchSettings, fetchCustomers, isStaff]);

    useEffect(() => {
        if (user?.saved_address && !address) {
            setAddress(user.saved_address);
        }
    }, [user?.saved_address]);

    const maxAllowed = (p) =>
        p.max_purchase_qty
            ? Math.min(Number(p.stock_qty), Number(p.max_purchase_qty))
            : Number(p.stock_qty);

    const getUnitPrice = (p, qty) =>
        p.bulk_min_qty && p.bulk_price && qty >= Number(p.bulk_min_qty)
            ? Number(p.bulk_price)
            : Number(p.sell_price);

    const startEditingOrder = (order) => {
        setEditingOrder(order);
        setCart(
            order.items.map((i) => {
                const live = products.find((p) => p.id === i.product_id);
                return {
                    product: {
                        ...(live || {}),
                        id: i.product_id,
                        name: i.product?.name || "Product",
                        unit: live?.unit || i.product?.unit || "pcs",
                        sell_price: live?.sell_price || i.unit_price,
                        stock_qty:
                            Number(live?.stock_qty || 0) + Number(i.quantity),
                    },
                    qty: Number(i.quantity),
                };
            }),
        );
        setDeliveryType(order.delivery_type || "pickup");
        setAddress(order.shipping_address || user?.saved_address || "");
        setInvoiceOrder(null);
    };

    useEffect(() => {
        if (location.state?.editOrder && products.length > 0) {
            startEditingOrder(location.state.editOrder);
            window.history.replaceState({}, document.title);
        }
    }, [location.state, products.length]);

    const filteredProducts = products.filter(
        (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase()),
    );

    const filteredCustomers = customers.filter((c) => {
        const q = customerSearch.toLowerCase();
        return (
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            (c.phone || "").toLowerCase().includes(q) ||
            (currency.enable_student_id &&
                (c.student_id || "").toLowerCase().includes(q)) ||
            (currency.enable_card_number &&
                (c.card_number || "").toLowerCase().includes(q)) ||
            (currency.enable_grade_class &&
                (c.grade_class || "").toLowerCase().includes(q))
        );
    });

    const selectedCustomer = customers.find(
        (c) => String(c.id) === String(customerId),
    );

    const formatCustomerExtra = (c) => {
        const parts = [c.phone || c.email];
        if (currency.enable_grade_class && c.grade_class)
            parts.push(`Class: ${c.grade_class}`);
        if (currency.enable_student_id && c.student_id)
            parts.push(`ID: ${c.student_id}`);
        if (currency.enable_card_number && c.card_number)
            parts.push(`Card: ${c.card_number}`);
        return parts.filter(Boolean).join(" • ");
    };

    const addToCart = (product) => {
        setCart((prev) => {
            const limit = maxAllowed(product);
            const existing = prev.find((i) => i.product.id === product.id);
            if (existing) {
                if (existing.qty >= limit) return prev;
                return prev.map((i) =>
                    i.product.id === product.id
                        ? { ...i, qty: Math.min(i.qty + 1, limit) }
                        : i,
                );
            }
            return [...prev, { product, qty: Math.min(1, limit) }];
        });
    };

    const updateQty = (productId, newQty) => {
        if (newQty <= 0)
            return setCart((prev) =>
                prev.filter((i) => i.product.id !== productId),
            );
        setCart((prev) =>
            prev.map((i) =>
                i.product.id === productId
                    ? { ...i, qty: Math.min(newQty, maxAllowed(i.product)) }
                    : i,
            ),
        );
    };

    const applyDiscount = async () => {
        try {
            const res = await api.post("/discount-codes/validate", {
                code: codeInput,
                customer_id: isStaff && customerId ? customerId : null,
            });
            setAppliedDiscount(res.data);
        } catch (err) {
            setAppliedDiscount(null);
            notify(
                err.response?.data?.message || "Invalid discount code",
                "error",
            );
        }
    };

    const subtotal = cart.reduce(
        (sum, i) => sum + getUnitPrice(i.product, i.qty) * i.qty,
        0,
    );
    let discountAmt = appliedDiscount
        ? appliedDiscount.type === "percentage"
            ? subtotal * (appliedDiscount.value / 100)
            : Math.min(appliedDiscount.value, subtotal)
        : 0;
    if (appliedDiscount?.max_discount_amount) {
        discountAmt = Math.min(
            discountAmt,
            Number(appliedDiscount.max_discount_amount),
        );
    }

    const adjAmt = isStaff ? Number(adjustment || 0) : 0;
    const total = Math.max(0, subtotal - discountAmt + adjAmt);

    const submitOrder = async (payStatus = "unpaid", payRef = null) => {
        try {
            let res;
            if (editingOrder) {
                res = await api.put(`/orders/${editingOrder.id}`, {
                    delivery_type: deliveryType,
                    shipping_address:
                        deliveryType === "delivery" ? address : null,
                    status: editingOrder.status,
                    items: cart.map((i) => ({
                        product_id: i.product.id,
                        quantity: i.qty,
                    })),
                });
            } else {
                res = await api.post("/checkout", {
                    channel,
                    payment_method: paymentMethod,
                    payment_status: payStatus,
                    payment_reference: payRef,
                    delivery_type:
                        channel === "ecommerce" ? deliveryType : "pickup",
                    shipping_address:
                        channel === "ecommerce" && deliveryType === "delivery"
                            ? address
                            : null,
                    save_address:
                        channel === "ecommerce" && deliveryType === "delivery"
                            ? saveAddress
                            : false,
                    discount_code: appliedDiscount?.code || null,
                    adjustment_amount: adjAmt,
                    customer_id: isStaff && customerId ? customerId : null,
                    customer_name:
                        isStaff && customerName ? customerName : null,
                    items: cart.map((i) => ({
                        product_id: i.product.id,
                        quantity: i.qty,
                    })),
                });
            }

            if (saveAddress && address && onUserUpdate) {
                const updated = { ...user, saved_address: address };
                localStorage.setItem("user", JSON.stringify(updated));
                onUserUpdate(updated);
            }

            setGatewayOpen(false);
            setGatewayInput("");
            setEditingOrder(null);
            setInvoiceOrder(res.data);

            setCart([]);
            setAppliedDiscount(null);
            setCodeInput("");
            setAdjustment(0);
            setCustomerSearch("");
            setCustomerId("");
            setCustomerName("");
            setPaymentMethod("cash");
            setDeliveryType("pickup");
            fetchProducts(true);
        } catch (err) {
            notify(err.response?.data?.message || "Checkout failed", "error");
        }
    };

    const handleCheckout = () => {
        if (
            channel === "ecommerce" &&
            deliveryType === "delivery" &&
            !address.trim()
        ) {
            notify("Please enter your delivery address", "error");
            return;
        }
        if (
            !editingOrder &&
            channel === "ecommerce" &&
            paymentMethod !== "cash"
        ) {
            setGatewayOpen(true);
            return;
        }
        submitOrder(channel === "pos" ? "paid" : "unpaid", null);
    };

    const formatPayment = (m) => (m || "cash").replace("_", " ").toUpperCase();

    const printInvoice = (o) => {
        const rows = o.items
            .map(
                (i) =>
                    `<tr><td>${i.product?.name} × ${i.quantity}</td><td style="text-align:right">${sym}${i.subtotal}</td></tr>`,
            )
            .join("");
        const win = window.open("", "_blank", "width=400,height=600");
        win.document.write(
            `<html><head><title>Invoice ${o.order_number}</title><style>body{font-family:sans-serif;padding:20px;font-size:13px}h2{text-align:center;margin-bottom:4px}p{text-align:center;color:#555;margin:2px 0;font-size:12px}table{width:100%;border-collapse:collapse;margin:16px 0}td{padding:6px 0;border-bottom:1px dashed #ddd}.total{font-weight:bold;font-size:16px;border-top:2px solid #000;padding-top:8px;display:flex;justify-content:space-between}</style></head><body><h2>INVOICE</h2><p>${o.order_number}</p><p>${new Date(o.created_at).toLocaleString()}</p><p>Customer: ${o.customer_name || o.user?.name || "Walk-in"}</p><p>Payment: ${formatPayment(o.payment_method)} (${(o.payment_status || "unpaid").toUpperCase()})</p><table>${rows}</table>${Number(o.discount_amount) > 0 ? `<div style="display:flex;justify-content:space-between"><span>Discount (${o.discount_code})</span><span>-${sym}${o.discount_amount}</span></div>` : ""}${Number(o.adjustment_amount) !== 0 ? `<div style="display:flex;justify-content:space-between"><span>Adjustment</span><span>${sym}${o.adjustment_amount}</span></div>` : ""}<div class="total"><span>Total</span><span>${sym}${o.total_amount}</span></div><script>window.onload=()=>{window.print();window.close()}</script></body></html>`,
        );
        win.document.close();
    };

    const shareInvoice = (o) => {
        const text =
            `Invoice ${o.order_number}\nDate: ${new Date(o.created_at).toLocaleString()}\nPayment: ${formatPayment(o.payment_method)} (${o.payment_status})\nTotal: ${sym}${o.total_amount}\nItems:\n` +
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
                <input
                    type="text"
                    placeholder={t("search_products")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm"
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredProducts.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => addToCart(p)}
                            disabled={Number(p.stock_qty) <= 0}
                            className="p-3 bg-white rounded-2xl border border-slate-200 text-left hover:border-indigo-500 active:scale-95 transition disabled:opacity-50 space-y-2"
                        >
                            <div className="w-full aspect-square bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center p-2 border border-slate-100">
                                <img
                                    src={p.image_url || DEFAULT_IMG}
                                    alt={p.name}
                                    onError={(e) => {
                                        e.currentTarget.src = DEFAULT_IMG;
                                    }}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div className="font-semibold text-sm truncate">
                                {p.name}
                            </div>
                            <div className="text-xs text-slate-500">
                                {p.sku}
                            </div>
                            {p.bulk_min_qty && p.bulk_price && (
                                <div className="text-[10px] text-emerald-600 font-semibold">
                                    Buy {p.bulk_min_qty}+ {p.unit} @ {sym}
                                    {p.bulk_price}
                                </div>
                            )}
                            {p.max_purchase_qty && (
                                <div className="text-[10px] text-amber-600">
                                    Max {p.max_purchase_qty} {p.unit}/order
                                </div>
                            )}
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-indigo-600">
                                    {sym}
                                    {p.sell_price}
                                </span>
                                <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded-full">
                                    {p.stock_qty} {p.unit}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-fit space-y-4">
                {editingOrder ? (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center text-xs">
                        <span className="font-bold text-amber-800">
                            Editing {editingOrder.order_number}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setEditingOrder(null);
                                setCart([]);
                            }}
                            className="text-red-600 font-semibold hover:underline"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <h2 className="font-bold text-lg">
                        {channel === "pos" ? t("pos") : t("shop")}
                    </h2>
                )}

                {isStaff && !editingOrder && (
                    <div className="space-y-2 bg-slate-50 p-3 rounded-xl border">
                        <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />{" "}
                            {t("customer_staff_only")}
                        </label>
                        <input
                            placeholder="Search name, phone, student ID, card, class..."
                            value={customerSearch}
                            onChange={(e) => {
                                setCustomerSearch(e.target.value);
                                if (customerId) setCustomerId("");
                            }}
                            className="w-full p-2 border rounded-lg text-xs bg-white"
                        />
                        {customerSearch &&
                            !customerId &&
                            filteredCustomers.length > 0 && (
                                <div className="bg-white border rounded-xl max-h-40 overflow-y-auto divide-y shadow-sm">
                                    {filteredCustomers.map((c) => (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => {
                                                setCustomerId(String(c.id));
                                                setCustomerName(c.name);
                                                setCustomerSearch(
                                                    `${c.name} (${formatCustomerExtra(c)})`,
                                                );
                                                if (c.saved_address)
                                                    setAddress(c.saved_address);
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50"
                                        >
                                            <div className="font-semibold">
                                                {c.name}
                                            </div>
                                            <div className="text-slate-500">
                                                {formatCustomerExtra(c)}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        <select
                            value={customerId}
                            onChange={(e) => {
                                const id = e.target.value;
                                setCustomerId(id);
                                const found = customers.find(
                                    (c) => String(c.id) === String(id),
                                );
                                if (found) {
                                    setCustomerName(found.name);
                                    if (found.saved_address)
                                        setAddress(found.saved_address);
                                }
                            }}
                            className="w-full p-2 border rounded-lg text-xs bg-white"
                        >
                            <option value="">{t("walk_in_select")}</option>
                            {filteredCustomers.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({formatCustomerExtra(c)})
                                </option>
                            ))}
                        </select>

                        {selectedCustomer && (
                            <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-xs space-y-0.5 text-slate-700">
                                <div className="font-bold text-indigo-700">
                                    {selectedCustomer.name}
                                </div>
                                <div>
                                    {selectedCustomer.phone ||
                                        selectedCustomer.email}
                                </div>
                                {currency.enable_grade_class &&
                                    selectedCustomer.grade_class && (
                                        <div>
                                            <strong>Class:</strong>{" "}
                                            {selectedCustomer.grade_class}
                                        </div>
                                    )}
                                {currency.enable_student_id &&
                                    selectedCustomer.student_id && (
                                        <div>
                                            <strong>Student ID:</strong>{" "}
                                            {selectedCustomer.student_id}
                                        </div>
                                    )}
                                {currency.enable_card_number &&
                                    selectedCustomer.card_number && (
                                        <div>
                                            <strong>Card No:</strong>{" "}
                                            {selectedCustomer.card_number}
                                        </div>
                                    )}
                            </div>
                        )}

                        {!customerId && (
                            <input
                                placeholder={t("walk_in_placeholder")}
                                value={customerName}
                                onChange={(e) =>
                                    setCustomerName(e.target.value)
                                }
                                className="w-full p-2 border rounded-lg text-xs bg-white"
                            />
                        )}
                    </div>
                )}

                {cart.length === 0 ? (
                    <div className="text-sm text-slate-400 text-center py-6">
                        {t("cart_empty")}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {cart.map((item) => {
                            const unitPrice = getUnitPrice(
                                item.product,
                                item.qty,
                            );
                            const isBulk =
                                unitPrice < Number(item.product.sell_price);
                            return (
                                <div
                                    key={item.product.id}
                                    className="flex items-center justify-between gap-2 text-sm border-b pb-3"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium truncate">
                                            {item.product.name}
                                            {isBulk && (
                                                <span className="ml-1 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                                                    Bulk!
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {sym}
                                            {unitPrice} × {item.qty}{" "}
                                            {item.product.unit} ={" "}
                                            <span className="font-semibold text-indigo-600">
                                                {sym}
                                                {(unitPrice * item.qty).toFixed(
                                                    2,
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateQty(
                                                    item.product.id,
                                                    item.qty - 1,
                                                )
                                            }
                                            className="p-1 rounded-lg bg-slate-100"
                                        >
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            max={maxAllowed(item.product)}
                                            value={item.qty}
                                            onChange={(e) => {
                                                const val = parseFloat(
                                                    e.target.value,
                                                );
                                                if (!isNaN(val))
                                                    updateQty(
                                                        item.product.id,
                                                        Math.max(0.01, val),
                                                    );
                                            }}
                                            className="w-14 text-center font-semibold text-xs p-1 border border-slate-200 rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateQty(
                                                    item.product.id,
                                                    item.qty + 1,
                                                )
                                            }
                                            disabled={
                                                item.qty >=
                                                maxAllowed(item.product)
                                            }
                                            className="p-1 rounded-lg bg-slate-100 disabled:opacity-40"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateQty(item.product.id, 0)
                                            }
                                            className="p-1 rounded-lg text-red-500 hover:bg-red-50 ml-0.5"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!editingOrder && (
                    <>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                                <input
                                    placeholder={t("discount_code")}
                                    value={codeInput}
                                    onChange={(e) =>
                                        setCodeInput(
                                            e.target.value.toUpperCase(),
                                        )
                                    }
                                    className="w-full pl-8 pr-2 py-2 border rounded-xl text-xs uppercase"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={applyDiscount}
                                className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
                            >
                                {t("apply")}
                            </button>
                        </div>
                        {appliedDiscount && (
                            <div className="text-xs text-emerald-600 font-medium">
                                {t("applied")} {appliedDiscount.code}: -{sym}
                                {discountAmt.toFixed(2)}
                            </div>
                        )}

                        {isStaff && (
                            <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-semibold text-slate-600">
                                    {t("adjustment")}
                                </span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={adjustment}
                                    onChange={(e) =>
                                        setAdjustment(e.target.value)
                                    }
                                    className="w-24 p-1.5 border rounded-lg text-right"
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600">
                                Payment Method
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    {
                                        id: "cash",
                                        label:
                                            channel === "ecommerce"
                                                ? "COD"
                                                : "Cash",
                                        icon: Banknote,
                                    },
                                    {
                                        id: "card",
                                        label: "Card",
                                        icon: CreditCard,
                                    },
                                    {
                                        id: "mobile_wallet",
                                        label: "Wallet",
                                        icon: Smartphone,
                                    },
                                ].map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setPaymentMethod(id)}
                                        className={`flex items-center justify-center gap-1 p-2 rounded-xl border text-xs font-semibold transition ${
                                            paymentMethod === id
                                                ? "bg-indigo-50 border-indigo-600 text-indigo-600"
                                                : "bg-white text-slate-600"
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" /> {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {channel === "ecommerce" && (
                    <div className="space-y-3 pt-1">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setDeliveryType("pickup")}
                                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold ${deliveryType === "pickup" ? "bg-indigo-50 border-indigo-600 text-indigo-600" : "bg-white text-slate-600"}`}
                            >
                                <Store className="w-4 h-4" /> {t("pick_up")}
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeliveryType("delivery")}
                                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-semibold ${deliveryType === "delivery" ? "bg-indigo-50 border-indigo-600 text-indigo-600" : "bg-white text-slate-600"}`}
                            >
                                <Truck className="w-4 h-4" />{" "}
                                {t("home_delivery")}
                            </button>
                        </div>
                        {deliveryType === "delivery" && (
                            <div className="space-y-2">
                                <textarea
                                    placeholder={t("enter_address")}
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="w-full p-2.5 border rounded-xl text-sm"
                                    rows={2}
                                />
                                <label className="flex items-center gap-2 text-xs text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={saveAddress}
                                        onChange={(e) =>
                                            setSaveAddress(e.target.checked)
                                        }
                                    />
                                    {t("save_address")}
                                </label>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>{t("total")}</span>
                    <span>
                        {sym}
                        {total.toFixed(2)}
                    </span>
                </div>

                <button
                    onClick={handleCheckout}
                    disabled={cart.length === 0}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold disabled:opacity-50 transition"
                >
                    {editingOrder ? "Update Order" : t("checkout")}
                </button>
            </div>

            {gatewayOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            submitOrder("paid", `GW-${Date.now()}`);
                        }}
                        className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4"
                    >
                        <h3 className="font-bold text-lg text-center">
                            {paymentMethod === "card"
                                ? "Card Payment Gateway"
                                : "Mobile Wallet Payment"}
                        </h3>
                        <p className="text-center text-2xl font-bold text-indigo-600">
                            {sym}
                            {total.toFixed(2)}
                        </p>
                        <input
                            required
                            placeholder={
                                paymentMethod === "card"
                                    ? "Card Number (e.g. 4242 •••• 4242)"
                                    : "Mobile Wallet Number"
                            }
                            value={gatewayInput}
                            onChange={(e) => setGatewayInput(e.target.value)}
                            className="w-full p-3 border rounded-xl text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setGatewayOpen(false)}
                                className="py-2.5 border rounded-xl text-sm font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold"
                            >
                                Pay Now
                            </button>
                        </div>
                    </form>
                </div>
            )}

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
                            {Number(invoiceOrder.discount_amount) > 0 && (
                                <div className="flex justify-between text-xs text-emerald-600">
                                    <span>
                                        Discount ({invoiceOrder.discount_code})
                                    </span>
                                    <span>
                                        -{sym}
                                        {invoiceOrder.discount_amount}
                                    </span>
                                </div>
                            )}
                            {Number(invoiceOrder.adjustment_amount) !== 0 && (
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Adjustment</span>
                                    <span>
                                        {sym}
                                        {invoiceOrder.adjustment_amount}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="border-t pt-2 flex justify-between font-bold text-base">
                            <span>{t("total")}</span>
                            <span>
                                {sym}
                                {invoiceOrder.total_amount}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                            <button
                                onClick={() => printInvoice(invoiceOrder)}
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
                            {invoiceOrder.status === "pending" && (
                                <button
                                    onClick={() =>
                                        startEditingOrder(invoiceOrder)
                                    }
                                    className="py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
                                >
                                    <Edit2 className="w-3.5 h-3.5" /> Edit
                                </button>
                            )}
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
