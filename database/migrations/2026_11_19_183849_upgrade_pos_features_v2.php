<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Sub-categories
        Schema::table('categories', function (Blueprint $table) {
            $table->foreignId('parent_id')->nullable()->after('id')->constrained('categories')->nullOnDelete();
        });

        // 2. Same stock with different prices (batches/tiers)
        Schema::create('product_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('label')->default('Standard'); // e.g. "Batch A", "Wholesale"
            $table->decimal('cost_price', 12, 2);
            $table->decimal('sell_price', 12, 2);
            $table->integer('stock_qty')->default(0);
            $table->timestamps();
        });

        // 3. Advanced Discount Codes (expiry, usage limit, customer, category)
        Schema::table('discount_codes', function (Blueprint $table) {
            $table->dateTime('expires_at')->nullable()->after('is_active');
            $table->integer('max_uses')->nullable()->after('expires_at');
            $table->integer('used_count')->default(0)->after('max_uses');
            $table->foreignId('customer_id')->nullable()->after('used_count')->constrained('users')->nullOnDelete();
            $table->foreignId('category_id')->nullable()->after('customer_id')->constrained('categories')->nullOnDelete();
        });

        // 4. User phone & photo
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 30)->nullable()->after('email');
            $table->string('photo_url')->nullable()->after('saved_address');
        });

        // 5. System Settings (currency, etc.)
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['phone', 'photo_url']));
        Schema::table('discount_codes', function (Blueprint $t) {
            $t->dropConstrainedForeignId('customer_id');
            $t->dropConstrainedForeignId('category_id');
            $t->dropColumn(['expires_at', 'max_uses', 'used_count']);
        });
        Schema::dropIfExists('product_batches');
        Schema::table('categories', fn (Blueprint $t) => $t->dropConstrainedForeignId('parent_id'));
    }
};