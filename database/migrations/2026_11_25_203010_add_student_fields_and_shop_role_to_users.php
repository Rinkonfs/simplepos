<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'grade_class')) {
                $table->string('grade_class', 50)->nullable()->after('saved_address');
            }
            if (!Schema::hasColumn('users', 'student_id')) {
                $table->string('student_id', 50)->nullable()->after('grade_class');
            }
            if (!Schema::hasColumn('users', 'card_number')) {
                $table->string('card_number', 50)->nullable()->after('student_id');
            }
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'seller', 'customer', 'shop') NOT NULL DEFAULT 'customer'");
        } else {
            // SQLite-safe: convert role column to string so 'shop' is allowed
            Schema::table('users', function (Blueprint $table) {
                $table->string('role', 30)->default('customer')->change();
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'seller', 'customer') NOT NULL DEFAULT 'customer'");
        }

        Schema::table('users', function (Blueprint $table) {
            $cols = array_filter(['grade_class', 'student_id', 'card_number'], fn ($c) => Schema::hasColumn('users', $c));
            if ($cols) {
                $table->dropColumn($cols);
            }
        });
    }
};