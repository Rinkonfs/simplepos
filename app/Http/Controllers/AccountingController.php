<?php

namespace App\Http\Controllers;

use App\Models\{Order, PurchaseOrder, VendorPayment};
use Illuminate\Http\Request;

class AccountingController extends Controller
{
    public function summary(Request $request)
    {
        $from = $request->get('from');
        $to = $request->get('to');

        $orderQuery = Order::where('status', '!=', 'rejected')
            ->when($from, fn($q) => $q->whereDate('created_at', '>=', $from))
            ->when($to, fn($q) => $q->whereDate('created_at', '<=', $to));

        $posIncome = (clone $orderQuery)->where('channel', 'pos')->sum('total_amount');
        $ecomIncome = (clone $orderQuery)->where('channel', 'ecommerce')->sum('total_amount');
        $totalIncome = $posIncome + $ecomIncome;

        $vendorPaid = VendorPayment::when($from, fn($q) => $q->whereDate('created_at', '>=', $from))
            ->when($to, fn($q) => $q->whereDate('created_at', '<=', $to))
            ->sum('amount');

        $vendorPayable = PurchaseOrder::sum('total_amount') - PurchaseOrder::sum('paid_amount');

        return response()->json([
            'pos_income' => round($posIncome, 2),
            'ecommerce_income' => round($ecomIncome, 2),
            'total_income' => round($totalIncome, 2),
            'vendor_paid' => round($vendorPaid, 2),
            'vendor_payable' => round(max(0, $vendorPayable), 2),
            'net_profit' => round($totalIncome - $vendorPaid, 2),
            'vendor_payments' => VendorPayment::with('vendor:id,name')->latest()->take(25)->get(),
            'recent_orders' => (clone $orderQuery)->with('user:id,name')->latest()->take(25)->get(),
        ]);
    }
}