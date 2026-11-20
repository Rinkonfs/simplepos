<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(['email' => 'admin@pos.test'], [
            'name' => 'Super Admin',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
            'locale' => 'en',
        ]);

        User::updateOrCreate(['email' => 'seller@pos.test'], [
            'name' => 'Store Seller',
            'password' => Hash::make('password'),
            'role' => 'seller',
            'locale' => 'id',
        ]);

        User::updateOrCreate(['email' => 'customer@pos.test'], [
            'name' => 'Customer User',
            'password' => Hash::make('password'),
            'role' => 'customer',
            'locale' => 'bn',
        ]);
    }
}