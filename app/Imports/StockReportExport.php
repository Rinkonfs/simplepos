<?php
namespace App\Exports;

use App\Models\StockMovement;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class StockReportExport implements FromCollection, WithHeadings
{
    public function __construct(protected string $period = 'daily') {}

    public function collection()
    {
        $query = StockMovement::with('product:id,sku,name');

        if ($this->period === 'daily') {
            $query->whereDate('created_at', today());
        } else {
            $query->whereMonth('created_at', now()->month)
                  ->whereYear('created_at', now()->year);
        }

        return $query->get()->map(fn($m) => [
            'Date' => $m->created_at->format('Y-m-d H:i'),
            'SKU' => $m->product->sku,
            'Product' => $m->product->name,
            'Type' => strtoupper($m->type),
            'Quantity' => $m->quantity,
            'Reference' => $m->reference,
        ]);
    }

    public function headings(): array
    {
        return ['Date', 'SKU', 'Product', 'Type', 'Quantity', 'Reference'];
    }
}