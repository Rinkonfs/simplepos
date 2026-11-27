<?php

namespace App\Http\Controllers;

use App\Models\{PurchaseOrder, StockMovement, VendorPayment};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class PurchaseOrderController extends Controller
{
    public function index()
    {
        return response()->json(
            PurchaseOrder::with(['vendor', 'items.product:id,sku,name,unit', 'payments'])
                ->latest()
                ->get()
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'vendor_id' => 'required|exists:vendors,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.cost_price' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($request) {
            $total = 0;
            $po = PurchaseOrder::create([
                'po_number' => 'PO-' . Str::upper(Str::random(6)),
                'public_token' => Str::random(32),
                'vendor_id' => $request->vendor_id,
                'user_id' => $request->user()->id,
                'status' => 'draft',
            ]);

            foreach ($request->items as $item) {
                $sub = round($item['quantity'] * $item['cost_price'], 2);
                $total += $sub;
                $po->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'cost_price' => $item['cost_price'],
                    'subtotal' => $sub,
                ]);
            }

            $po->update(['total_amount' => $total]);
            return response()->json($po->load(['vendor', 'items.product', 'payments']), 201);
        });
    }

    public function update(Request $request, PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status === 'received') {
            return response()->json(['message' => 'Delivered PO cannot be edited'], 422);
        }

        $request->validate([
            'vendor_id' => 'required|exists:vendors,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.cost_price' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($request, $purchaseOrder) {
            $purchaseOrder->items()->delete();
            $total = 0;

            foreach ($request->items as $item) {
                $sub = round($item['quantity'] * $item['cost_price'], 2);
                $total += $sub;
                $purchaseOrder->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'cost_price' => $item['cost_price'],
                    'subtotal' => $sub,
                ]);
            }

            $purchaseOrder->update([
                'vendor_id' => $request->vendor_id,
                'total_amount' => $total,
            ]);

            return response()->json($purchaseOrder->load(['vendor', 'items.product', 'payments']));
        });
    }

    public function publicShow(string $token)
    {
        $po = PurchaseOrder::with([
            'vendor:id,name,phone,whatsapp_number,email,address',
            'items.product:id,sku,name,unit',
        ])
            ->where('public_token', $token)
            ->first();

        if (!$po) {
            return response()->json(['message' => 'Purchase Order not found'], 404);
        }

        if ($po->status === 'received') {
            return response()->json([
                'message' => 'This Purchase Order has already been marked as delivered and is no longer viewable.',
            ], 410);
        }

        return response()->json($po);
    }

    public function updateStatus(Request $request, PurchaseOrder $purchaseOrder)
    {
        $request->validate(['status' => 'required|in:sent,received']);

        return DB::transaction(function () use ($request, $purchaseOrder) {
            if ($request->status === 'received' && $purchaseOrder->status !== 'received') {
                foreach ($purchaseOrder->items as $item) {
                    if ($item->product) {
                        $item->product->increment('stock_qty', $item->quantity);
                        StockMovement::create([
                            'product_id' => $item->product_id,
                            'user_id' => $request->user()->id,
                            'type' => 'in',
                            'quantity' => $item->quantity,
                            'reference' => "PO #{$purchaseOrder->po_number}",
                        ]);
                    }
                }
            }

            $purchaseOrder->update(['status' => $request->status]);
            return response()->json($purchaseOrder->load(['vendor', 'items.product', 'payments']));
        });
    }

    public function recordPayment(Request $request, PurchaseOrder $purchaseOrder)
    {
        $data = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:cash,cheque,bank_transfer,bkash',
            'reference_number' => [
                in_array($request->payment_method, ['bkash', 'bank_transfer']) ? 'required' : 'nullable',
                'string',
                in_array($request->payment_method, ['bkash', 'bank_transfer']) ? 'min:4' : 'min:1',
                'max:100',
            ],
            'note' => 'nullable|string|max:255',
        ]);

        VendorPayment::create([
            'vendor_id' => $purchaseOrder->vendor_id,
            'purchase_order_id' => $purchaseOrder->id,
            'amount' => $data['amount'],
            'payment_method' => $data['payment_method'],
            'reference_number' => $data['reference_number'] ?? null,
            'note' => $data['note'] ?? "Payment ({$data['payment_method']}) for {$purchaseOrder->po_number}",
        ]);

        $purchaseOrder->increment('paid_amount', $data['amount']);
        return response()->json($purchaseOrder->load(['vendor', 'items.product', 'payments']));
    }

    public function destroy(PurchaseOrder $purchaseOrder)
    {
        Schema::disableForeignKeyConstraints();
        $purchaseOrder->payments()->delete();
        $purchaseOrder->items()->delete();
        $purchaseOrder->delete();
        Schema::enableForeignKeyConstraints();

        return response()->json(['message' => 'Purchase Order deleted']);
    }
}