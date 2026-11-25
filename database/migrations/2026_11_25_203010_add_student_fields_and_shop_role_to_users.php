<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('grade_class', 50)->nullable()->after('saved_address');
            $table->string('student_id', 50)->nullable()->after('grade_class');
            $table->string('card_number', 50)->nullable()->after('student_id');
        });

        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'seller', 'customer', 'shop') NOT NULL DEFAULT 'customer'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'seller', 'customer') NOT NULL DEFAULT 'customer'");
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['grade_class', 'student_id', 'card_number']);
        });
    }
};