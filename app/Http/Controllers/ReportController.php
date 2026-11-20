<?php

namespace App\Http\Controllers;

use App\Exports\StockReportExport;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockMovement;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ReportController extends Controller
{
    public function dashboard(Request $request)
    {
        $period = $request->get('period', 'daily');

        $movements = StockMovement::with('product:id,name,sku')
            ->when($period === 'daily', fn ($q) => $q->whereDate('created_at', today()))
            ->when($period === 'monthly', fn ($q) => $q->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year))
            ->latest()
            ->get();

        $salesTotal = Order::where('status', '!=', 'rejected')
            ->when($period === 'daily', fn ($q) => $q->whereDate('created_at', today()))
            ->when($period === 'monthly', fn ($q) => $q->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year))
            ->sum('total_amount');

        $lowStock = Product::with('category:id,name')
            ->whereColumn('stock_qty', '<=', 'low_stock_alert')
            ->get();

        return response()->json([
            'sales_total' => $salesTotal,
            'stock_in' => $movements->where('type', 'in')->sum('quantity'),
            'stock_out' => $movements->where('type', 'out')->sum('quantity'),
            'low_stock_count' => $lowStock->count(),
            'low_stock_products' => $lowStock,
            'movements' => $movements,
        ]);
    }

    public function exportExcel(Request $request)
    {
        $period = $request->get('period', 'daily');
        return Excel::download(new StockReportExport($period), "stock-report-{$period}.xlsx");
    }

    public function exportPdf(Request $request)
    {
        $period = $request->get('period', 'daily');
        $movements = StockMovement::with('product')
            ->when($period === 'daily', fn ($q) => $q->whereDate('created_at', today()))
            ->when($period === 'monthly', fn ($q) => $q->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year))
            ->get();

        $pdf = Pdf::loadView('reports.stock_pdf', compact('movements', 'period'));
        return $pdf->download("stock-report-{$period}.pdf");
    }
}