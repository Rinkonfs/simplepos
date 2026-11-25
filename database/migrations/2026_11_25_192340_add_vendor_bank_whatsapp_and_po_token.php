<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->string('whatsapp_number', 30)->nullable()->after('phone');
            $table->text('bank_details')->nullable()->after('address');
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->string('public_token', 64)->nullable()->unique()->after('po_number');
        });

        Schema::table('vendor_payments', function (Blueprint $table) {
            $table->string('reference_number', 100)->nullable()->after('payment_method');
        });
    }

    public function down(): void
    {
        Schema::table('vendor_payments', fn (Blueprint $t) => $t->dropColumn('reference_number'));
        Schema::table('purchase_orders', fn (Blueprint $t) => $t->dropColumn('public_token'));
        Schema::table('vendors', fn (Blueprint $t) => $t->dropColumn(['whatsapp_number', 'bank_details']));
    }
};