<?php

namespace App\Http\Controllers;

use App\Imports\ProductsImport;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['category:id,name', 'vendor:id,name', 'batches'])
            ->where('is_active', true);

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('sku', 'like', "%{$request->search}%");
            });
        }
        if ($request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'vendor_id' => 'nullable|exists:vendors,id',
            'sku' => 'required|string',
            'name' => 'required|string',
            'unit' => 'nullable|in:pcs,kg,liter',
            'cost_price' => 'required|numeric|min:0',
            'sell_price' => 'required|numeric|min:0',
            'stock_qty' => 'required|numeric|min:0',
            'low_stock_alert' => 'nullable|numeric|min:0',
            'max_purchase_qty' => 'nullable|numeric|min:0.01',
            'bulk_min_qty' => 'nullable|numeric|min:0.01',
            'bulk_price' => 'nullable|numeric|min:0',
            'image' => 'nullable|image|max:2048',
        ]);

        $imageUrl = null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $imageUrl = asset('storage/' . $path);
        }

        $fields = [
            'category_id', 'vendor_id', 'name', 'unit', 'cost_price', 'sell_price',
            'low_stock_alert', 'max_purchase_qty', 'bulk_min_qty', 'bulk_price',
        ];

        $existing = Product::where('sku', trim($request->sku))->first();
        if ($existing) {
            $qtyToAdd = (float) $request->stock_qty;
            $updateData = $request->only($fields);
            if ($imageUrl) {
                $updateData['image_url'] = $imageUrl;
            }
            $existing->update($updateData);

            if ($qtyToAdd > 0) {
                $existing->increment('stock_qty', $qtyToAdd);
                StockMovement::create([
                    'product_id' => $existing->id,
                    'user_id' => $request->user()->id,
                    'type' => 'in',
                    'quantity' => $qtyToAdd,
                    'reference' => 'Stock Restock',
                ]);
            }

            return response()->json($existing->load(['category:id,name', 'vendor:id,name', 'batches']), 200);
        }

        $data = $request->only(array_merge($fields, ['sku', 'stock_qty']));
        $data['sku'] = trim($data['sku']);
        $data['unit'] = $data['unit'] ?? 'pcs';
        if ($imageUrl) {
            $data['image_url'] = $imageUrl;
        }

        $product = Product::create($data);

        if ($product->stock_qty > 0) {
            StockMovement::create([
                'product_id' => $product->id,
                'user_id' => $request->user()->id,
                'type' => 'in',
                'quantity' => $product->stock_qty,
                'reference' => 'Initial Stock',
            ]);
        }

        return response()->json($product->load(['category:id,name', 'vendor:id,name', 'batches']), 201);
    }

    public function update(Request $request, Product $product)
    {
        $data = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'vendor_id' => 'nullable|exists:vendors,id',
            'sku' => 'required|unique:products,sku,' . $product->id,
            'name' => 'required|string',
            'unit' => 'nullable|in:pcs,kg,liter',
            'cost_price' => 'required|numeric|min:0',
            'sell_price' => 'required|numeric|min:0',
            'stock_qty' => 'required|numeric|min:0',
            'low_stock_alert' => 'nullable|numeric|min:0',
            'max_purchase_qty' => 'nullable|numeric|min:0.01',
            'bulk_min_qty' => 'nullable|numeric|min:0.01',
            'bulk_price' => 'nullable|numeric|min:0',
            'image' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products', 'public');
            $data['image_url'] = asset('storage/' . $path);
        }

        $diff = (float) $data['stock_qty'] - (float) $product->stock_qty;
        $product->update($data);

        if ($diff != 0) {
            StockMovement::create([
                'product_id' => $product->id,
                'user_id' => $request->user()->id,
                'type' => $diff > 0 ? 'in' : 'out',
                'quantity' => abs($diff),
                'reference' => 'Stock Adjustment',
            ]);
        }

        return response()->json($product->load(['category:id,name', 'vendor:id,name', 'batches']));
    }

    public function addBatch(Request $request, Product $product)
    {
        $data = $request->validate([
            'label' => 'required|string|max:100',
            'cost_price' => 'required|numeric|min:0',
            'sell_price' => 'required|numeric|min:0',
            'stock_qty' => 'required|numeric|min:0.01',
        ]);

        $product->batches()->create($data);
        $product->increment('stock_qty', $data['stock_qty']);

        StockMovement::create([
            'product_id' => $product->id,
            'user_id' => $request->user()->id,
            'type' => 'in',
            'quantity' => $data['stock_qty'],
            'reference' => "Batch: {$data['label']}",
        ]);

        return response()->json($product->load(['category:id,name', 'vendor:id,name', 'batches']), 201);
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return response()->json(['message' => 'Product deleted']);
    }

    public function bulkUpload(Request $request)
    {
        $request->validate(['file' => 'required|mimes:xlsx,xls,csv,txt']);
        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension());

        if ($ext === 'csv' || $ext === 'txt') {
            $handle = fopen($file->getRealPath(), 'r');
            $rawHeader = fgetcsv($handle);
            if (!$rawHeader) {
                fclose($handle);
                return response()->json(['message' => 'CSV file is empty'], 422);
            }

            // Strip UTF-8 BOM and normalize header names
            $header = array_map(function ($h) {
                $h = preg_replace('/^\xEF\xBB\xBF/', '', $h);
                return strtolower(trim($h));
            }, $rawHeader);

            $count = 0;
            while (($row = fgetcsv($handle)) !== false) {
                if (count($row) === 1 && trim((string) $row[0]) === '') continue;

                // Pad or trim row to match header length
                $row = array_pad(array_slice($row, 0, count($header)), count($header), '');
                $data = array_combine($header, $row);
                if (empty(trim($data['sku'] ?? ''))) continue;

                $categoryId = null;
                if (!empty(trim($data['category'] ?? ''))) {
                    $category = Category::firstOrCreate(['name' => trim($data['category'])]);
                    $categoryId = $category->id;
                }

                $vendorId = null;
                if (!empty(trim($data['vendor'] ?? ''))) {
                    $vendor = Vendor::firstOrCreate(['name' => trim($data['vendor'])]);
                    $vendorId = $vendor->id;
                }

                $unit = strtolower(trim($data['unit'] ?? ''));
                $product = Product::updateOrCreate(
                    ['sku' => trim($data['sku'])],
                    [
                        'category_id' => $categoryId,
                        'vendor_id' => $vendorId,
                        'name' => trim($data['name'] ?? ''),
                        'unit' => in_array($unit, ['pcs', 'kg', 'liter']) ? $unit : 'pcs',
                        'cost_price' => (float) ($data['cost_price'] ?? 0),
                        'sell_price' => (float) ($data['sell_price'] ?? 0),
                       'low_stock_alert' => (float) (($data['low_stock_alert'] ?? '') !== '' ? $data['low_stock_alert'] : 5),
                        'max_purchase_qty' => !empty(trim($data['max_purchase_qty'] ?? '')) ? (float) $data['max_purchase_qty'] : null,
                        'bulk_min_qty' => !empty(trim($data['bulk_min_qty'] ?? '')) ? (float) $data['bulk_min_qty'] : null,
                        'bulk_price' => !empty(trim($data['bulk_price'] ?? '')) ? (float) $data['bulk_price'] : null,
                    ]
                );

                $qty = (float) ($data['stock_qty'] ?? 0);
                if ($qty > 0) {
                    $product->increment('stock_qty', $qty);
                    StockMovement::create([
                        'product_id' => $product->id,
                        'user_id' => $request->user()->id,
                        'type' => 'in',
                        'quantity' => $qty,
                        'reference' => 'Bulk CSV Import',
                    ]);
                }
                $count++;
            }
            fclose($handle);
            return response()->json(['message' => "Bulk CSV imported: {$count} products processed."]);
        }

        if (!class_exists(\Maatwebsite\Excel\Facades\Excel::class)) {
            return response()->json(['message' => 'Please save your file as .csv (or install maatwebsite/excel).'], 422);
        }

        Excel::import(new ProductsImport, $file);
        return response()->json(['message' => 'Bulk Excel imported successfully']);
    }
}