<?php
namespace App\Imports;

use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class ProductsImport implements ToModel, WithHeadingRow
{
    public function model(array $row)
    {
        $product = Product::updateOrCreate(
            ['sku' => $row['sku']],
            [
                'name' => $row['name'],
                'cost_price' => $row['cost_price'],
                'sell_price' => $row['sell_price'],
                'low_stock_alert' => $row['low_stock_alert'] ?? 5,
            ]
        );

        $qty = (int) ($row['stock_qty'] ?? 0);
        if ($qty > 0) {
            $product->increment('stock_qty', $qty);
            StockMovement::create([
                'product_id' => $product->id,
                'user_id' => Auth::id(),
                'type' => 'in',
                'quantity' => $qty,
                'reference' => 'Bulk Excel Import',
            ]);
        }

        return $product;
    }
}