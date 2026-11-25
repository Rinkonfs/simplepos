<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->enum('unit', ['pcs', 'kg', 'liter'])->default('pcs')->after('name');
            $table->decimal('stock_qty', 12, 3)->default(0)->change();
            $table->decimal('low_stock_alert', 12, 3)->default(5)->change();
            $table->decimal('max_purchase_qty', 12, 3)->nullable()->after('low_stock_alert');
            $table->decimal('bulk_min_qty', 12, 3)->nullable()->after('max_purchase_qty');
            $table->decimal('bulk_price', 12, 2)->nullable()->after('bulk_min_qty');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->decimal('quantity', 12, 3)->change();
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->decimal('quantity', 12, 3)->change();
        });

        Schema::table('product_batches', function (Blueprint $table) {
            $table->decimal('stock_qty', 12, 3)->default(0)->change();
        });

        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->decimal('quantity', 12, 3)->change();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['unit', 'max_purchase_qty', 'bulk_min_qty', 'bulk_price']);
        });
    }
};