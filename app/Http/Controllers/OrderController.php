<?php

namespace App\Http\Controllers;

use App\Models\DiscountCode;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::with(['items.product:id,name,sku,image_url', 'user:id,name,email,phone'])->latest();

        if ($request->user()->role === 'customer') {
            $query->where('user_id', $request->user()->id);
        }

        return response()->json($query->get());
    }

    public function checkout(Request $request)
    {
        $request->validate([
            'channel' => 'required|in:pos,ecommerce',
            'payment_method' => 'nullable|in:cash,card,mobile_wallet',
            'payment_status' => 'nullable|in:unpaid,paid',
            'payment_reference' => 'nullable|string',
            'delivery_type' => 'nullable|in:pickup,delivery',
            'shipping_address' => 'nullable|string',
            'save_address' => 'nullable|boolean',
            'discount_code' => 'nullable|string',
            'adjustment_amount' => 'nullable|numeric',
            'customer_id' => 'nullable|exists:users,id',
            'customer_name' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'nullable|numeric|min:0',
        ]);

        $isStaff = in_array($request->user()->role, ['super_admin', 'seller']);
        $adjustment = $isStaff ? (float) ($request->adjustment_amount ?? 0) : 0;
        $orderUserId = ($isStaff && $request->customer_id) ? $request->customer_id : $request->user()->id;

        if ($request->save_address && $request->shipping_address) {
            $request->user()->update(['saved_address' => $request->shipping_address]);
        }

        return DB::transaction(function () use ($request, $adjustment, $orderUserId, $isStaff) {
            $subtotalSum = 0;
            $categoryTotals = [];

            $order = Order::create([
                'order_number' => strtoupper($request->channel) . '-' . Str::upper(Str::random(6)),
                'user_id' => $orderUserId,
                'customer_name' => $isStaff ? $request->customer_name : null,
                'channel' => $request->channel,
                'payment_method' => $request->payment_method ?? 'cash',
                'payment_status' => $request->channel === 'pos' ? 'paid' : ($request->payment_status ?? 'unpaid'),
                'payment_reference' => $request->payment_reference,
                'delivery_type' => $request->delivery_type ?? 'pickup',
                'total_amount' => 0,
                'status' => $request->channel === 'pos' ? 'completed' : 'pending',
                'shipping_address' => $request->delivery_type === 'delivery' ? $request->shipping_address : null,
            ]);

            foreach ($request->items as $item) {
                $product = Product::lockForUpdate()->findOrFail($item['product_id']);
                if ($product->stock_qty < $item['quantity']) {
                    abort(422, "Insufficient stock for {$product->name}");
                }

                $unitPrice = ($isStaff && isset($item['unit_price']))
                    ? (float) $item['unit_price']
                    : (float) $product->sell_price;

                $subtotal = $unitPrice * $item['quantity'];
                $subtotalSum += $subtotal;

                if ($product->category_id) {
                    $categoryTotals[$product->category_id] = ($categoryTotals[$product->category_id] ?? 0) + $subtotal;
                }

                $order->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $unitPrice,
                    'subtotal' => $subtotal,
                ]);

                $product->decrement('stock_qty', $item['quantity']);

                StockMovement::create([
                    'product_id' => $product->id,
                    'user_id' => $request->user()->id,
                    'type' => 'out',
                    'quantity' => $item['quantity'],
                    'reference' => "Order #{$order->order_number}",
                ]);
            }

            $discountAmount = 0;
            $appliedCode = null;
            if ($request->discount_code) {
                $dc = DiscountCode::where('code', strtoupper(trim($request->discount_code)))
                    ->where('is_active', true)
                    ->first();

                if ($dc) {
                    $validExpiry = !$dc->expires_at || now()->lte($dc->expires_at);
                    $validUses = !$dc->max_uses || $dc->used_count < $dc->max_uses;
                    $validCust = !$dc->customer_id || (int) $dc->customer_id === (int) $orderUserId;

                    if ($validExpiry && $validUses && $validCust) {
                        $eligibleTotal = $dc->category_id
                            ? ($categoryTotals[$dc->category_id] ?? 0)
                            : $subtotalSum;

                        if ($eligibleTotal > 0) {
                            $appliedCode = $dc->code;
                            $discountAmount = $dc->type === 'percentage'
                                ? round($eligibleTotal * ($dc->value / 100), 2)
                                : min($dc->value, $eligibleTotal);

                            if ($dc->max_discount_amount) {
                                $discountAmount = min($discountAmount, (float) $dc->max_discount_amount);
                            }

                            $dc->increment('used_count');
                        }
                    }
                }
            }

            $finalTotal = max(0, $subtotalSum - $discountAmount + $adjustment);

            $order->update([
                'discount_code' => $appliedCode,
                'discount_amount' => $discountAmount,
                'adjustment_amount' => $adjustment,
                'total_amount' => $finalTotal,
            ]);

            return response()->json($order->load(['items.product', 'user']), 201);
        });
    }

    public function updateOrder(Request $request, Order $order)
    {
        $isCustomer = $request->user()->role === 'customer';

        if ($isCustomer) {
            if ((int) $order->user_id !== (int) $request->user()->id) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            if ($order->status !== 'pending') {
                return response()->json(['message' => 'Order can only be edited while pending'], 422);
            }
        }

        $request->validate([
            'delivery_type' => 'required|in:pickup,delivery',
            'shipping_address' => 'nullable|string',
            'status' => $isCustomer ? 'nullable' : 'required|in:pending,accepted,completed,rejected',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($request, $order, $isCustomer) {
            foreach ($order->items as $oldItem) {
                $oldItem->product->increment('stock_qty', $oldItem->quantity);
                StockMovement::create([
                    'product_id' => $oldItem->product_id,
                    'user_id' => $request->user()->id,
                    'type' => 'in',
                    'quantity' => $oldItem->quantity,
                    'reference' => "Order Edit Restore #{$order->order_number}",
                ]);
            }
            $order->items()->delete();

            $subtotalSum = 0;
            foreach ($request->items as $item) {
                $product = Product::lockForUpdate()->findOrFail($item['product_id']);
                if ($product->stock_qty < $item['quantity']) {
                    abort(422, "Insufficient stock for {$product->name}");
                }
                $subtotal = $product->sell_price * $item['quantity'];
                $subtotalSum += $subtotal;

                $order->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $product->sell_price,
                    'subtotal' => $subtotal,
                ]);

                $product->decrement('stock_qty', $item['quantity']);
                StockMovement::create([
                    'product_id' => $product->id,
                    'user_id' => $request->user()->id,
                    'type' => 'out',
                    'quantity' => $item['quantity'],
                    'reference' => "Order Edit #{$order->order_number}",
                ]);
            }

            $finalTotal = max(0, $subtotalSum - $order->discount_amount + $order->adjustment_amount);
            $order->update([
                'delivery_type' => $request->delivery_type,
                'shipping_address' => $request->delivery_type === 'delivery' ? $request->shipping_address : null,
                'status' => $isCustomer ? $order->status : $request->status,
                'total_amount' => $finalTotal,
            ]);

            return response()->json($order->load(['items.product', 'user']));
        });
    }

    public function updateStatus(Request $request, Order $order)
    {
        $request->validate(['status' => 'required|in:accepted,rejected,completed']);

        if ($order->status !== 'pending' && $request->status === 'rejected') {
            return response()->json(['message' => 'Only pending orders can be rejected'], 422);
        }

        return DB::transaction(function () use ($request, $order) {
            if ($request->status === 'rejected' && $order->status === 'pending') {
                foreach ($order->items as $item) {
                    $item->product->increment('stock_qty', $item->quantity);
                    StockMovement::create([
                        'product_id' => $item->product_id,
                        'user_id' => $request->user()->id,
                        'type' => 'in',
                        'quantity' => $item->quantity,
                        'reference' => "Rejected Order #{$order->order_number}",
                    ]);
                }
            }

            $order->update(['status' => $request->status]);
            return response()->json($order->load(['items.product', 'user']));
        });
    }
    public function cancel(Request $request, Order $order)
    {
        if ($request->user()->role === 'customer' && (int) $order->user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        if ($order->status === 'completed') {
            return response()->json(['message' => 'Delivered orders cannot be cancelled'], 422);
        }

        if (!in_array($order->status, ['pending', 'accepted'])) {
            return response()->json(['message' => 'Order cannot be cancelled'], 422);
        }

        return DB::transaction(function () use ($request, $order) {
            foreach ($order->items as $item) {
                $item->product->increment('stock_qty', $item->quantity);
                StockMovement::create([
                    'product_id' => $item->product_id,
                    'user_id' => $request->user()->id,
                    'type' => 'in',
                    'quantity' => $item->quantity,
                    'reference' => "Cancelled Order #{$order->order_number}",
                ]);
            }

            $order->update(['status' => 'cancelled']);
            return response()->json($order->load(['items.product', 'user']));
        });
    }

    public function destroy(Request $request, Order $order)
    {
        if ($request->user()->role === 'customer') {
            if ((int) $order->user_id !== (int) $request->user()->id) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            if ($order->status !== 'pending') {
                return response()->json(['message' => 'You can only delete an order before it is accepted'], 422);
            }
        }

        return DB::transaction(function () use ($request, $order) {
            if (in_array($order->status, ['pending', 'accepted'])) {
                foreach ($order->items as $item) {
                    $item->product->increment('stock_qty', $item->quantity);
                    StockMovement::create([
                        'product_id' => $item->product_id,
                        'user_id' => $request->user()->id,
                        'type' => 'in',
                        'quantity' => $item->quantity,
                        'reference' => "Deleted Order #{$order->order_number}",
                    ]);
                }
            }

            $order->delete();
            return response()->json(['message' => 'Order deleted']);
        });
    }
}