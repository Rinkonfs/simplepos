<?php

namespace App\Http\Controllers;

use App\Models\{PurchaseOrder, StockMovement, VendorPayment};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PurchaseOrderController extends Controller
{
    public function index()
    {
        return response()->json(
            PurchaseOrder::with(['vendor', 'items.product:id,sku,name'])->latest()->get()
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'vendor_id' => 'required|exists:vendors,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.cost_price' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($request) {
            $total = 0;
            $po = PurchaseOrder::create([
                'po_number' => 'PO-' . Str::upper(Str::random(6)),
                'vendor_id' => $request->vendor_id,
                'user_id' => $request->user()->id,
                'status' => 'draft',
            ]);

            foreach ($request->items as $item) {
                $sub = $item['quantity'] * $item['cost_price'];
                $total += $sub;
                $po->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'cost_price' => $item['cost_price'],
                    'subtotal' => $sub,
                ]);
            }
            $po->update(['total_amount' => $total]);
            return response()->json($po->load(['vendor', 'items.product']), 201);
        });
    }

    public function updateStatus(Request $request, PurchaseOrder $purchaseOrder)
    {
        $request->validate(['status' => 'required|in:sent,received']);
        return DB::transaction(function () use ($request, $purchaseOrder) {
            if ($request->status === 'received' && $purchaseOrder->status !== 'received') {
                foreach ($purchaseOrder->items as $item) {
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
            $purchaseOrder->update(['status' => $request->status]);
            return response()->json($purchaseOrder->load(['vendor', 'items.product']));
        });
    }

    public function recordPayment(Request $request, PurchaseOrder $purchaseOrder)
    {
        $data = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string',
            'note' => 'nullable|string',
        ]);
        VendorPayment::create([
            'vendor_id' => $purchaseOrder->vendor_id,
            'purchase_order_id' => $purchaseOrder->id,
            'amount' => $data['amount'],
            'payment_method' => $data['payment_method'],
            'note' => $data['note'] ?? "Payment for {$purchaseOrder->po_number}",
        ]);
        $purchaseOrder->increment('paid_amount', $data['amount']);
        return response()->json($purchaseOrder->load(['vendor', 'items.product']));
    }
}