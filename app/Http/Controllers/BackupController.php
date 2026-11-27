<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;


class BackupController extends Controller
{
    private array $tables = [
        'settings',
        'categories',
        'vendors',
        'products',
        'product_batches',
        'stock_movements',
        'discount_codes',
        'orders',
        'order_items',
        'purchase_orders',
        'purchase_order_items',
        'vendor_payments',
    ];

    public function exportAll()
    {
        $dump = [
            'exported_at' => now()->toIso8601String(),
            'data' => [],
        ];

        foreach ($this->tables as $table) {
            if (Schema::hasTable($table)) {
                $dump['data'][$table] = DB::table($table)->get();
            }
        }

        return response()->json($dump);
    }

    public function importAll(Request $request)
    {
        $request->validate(['file' => 'required|file']);
        $json = json_decode(file_get_contents($request->file('file')->getRealPath()), true);

        if (!$json || !isset($json['data']) || !is_array($json['data'])) {
            return response()->json(['message' => 'Invalid backup JSON file'], 422);
        }

        Schema::disableForeignKeyConstraints();

        try {
            DB::transaction(function () use ($json) {
                foreach ($this->tables as $table) {
                    if (!Schema::hasTable($table) || !isset($json['data'][$table])) {
                        continue;
                    }

                    DB::table($table)->delete();

                    $rows = $json['data'][$table];
                    if (empty($rows)) {
                        continue;
                    }

                    $columns = Schema::getColumnListing($table);
                    $cleanRows = [];

                    foreach ($rows as $row) {
                        $filtered = array_intersect_key($row, array_flip($columns));
                        foreach (['created_at', 'updated_at', 'expires_at'] as $dateCol) {
                            if (!empty($filtered[$dateCol])) {
                                $filtered[$dateCol] = Carbon::parse($filtered[$dateCol])->format('Y-m-d H:i:s');
                            }
                        }
                        $cleanRows[] = $filtered;
                    }

                    foreach (array_chunk($cleanRows, 200) as $chunk) {
                        DB::table($table)->insert($chunk);
                    }
                }
            });
        } finally {
            Schema::enableForeignKeyConstraints();
        }

        return response()->json(['message' => 'All system data imported successfully!']);
    }

    public function wipeAllDataExceptUsers()
    {
        $dataTables = [
            'vendor_payments',
            'purchase_order_items',
            'purchase_orders',
            'order_items',
            'orders',
            'stock_movements',
            'product_batches',
            'products',
            'discount_codes',
            'vendors',
            'categories',
        ];

        Schema::disableForeignKeyConstraints();
        try {
            foreach ($dataTables as $table) {
                if (Schema::hasTable($table)) {
                    DB::table($table)->delete();
                }
            }
        } finally {
            Schema::enableForeignKeyConstraints();
        }

        return response()->json(['message' => 'All system data deleted safely (users and settings kept)!']);
    }
}