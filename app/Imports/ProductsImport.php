<?php

namespace App\Imports;

use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Vendor;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class ProductsImport implements ToModel, WithHeadingRow
{
    public function model(array $row)
    {
        $sku = trim((string) ($row['sku'] ?? ''));
        if ($sku === '') return null;

        $categoryId = null;
        if (!empty(trim((string) ($row['category'] ?? '')))) {
            $categoryId = Category::firstOrCreate(['name' => trim($row['category'])])->id;
        }

        $vendorId = null;
        if (!empty(trim((string) ($row['vendor'] ?? '')))) {
            $vendorId = Vendor::firstOrCreate(['name' => trim($row['vendor'])])->id;
        }

        $unit = strtolower(trim((string) ($row['unit'] ?? 'pcs')));
        $existing = Product::where('sku', $sku)->first();

        $product = Product::updateOrCreate(
            ['sku' => $sku],
            [
                'category_id' => $categoryId ?? $existing?->category_id,
                'vendor_id' => $vendorId ?? $existing?->vendor_id,
                'name' => trim((string) ($row['name'] ?? ($existing?->name ?? $sku))),
                'unit' => in_array($unit, ['pcs', 'kg', 'liter']) ? $unit : 'pcs',
                'cost_price' => (float) ($row['cost_price'] ?? $existing?->cost_price ?? 0),
                'sell_price' => (float) ($row['sell_price'] ?? $existing?->sell_price ?? 0),
                'low_stock_alert' => (float) ($row['low_stock_alert'] ?? $existing?->low_stock_alert ?? 5),
                'max_purchase_qty' => !empty($row['max_purchase_qty']) ? (float) $row['max_purchase_qty'] : null,
                'bulk_min_qty' => !empty($row['bulk_min_qty']) ? (float) $row['bulk_min_qty'] : null,
                'bulk_price' => !empty($row['bulk_price']) ? (float) $row['bulk_price'] : null,
            ]
        );

        $qty = (float) ($row['stock_qty'] ?? 0);
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