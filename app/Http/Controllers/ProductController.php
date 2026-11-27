<?php

namespace App\Http\Controllers;

use App\Imports\ProductsImport;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use App\Models\ProductBatch;
use Illuminate\Support\Facades\Schema;


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
        Schema::disableForeignKeyConstraints();
        $product->batches()->delete();
        $product->movements()->delete();
        $product->delete();
        Schema::enableForeignKeyConstraints();

        return response()->json(['message' => 'Product deleted']);
    }
    public function destroyAll()
    {
        Schema::disableForeignKeyConstraints();
        ProductBatch::query()->delete();
        StockMovement::query()->delete();
        Product::query()->delete();
        Schema::enableForeignKeyConstraints();

        return response()->json(['message' => 'All stock products have been deleted']);
    }

    public function bulkUpload(Request $request)
    {
        $request->validate(['file' => 'required|mimes:xlsx,xls,csv,txt']);
        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension());

        if ($ext === 'csv' || $ext === 'txt') {
            $path = $file->getRealPath();
            $firstLine = fgets(fopen($path, 'r'));
            $delimiter = (substr_count($firstLine, ';') > substr_count($firstLine, ',')) ? ';' : ',';

            $handle = fopen($path, 'r');
            $rawHeader = fgetcsv($handle, 0, $delimiter);
            if (!$rawHeader) {
                fclose($handle);
                return response()->json(['message' => 'CSV file is empty'], 422);
            }

            // Strip UTF-8 BOM, trim, lowercase, and convert spaces to underscores
            $header = array_map(function ($h) {
                $h = preg_replace('/^\xEF\xBB\xBF/', '', $h);
                return str_replace(' ', '_', strtolower(trim($h)));
            }, $rawHeader);

            $num = fn ($val, $default = 0) => is_numeric($clean = preg_replace('/[^0-9.\-]/', '', (string) $val)) ? (float) $clean : $default;

            $count = 0;
            while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
                if (count($row) === 1 && trim((string) $row[0]) === '') continue;

                $row = array_pad(array_slice($row, 0, count($header)), count($header), '');
                $data = array_combine($header, $row);
                $sku = trim($data['sku'] ?? '');
                if ($sku === '') continue;

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
                $qty = $num($data['stock_qty'] ?? 0, 0);

                $existing = Product::where('sku', $sku)->first();
                $payload = [
                    'category_id' => $categoryId ?? $existing?->category_id,
                    'vendor_id' => $vendorId ?? $existing?->vendor_id,
                    'name' => trim($data['name'] ?? '') ?: ($existing?->name ?? $sku),
                    'unit' => in_array($unit, ['pcs', 'kg', 'liter']) ? $unit : ($existing?->unit ?? 'pcs'),
                    'cost_price' => isset($data['cost_price']) && $data['cost_price'] !== '' ? $num($data['cost_price']) : ($existing?->cost_price ?? 0),
                    'sell_price' => isset($data['sell_price']) && $data['sell_price'] !== '' ? $num($data['sell_price']) : ($existing?->sell_price ?? 0),
                    'low_stock_alert' => ($data['low_stock_alert'] ?? '') !== '' ? $num($data['low_stock_alert'], 5) : ($existing?->low_stock_alert ?? 5),
                    'max_purchase_qty' => ($data['max_purchase_qty'] ?? '') !== '' ? $num($data['max_purchase_qty']) : null,
                    'bulk_min_qty' => ($data['bulk_min_qty'] ?? '') !== '' ? $num($data['bulk_min_qty']) : null,
                    'bulk_price' => ($data['bulk_price'] ?? '') !== '' ? $num($data['bulk_price']) : null,
                ];

                $product = Product::updateOrCreate(['sku' => $sku], $payload);

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